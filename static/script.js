const num_leds = 100;
const num_leds_log2 = Math.ceil(Math.log2(num_leds));
const led_positions = [];

// Select HTML elements
const video = document.getElementById('video');
const startButton = document.getElementById('start-btn');
const diff_canvas = document.getElementById("canvas-diff");
const diff_context = diff_canvas.getContext("2d", { willReadFrequently: true });

// for saving intermediate results
const math_canvas = new OffscreenCanvas(100, 100);  // actual size will be set once we have a video feed
const math_ctx = math_canvas.getContext('2d', { willReadFrequently: true });

// get the list of all canvases which we will need to do math.
const canvases = [];
const contexts = [];
for (const i of Array(num_leds_log2).keys()) {
    let can = new OffscreenCanvas(100, 100);
    let ctx = can.getContext('2d', { willReadFrequently: true });
    canvases.push(can);
    contexts.push(ctx);

    can = new OffscreenCanvas(100, 100);
    ctx = can.getContext('2d', { willReadFrequently: true });
    canvases.push(can);
    contexts.push(ctx);
}

// Function to start the camera
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;

            // Wait until metadata (including dimensions) is available
            video.addEventListener('loadedmetadata', () => {
                // also make the canvases the right size
                diff_canvas.width = video.videoWidth;
                diff_canvas.height = video.videoHeight;
                math_canvas.width = video.videoWidth;
                math_canvas.height = video.videoHeight;

                for (const canvas of canvases) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }

                console.log("Set sizes to " + video.videoWidth + "×" + video.videoHeight);
            });
        })
        .catch((error) => {
            console.error("Error accessing the camera: ", error);
            alert("Could not access the camera. Please allow permissions and try again.");
        });
}

// tells the server which leds to light up for configuration.
// argument is a dictionary of <led_index>: <bool on> values.
// blocks.
function configure_leds(dict) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "configure_leds", false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(dict));
}

// main code block, tell the pi what to do, take a picture and then move on.
function generate_lock_in_data(){
    for (const shift of Array(num_leds_log2).keys()) {
        var data = {};
        for (const led_index of Array(num_leds).keys()) {
            data[led_index] = Boolean(led_index & 1 << shift);
        }
        configure_leds(data);
        contexts[shift * 2].drawImage(video, 0, 0, video.width, video.height);


        var data = {};
        for (const led_index of Array(num_leds).keys()) {
            data[led_index] = !Boolean(led_index & 1 << shift);
        }
        configure_leds(data);
        contexts[shift * 2 + 1].drawImage(video, 0, 0, video.width, video.height);
    }
}


// for every pixel in base, addition and subtraction, perform the calculation:
// base = base + addition - subtraction
function add_sub(base, addition, subtraction) {
    for (let i = 0; i < base.data.length; i += 1) {
        base.data[i] += addition.data[i];
        base.data[i] -= subtraction.data[i];
    }
}

// for every led, add all images where it was turned on and subtract all images where it was turned off
function analyze_lock_in_data() {
    for (const led_index of Array(num_leds).keys()) {
        console.log("analyzing data for LED " + led_index);
        const zeros = new Float16Array(4 * math_canvas.width * math_canvas.height);
        const image_data = new ImageData(zeros, math_canvas.width, math_canvas.height, {pixelFormat: "rgba-float16"});
        for (const shift of Array(num_leds_log2).keys()){
            const ctx1 = contexts[shift * 2];
            const img1 = ctx1.getImageData(0, 0, math_canvas.width, math_canvas.height);
            const ctx2 = contexts[shift * 2 + 1];
            const img2 = ctx2.getImageData(0, 0, math_canvas.width, math_canvas.height);

            if (led_index & 1 << shift){  // led was on in 1, off in 2
                add_sub(image_data, img1, img2);
            } else {
                add_sub(image_data, img2, img1);
            }
        }

        // show the result
        const image_data_diff_canvas = diff_context.getImageData(0, 0, math_canvas.width, math_canvas.height);
        for (let i = 0; i < image_data.data.length; i += 4) {
            image_data_diff_canvas[i] = image_data[i];
            image_data_diff_canvas[i + 1] = image_data[i + 1];
            image_data_diff_canvas[i + 2] = image_data[i + 2];
        }
        // diff_context.putImageData(image_data, 0, 0);
        diff_context.putImageData(image_data_diff_canvas, 0, 0);

    
        // now we have done the lock in amplification. The brightes pixel should now be the location of the LED.
        // (smarter detection algs may be possible)
        let max_brightness = 0;
        let x = 0;
        let y = 0;
        for (let i = 0; i < image_data.data.length; i += 4) {
            let r = image_data.data[i];
            let g = image_data.data[i+1];
            let b = image_data.data[i+2];
            let _a = image_data.data[i+3];
            let brightness = Math.sqrt(0.241 * r * r + 0.691 * g * g  + 0.068 * b * b);  // weighted sum of color values
            if (brightness > max_brightness) {
                max_brightness = brightness;
                x = Math.floor(i / 4) % image_data.width;
                y = Math.floor(Math.floor(i / 4) / image_data.width);
            }
        }

        led_positions[led_index] = [x, y];
    }
}


// after we have determined the position of the leds in terms of pixels, we need to rescale them so that they are in a 1x1 box
function normalize_led_positions(){
    let min_x = math_canvas.width;
    let min_y = math_canvas.height;
    let max_x = 0;
    let max_y = 0;
    console.log(led_positions);
    for (const p of led_positions) {
    console.log(min_x);
    console.log(min_y);
    console.log(max_x);
    console.log(max_y);
        if (p[0] < min_x){
            min_x = p[0];
        }
        if (p[0] > max_x){
            max_x = p[0];
        }
        if (p[1] < min_y){
            min_y = p[1];
        }
        if (p[1] > max_y){
            max_y = p[1];
        }
    }

    console.log(min_x);
    console.log(min_y);
    console.log(max_x);
    console.log(max_y);

    for (const p of led_positions) {
        p[0] = (p[0] - min_x) / (max_x - min_x);
        p[1] = (p[1] - min_y) / (max_y - min_y);
    }

    console.log(led_positions);
}

// after we have determined the led positions we can tell the server our results.
// This is required for fast animations, we simply cannot control leds from the
// client device with a few ms of network delay in the way.
function transmit_led_positions(){
    data = {}
    for (const i in Array(num_leds).keys()) {
        data[i] = led_positions[i]
    }
    console.log(data)
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "set_led_positions", false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
}

function start(){
            // also make the canvases the right size
            diff_canvas.width = video.videoWidth;
            diff_canvas.height = video.videoHeight;
            math_canvas.width = video.videoWidth;
            math_canvas.height = video.videoHeight;
            for (const canvas of canvases) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
    console.log("starting...");
    console.log("generating lock in data...");
    generate_lock_in_data();
    console.log("analyzing lock in data...");
    analyze_lock_in_data();
    console.log("normalize led positions...");
    normalize_led_positions();
    console.log("transmit led positions...");
    transmit_led_positions();
    console.log("done!!");
}

window.addEventListener('load', startCamera);
startButton.addEventListener('click',start);

