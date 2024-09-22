// content.js

const sendMessageToBackground = (message) => {
  return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
          resolve(response);
      });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('start_video');
  const stopButton = document.getElementById('stop_video');
  const statusText = document.getElementById('status_text');

  startButton.addEventListener('click', async () => {
      const response = await sendMessageToBackground({ action: 'startRecording' });
      if (response.success) {
          statusText.textContent = "Recording...";
      } else {
          statusText.textContent = `Error: ${response.error}`;
      }
  });

  stopButton.addEventListener('click', async () => {
      const response = await sendMessageToBackground({ action: 'stopRecording' });
      if (response.success) {
          statusText.textContent = "Recording stopped.";
      } else {
          statusText.textContent = `Error: ${response.error}`;
      }
  });
});
