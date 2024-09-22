document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById('start_video');
    const stopButton = document.getElementById('stop_video');
    const statusText = document.getElementById('status_text');
    const videoPreview = document.getElementById('videoPreview');
    const transcriptionText = document.getElementById('transcription_text');

    let mediaRecorder;
    let audioRecorder;
    let videoChunks = [];
    let audioChunks = [];
    let realTimeTranscript = '';

    // Start recording button click event
    startButton.addEventListener('click', async () => {
        try {
            const { screenStream, audioStream } = await getScreenAndAudioStreams();

            initializeMediaRecorders(screenStream, audioStream);
            setupUIForRecording();

        } catch (error) {
            console.error('Error starting recording:', error);
            statusText.textContent = "Error starting recording: " + error.message;
        }
    });

    // Function to get screen and audio streams
    async function getScreenAndAudioStreams() {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const audioStream = new MediaStream(screenStream.getAudioTracks());
        return { screenStream, audioStream };
    }

    function initializeMediaRecorders(screenStream, audioStream) {
        mediaRecorder = new MediaRecorder(screenStream);
        audioRecorder = new MediaRecorder(audioStream);

        videoPreview.srcObject = screenStream;
        videoPreview.style.display = 'block';
        videoPreview.play();

        mediaRecorder.start();
        audioRecorder.start();
        statusText.textContent = "Recording...";

        mediaRecorder.ondataavailable = (event) => videoChunks.push(event.data);
        audioRecorder.ondataavailable = (event) => processAudioForTranscription(event.data);

        setupStopRecording(screenStream);
    }

    function setupUIForRecording() {
        startButton.disabled = true;
        stopButton.disabled = false;
    }

    function processAudioForTranscription(audioData) {
        const audioBlob = new Blob([audioData], { type: 'audio/webm' });
        transcribeAudio(audioBlob);
    }

    function setupStopRecording(screenStream) {
        stopButton.addEventListener('click', () => {
            mediaRecorder.stop();
            audioRecorder.stop();
            screenStream.getTracks().forEach(track => track.stop());
            stopButton.disabled = true;
            startButton.disabled = false;
        });

        mediaRecorder.onstop = () => saveVideoFile();
        audioRecorder.onstop = () => saveAudioAndTranscriptionFiles();
    }

    function saveVideoFile() {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        saveFile(videoBlob, 'screen-recording.webm');
        statusText.textContent = "Recording stopped. Video saved.";
    }

    function saveAudioAndTranscriptionFiles() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        saveFile(audioBlob, 'audio-recording.webm');
        statusText.textContent += " Audio saved.";
        downloadTranscription(realTimeTranscript);
    }

    function saveFile(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function downloadTranscription(transcript) {
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'transcription.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Real-time transcription using AssemblyAI API
    async function transcribeAudio(blob) {
        const apiKey = '8a4a1a858d734f3b8ee640c088cea499'; // Replace with your API key
        const formData = new FormData();
        formData.append('file', blob, 'realtime-audio.webm');

        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: { 'authorization': apiKey },
            body: formData
        });

        const audioFile = await uploadResponse.json();
        if (audioFile.upload_url) {
            const transcription = await requestTranscription(audioFile.upload_url, apiKey);
            realTimeTranscript += transcription.text + '\n';
            transcriptionText.textContent = realTimeTranscript;
            downloadTranscription(realTimeTranscript);
        }
    }

    async function requestTranscription(audioUrl, apiKey) {
        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: { 'authorization': apiKey, 'content-type': 'application/json' },
            body: JSON.stringify({ audio_url: audioUrl })
        });
        const transcriptData = await transcriptResponse.json();
        return checkTranscriptionStatus(transcriptData.id, apiKey);
    }

    async function checkTranscriptionStatus(transcriptionId, apiKey) {
        let status = 'processing';
        let transcript = '';

        while (status === 'processing') {
            const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
                method: 'GET',
                headers: { 'authorization': apiKey }
            });

            const transcriptionResult = await response.json();
            status = transcriptionResult.status;

            if (status === 'completed') {
                transcript = transcriptionResult.text;
            }
        }
        return { text: transcript };
    }
});
