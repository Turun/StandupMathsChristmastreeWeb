//given the two 2D position information, merge them into one 3D position information array and return it.
function merge_led_positions(led_positions_raw_x, led_positions_raw_y) {
    //TODO
    let led_positions_raw = []

    return led_positions_raw;
}

// after we have determined the position of the leds in terms of pixels, we need to rescale them so that they are in a 1x1 box
function normalize_led_positions(led_positions_raw, led_positions_normalized){
    let min_x = Number.POSITIVE_INFINITY;
    let min_y = Number.POSITIVE_INFINITY;
    let max_x = Number.NEGATIVE_INFINITY;
    let max_y = Number.NEGATIVE_INFINITY;
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
function transmit_led_positions(led_positions_normalized){
    const data = {};
    for (const i of Array(num_leds).keys()) {
        data[i] = led_positions_normalized[i];
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "set_led_positions", false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));
}


export function merge_and_transmit(led_positions_raw_x, led_positions_raw_y, led_positions_normalized){
    console.log("merge led positions...");
    const led_positions_raw = merge_led_positions(led_positions_raw_x, led_positions_raw_y);
    console.log("normalize led positions...");
    normalize_led_positions(led_positions_raw, led_positions_normalized);
    console.log("transmit led positions...");
    transmit_led_positions(led_positions_normalized);
}
