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

// populate the LED dropdown after analyzing
function populate_led_select() {
    const select = document.getElementById('led-select');
    select.innerHTML = '';
    for (let i = 0; i < num_leds; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = 'LED ' + i;
        select.appendChild(option);
    }
}


// visualize all LEDs as red markers with numbers
function visualize_led_positions() {
    const ctx = diff_context;
    ctx.clearRect(0, 0, diff_canvas.width, diff_canvas.height); // clear previous drawings

    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'black';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < led_positions.length; i++) {
        const [x, y] = led_positions[i];
        if (x == null || y == null) continue;

        // draw small red circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // draw LED number
        ctx.fillStyle = 'white';
        ctx.fillText(i, x + 6, y - 6);
        ctx.fillStyle = 'red'; // reset
    }
}

// visualize the lock-in difference image for a single LED
function visualize_single_led(led_index) {
    if (led_index == null || led_index < 0 || led_index >= num_leds) return;

    // recompute lock-in image for that LED
    const image_data_array = new Float32Array(math_canvas.width * math_canvas.height);
    for (const shift of Array(num_leds_log2).keys()) {
        const ctx1 = contexts[shift * 2];
        const img1 = ctx1.getImageData(0, 0, math_canvas.width, math_canvas.height);
        const ctx2 = contexts[shift * 2 + 1];
        const img2 = ctx2.getImageData(0, 0, math_canvas.width, math_canvas.height);

        if (led_index & (1 << shift)) {
            add_sub(image_data_array, img1, img2);
        } else {
            add_sub(image_data_array, img2, img1);
        }
    }

    // normalize image array
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < image_data_array.length; i++) {
        if (image_data_array[i] < minVal) minVal = image_data_array[i];
        if (image_data_array[i] > maxVal) maxVal = image_data_array[i];
    }
    const range = maxVal - minVal || 1; // avoid division by zero

    // draw to diff_canvas
    const canvas_image = diff_context.createImageData(math_canvas.width, math_canvas.height);
    for (let i = 0; i < image_data_array.length; i++) {
        const normalized = ((image_data_array[i] - minVal) / range) * 255;
        canvas_image.data[4 * i] = normalized;
        canvas_image.data[4 * i + 1] = normalized;
        canvas_image.data[4 * i + 2] = normalized;
        canvas_image.data[4 * i + 3] = 255; // fully opaque
    }
    diff_context.putImageData(canvas_image, 0, 0);

    // overlay red marker for the LED position
    const [x, y] = led_positions[led_index];
    if (x != null && y != null) {
        diff_context.fillStyle = 'red';
        diff_context.beginPath();
        diff_context.arc(x, y, 5, 0, 2 * Math.PI);
        diff_context.fill();

        diff_context.fillStyle = 'white';
        diff_context.font = '12px sans-serif';
        diff_context.fillText(led_index, x + 6, y - 6);
    }
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
function capture_lock_in_data(){
    for (const shift of Array(num_leds_log2).keys()) {
        var data = {};
        for (const led_index of Array(num_leds).keys()) {
            data[led_index] = Boolean(led_index & 1 << shift);
        }
        configure_leds(data);
        contexts[shift * 2].drawImage(video, 0, 0, video.videoWidth, video.videoHeight);


        var data = {};
        for (const led_index of Array(num_leds).keys()) {
            data[led_index] = !Boolean(led_index & 1 << shift);
        }
        configure_leds(data);
        contexts[shift * 2 + 1].drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    }
}

// convert all images to greyscale
function convert_to_greyscale(){
    for (const ctx of contexts) {
        let image_data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (let i = 0; i < image_data.data.length; i += 4) {
            let r = image_data.data[i];
            let g = image_data.data[i+1];
            let b = image_data.data[i+2];
            let _a = image_data.data[i+3];
            let brightness = Math.sqrt(0.241 * r * r + 0.691 * g * g  + 0.068 * b * b);  // weighted sum of color values
            image_data.data[i] = brightness;
            image_data.data[i+1] = brightness;
            image_data.data[i+2] = brightness;
        }
        ctx.putImageData(image_data, 0, 0);
    }
}


// for every pixel in base, addition and subtraction, perform the calculation:
// base = base + addition - subtraction
function add_sub(base, addition, subtraction) {
    for (let i = 0; i < base.length; i += 1) {
        base[i] += addition.data[i * 4];
        base[i] -= subtraction.data[i * 4];
    }
}

// for every led, add all images where it was turned on and subtract all images where it was turned off
function analyze_lock_in_data() {
    for (const led_index of Array(num_leds).keys()) {
        console.log("analyzing data for LED " + led_index);
        let image_data = new Float32Array(math_canvas.width * math_canvas.height);
        for (const shift of Array(num_leds_log2).keys()){
            const ctx1 = contexts[shift * 2];
            const img1 = ctx1.getImageData(0, 0, math_canvas.width, math_canvas.height);
            const ctx2 = contexts[shift * 2 + 1];
            const img2 = ctx2.getImageData(0, 0, math_canvas.width, math_canvas.height);

            if (led_index & 1 << shift){  // led was on in 1, off in 2
                add_sub(image_data, img1, img2);
            } else {  // led was off in 1, on in 2
                add_sub(image_data, img2, img1);
            }
        }

        // show the result
        const image_data_diff_canvas = diff_context.getImageData(0, 0, math_canvas.width, math_canvas.height);
        for (let i = 0; i < image_data.length; i += 1) {
            image_data_diff_canvas[4 * i] = image_data[i];
            image_data_diff_canvas[4 * i + 1] = image_data[i];
            image_data_diff_canvas[4 * i + 2] = image_data[i];
            image_data_diff_canvas[4 * i + 3] = 255;
        }
        diff_context.putImageData(image_data_diff_canvas, 0, 0);

        // now we have done the lock in amplification. The brightes pixel should now be the location of the LED.
        // (smarter detection algs may be possible)
        let max_brightness = 0;
        let x = 0;
        let y = 0;
        for (let i = 0; i < image_data.length; i += 1) {
            let brightness = image_data[i];
            if (brightness > max_brightness) {
                max_brightness = brightness;
                x = i % math_canvas.width;
                y = Math.floor(i / math_canvas.width);
            }
        }
        led_positions[led_index] = [x, y];
    }
    console.log("got the following LED positions in pixel coordinates:");
    console.log(led_positions);
}


// after we have determined the position of the leds in terms of pixels, we need to rescale them so that they are in a 1x1 box
function normalize_led_positions(){
    let min_x = math_canvas.width;
    let min_y = math_canvas.height;
    let max_x = 0;
    let max_y = 0;
    for (const p of led_positions) {
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

    for (const p of led_positions) {
        p[0] = (p[0] - min_x) / (max_x - min_x);
        p[1] = (p[1] - min_y) / (max_y - min_y);
    }
    console.log("normalized pixel positions to the following values");
    console.log(led_positions);
}

// after we have determined the led positions we can tell the server our results.
// This is required for fast animations, we simply cannot control leds from the
// client device with a few ms of network delay in the way.
function transmit_led_positions(){
    const data = {}
    for (const i of Array(num_leds).keys()) {
        data[i] = led_positions[i]
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "set_led_positions", false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
}

function start(){
    console.log("starting...");
    console.log("generating lock in data...");
    capture_lock_in_data();
    console.log("converting images to greyscale...");
    convert_to_greyscale();
    console.log("analyzing lock in data...");
    analyze_lock_in_data();
    console.log("visualizing LED positions...");
    visualize_led_positions();
    console.log("normalize led positions...");
    normalize_led_positions();
    console.log("transmit led positions...");
    transmit_led_positions();
    console.log("done!!");
}

window.addEventListener('load', startCamera);
startButton.addEventListener('click',start);

populate_led_select();
const visualizeButton = document.getElementById('visualize-btn');
visualizeButton.addEventListener('click', () => {
    const select = document.getElementById('led-select');
    const ledIndex = parseInt(select.value);
    visualize_single_led(ledIndex);
});

