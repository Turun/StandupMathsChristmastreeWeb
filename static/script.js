
// Select HTML elements
const video = document.getElementById('video');
const canvasCap1 = document.getElementById('canvas-cap1');
const canvasCap2 = document.getElementById('canvas-cap2');
const canvasDiff = document.getElementById('canvas-diff');
const captureButton1 = document.getElementById('capture-btn1');
const captureButton2 = document.getElementById('capture-btn2');
const startButton = document.getElementById('start-btn');

// Function to start the camera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((error) => {
            console.error("Error accessing the camera: ", error);
            alert("Could not access the camera. Please allow permissions and try again.");
        });
}

// Function to capture a photo
function capturePhoto1() {
    // Set canvas dimensions to match video
    canvasCap1.width = video.videoWidth;
    canvasCap1.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    canvasCap1.getContext("2d").drawImage(video, 0, 0, canvasCap1.width, canvasCap1.height);

    showDifference();
}

function capturePhoto2() {
    // Set canvas dimensions to match video
    canvasCap2.width = video.videoWidth;
    canvasCap2.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    canvasCap2.getContext("2d").drawImage(video, 0, 0, canvasCap2.width, canvasCap2.height);

    canvasDiff.width = video.videoWidth;
    canvasDiff.height = video.videoHeight;
    canvasDiff.getContext("2d").drawImage(video, 0, 0, canvasDiff.width, canvasDiff.height);

    showDifference();
}

function showDifference() {
    const img1 = canvasCap1.getContext("2d").getImageData(0, 0, canvasCap1.width, canvasCap2.height);
    const img2 = canvasCap2.getContext("2d").getImageData(0, 0, canvasCap2.width, canvasCap2.height);
    
    const diff = canvasDiff.getContext("2d").createImageData(img1.width, img1.height);
    for (let i = 0; i < img1.data.length; i += 4) {
      const r = Math.abs(img1.data[i] - img2.data[i]);
      const g = Math.abs(img1.data[i + 1] - img2.data[i + 1]);
      const b = Math.abs(img1.data[i + 2] - img2.data[i + 2]);
      // You can adjust contrast/sensitivity here
      const val = (r + g + b) / 3;
      diff.data[i] = val;
      diff.data[i + 1] = val;
      diff.data[i + 2] = val;
      diff.data[i + 3] = 255; // opaque
    }
    canvasDiff.getContext("2d").putImageData(diff, 0, 0);
}

function startBackgroundThread() {
    console.log("starting bg thread");
    fetch("/start");
    console.log("started bg thread");
}

function gotMessage(e) {
    console.log("got message:");
    console.log(e.data);
}

// Start the camera automatically when the page loads
window.addEventListener('load', startCamera);

// Capture photo when button is clicked
captureButton1.addEventListener('click', capturePhoto1);
captureButton2.addEventListener('click', capturePhoto2);
startButton.addEventListener('click', startBackgroundThread);

const eventSource = new EventSource("/events");
eventSource.onmessage = gotMessage;
