const num_leds = 20;



// const cycle_base = 9;
// const num_leds_log_cycle_base = Math.log(num_leds) / Math.log(cycle_base);
// const num_cycles = cycle_base * Math.ceil(num_leds_log_cycle_base);
// // returns true if the led should turn on for this cycle, false if not.
// function is_led_on(led_index, cycle) {
//     let major_cycle = Math.floor(cycle / cycle_base);
//     let minor_cycle = cycle % cycle_base;

//     // shift right, so that the digit to check is the left most if presented in base cycle_base
//     let number = Math.floor(led_index / Math.pow(cycle_base, major_cycle));
//     // check on that right most digit now
//     return number % cycle_base === minor_cycle;
// }


const num_cycles = num_leds;
// returns true if the led should turn on for this cycle, false if not.
function is_led_on(led_index, cycle) {
    // turn on leds one by one.
    return led_index === cycle;
}


// TODO: next up we will have to implement x and y scan and then stitch together the coordinates to get 3D position information.




const led_positions_raw = [];
const led_positions_normalized = [];
let current_led_index = 0;

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
for (const i of Array(num_cycles).keys()) {
    let can = new OffscreenCanvas(100, 100);
    let ctx = can.getContext('2d', { willReadFrequently: true });
    canvases.push(can);
    contexts.push(ctx);
}


// for many led detection cycles we have much more off images than on images.
// Thus we need to weigh them so that unaffected regions of the image come
// out as zero after adding all on and all weighted off images.
function off_weight(led_index) {
    let count_on = 0;
    let count_off = 0;
    for (const cycle of Array(num_cycles).keys()) {
        if (is_led_on(led_index, cycle)) {
            count_on += 1;
        } else {
            count_off += 1;
        }
    }
    return count_on / count_off;
}

function test_is_led_on(max_led_index, max_cycle)  {
    for (let cycle = 0; cycle <= max_cycle; cycle += 1) {
        let out = "";
        for (let led_index = 0; led_index <= max_led_index; led_index += 1) {
            if (is_led_on(led_index, cycle)) {
                out += "x";
            } else {
                out += "_"
            }
        }
        console.log(out);
    }
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
    select.value = current_led_index;
}

function setup_buttons() {
    const visualizeBtn = document.getElementById('visualize-btn');
    const overviewBtn = document.getElementById('overview-btn');
    const prevBtn = document.getElementById('prev-led-btn');
    const nextBtn = document.getElementById('next-led-btn');
    const select = document.getElementById('led-select');

    visualizeBtn.addEventListener('click', () => {
        current_led_index = parseInt(select.value);
        visualize_single_led(current_led_index);
    });

    overviewBtn.addEventListener('click', () => {
        visualize_led_positions(); // show all LEDs
    });

    prevBtn.addEventListener('click', () => {
        current_led_index = (current_led_index - 1 + num_leds) % num_leds;
        select.value = current_led_index;
        visualize_single_led(current_led_index);
    });

    nextBtn.addEventListener('click', () => {
        current_led_index = (current_led_index + 1) % num_leds;
        select.value = current_led_index;
        visualize_single_led(current_led_index);
    });

    // keep dropdown in sync if the user manually changes it
    select.addEventListener('change', () => {
        current_led_index = parseInt(select.value);
    });
}

// visualize all LEDs as red markers with numbers
function visualize_led_positions() {
    const ctx = diff_context;
    ctx.clearRect(0, 0, diff_canvas.width, diff_canvas.height); // clear previous drawings

    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'red';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < led_positions_raw.length; i++) {
        const [x, y] = led_positions_raw[i];
        if (x == null || y == null) continue;

        // draw small red circle
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();

        // draw LED number
        ctx.fillStyle = 'black';
        ctx.fillText(i, x + 6, y - 6);
    }
}

// visualize the lock-in difference image for a single LED
function visualize_single_led(led_index) {
    if (led_index == null || led_index < 0 || led_index >= num_leds) return;

    // recompute lock-in image for that LED
    const image_data_array = new Float32Array(math_canvas.width * math_canvas.height);
    for (const shift of Array(num_cycles).keys()) {
        const ctx = contexts[shift];
        const img = ctx.getImageData(0, 0, math_canvas.width, math_canvas.height);

        if (is_led_on(led_index, shift)) {
            add(image_data_array, img);
        } else {
            let this_off_weight = off_weight(led_index);
            sub(image_data_array, img, this_off_weight);
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
    const [x, y] = led_positions_raw[led_index];
    if (x != null && y != null) {
        const armLength = 10;   // length of each arm
        const gap = 1;          // half of the 3px center gap
        diff_context.strokeStyle = "red";
        diff_context.lineWidth = 1;

        diff_context.beginPath();
        // horizontal left
        diff_context.moveTo(x - armLength, y);
        diff_context.lineTo(x - gap, y);
        // horizontal right
        diff_context.moveTo(x + gap, y);
        diff_context.lineTo(x + armLength, y);
        // vertical top
        diff_context.moveTo(x, y - armLength);
        diff_context.lineTo(x, y - gap);
        // vertical bottom
        diff_context.moveTo(x, y + gap);
        diff_context.lineTo(x, y + armLength);
        diff_context.stroke();
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
    for (const shift of Array(num_cycles).keys()) {
        var data = {};
        for (const led_index of Array(num_leds).keys()) {
            data[led_index] = is_led_on(led_index, shift);
        }
        configure_leds(data);
        contexts[shift].drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
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

// blur all images with adjustable kernel size
function blur_images(half_kernel_size = 4) {
    if (half_kernel_size < 1) half_kernel_size = 1;

    for (const ctx of contexts) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        const src = ctx.getImageData(0, 0, width, height);
        const dst = ctx.createImageData(width, height);

        const srcData = src.data;
        const dstData = dst.data;

        // loop through every pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;

                // average over the kernel neighborhood
                for (let ky = -half_kernel_size; ky <= half_kernel_size; ky++) {
                    for (let kx = -half_kernel_size; kx <= half_kernel_size; kx++) {
                        const px = x + kx;
                        const py = y + ky;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const idx = (py * width + px) * 4;
                            r += srcData[idx];
                            g += srcData[idx + 1];
                            b += srcData[idx + 2];
                            a += srcData[idx + 3];
                            count++;
                        }
                    }
                }

                const i = (y * width + x) * 4;
                dstData[i] = r / count;
                dstData[i + 1] = g / count;
                dstData[i + 2] = b / count;
                dstData[i + 3] = a / count;
            }
        }

        ctx.putImageData(dst, 0, 0);
    }
}

// for every values in base, add the value of the addition image (in the red channel, presumed to be converted to greyscale before)
function add(base, addition) {
    for (let i = 0; i < base.length; i += 1) {
        base[i] += addition.data[i * 4];
    }
}

// for every values in base, subtract the value of the subtraction image (in the red channel, presumed to be converted to greyscale before)
//
// The subtracted image is weighted, to ensure parts of the image that are unaffected by the led come out to approximately 0, not -1000 or something.
function sub(base, subtraction, weight) {
    for (let i = 0; i < base.length; i += 1) {
        base[i] -= subtraction.data[i * 4] * weight;
    }
}

// for every led, add all images where it was turned on and subtract all images where it was turned off
function analyze_lock_in_data() {
    for (const led_index of Array(num_leds).keys()) {
        console.log("analyzing data for LED " + led_index);
        let image_data = new Float32Array(math_canvas.width * math_canvas.height);
        for (const shift of Array(num_cycles).keys()){
            const ctx = contexts[shift];
            const img = ctx.getImageData(0, 0, math_canvas.width, math_canvas.height);

            if (is_led_on(led_index, shift)){
                add(image_data, img);
            } else {
                let this_off_weight = off_weight(led_index);
                sub(image_data, img, this_off_weight);
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
        led_positions_raw[led_index] = [x, y];
    }
    console.log("got the following LED positions in pixel coordinates:");
    console.log(led_positions_raw);
}

// after we have determined the position of the leds in terms of pixels, we need to rescale them so that they are in a 1x1 box
function normalize_led_positions(){
    let min_x = math_canvas.width;
    let min_y = math_canvas.height;
    let max_x = 0;
    let max_y = 0;
    for (const p of led_positions_raw) {
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

    for (const i of Array(num_leds).keys()) {
        const [raw_x, raw_y] = led_positions_raw[i];
        norm_x = (raw_x - min_x) / (max_x - min_x);
        norm_y = (raw_y - min_y) / (max_y - min_y);
        led_positions_normalized[i] = [norm_x, norm_y];
    }
    console.log("normalized pixel positions to the following values");
    console.log(led_positions_normalized);
}

// after we have determined the led positions we can tell the server our results.
// This is required for fast animations, we simply cannot control leds from the
// client device with a few ms of network delay in the way.
function transmit_led_positions(){
    const data = {};
    for (const i of Array(num_leds).keys()) {
        data[i] = led_positions_normalized[i];
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
    console.log("bluring images...");
    blur_images();
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
setup_buttons();

