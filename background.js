// background.js

let mediaRecorder;
let recordedChunks = [];
let screenStream;
let audioStream;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startRecording') {
        startRecording(sendResponse);
        return true; // Will respond asynchronously
    } else if (request.action === 'stopRecording') {
        stopRecording(sendResponse);
        return true;
    }
});

async function startRecording(sendResponse) {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        audioStream = new MediaStream(screenStream.getAudioTracks());

        mediaRecorder = new MediaRecorder(screenStream);

        mediaRecorder.ondataavailable = (event) => {
            recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
            saveFile(videoBlob, 'screen-recording.webm');
            recordedChunks = []; // Reset for the next recording
        };

        mediaRecorder.start();
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error starting recording:', error);
        sendResponse({ success: false, error: error.message });
    }
}

function stopRecording(sendResponse) {
    if (mediaRecorder) {
        mediaRecorder.stop();
        screenStream.getTracks().forEach(track => track.stop());
        sendResponse({ success: true });
    } else {
        sendResponse({ success: false, error: 'No active recording to stop.' });
    }
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
