
// Select HTML elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture-btn');
const startButton = document.getElementById('start-btn');
const context = canvas.getContext('2d');

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
function capturePhoto() {
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
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
captureButton.addEventListener('click', capturePhoto);
startButton.addEventListener('click', startBackgroundThread);

const eventSource = new EventSource("/events");
eventSource.onmessage = gotMessage;
