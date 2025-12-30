use crate::state::{AppState, Effect, Vec3};
use axum::{
    extract::State,
    http::{header, Response, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use egui::Color32;
use parking_lot::Mutex;
use serde_json::Value;
use std::{fs, sync::Arc, thread, time::Duration};
use tracing::debug;

fn file_response(path: &str, mime: &str) -> Response<axum::body::Body> {
    let contents = fs::read_to_string(path).unwrap_or_else(|_| String::new());
    ([(header::CONTENT_TYPE, mime)], contents).into_response()
}

pub async fn serve(state: Arc<Mutex<AppState>>) {
    let app = Router::new()
        // API routes
        .route("/configure_leds", post(configure_leds))
        .route("/set_num_leds", post(set_num_leds))
        .route("/get_num_leds", get(get_num_leds))
        .route("/set_led_positions", post(set_led_positions))
        .route("/get_saved_led_positions", get(get_led_positions))
        .route("/effects/basecolor", post(set_basecolor))
        .route("/effects/blink", post(start_blink))
        .route("/effects/allon", post(start_allon))
        .route("/effects/stop", post(stop_effects))
        // HTML
        .route(
            "/",
            get(|| async { file_response("../templates/index.html", "text/html") }),
        )
        // CSS
        .route(
            "/static/style.css",
            get(|| async { file_response("../static/style.css", "text/css") }),
        )
        // JS
        .route(
            "/static/script/main.js",
            get(|| async { file_response("../static/script/main.js", "application/javascript") }),
        )
        .route(
            "/static/script/ui.js",
            get(|| async { file_response("../static/script/ui.js", "application/javascript") }),
        )
        .route(
            "/static/script/merge_directions.js",
            get(|| async {
                file_response(
                    "../static/script/merge_directions.js",
                    "application/javascript",
                )
            }),
        )
        .route(
            "/static/script/capture_unidirectional.js",
            get(|| async {
                file_response(
                    "../static/script/capture_unidirectional.js",
                    "application/javascript",
                )
            }),
        )
        .route(
            "/static/script/effects.js",
            get(|| async {
                file_response("../static/script/effects.js", "application/javascript")
            }),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .expect("Failed to bind to port 8080");

    println!("Web server listening on http://0.0.0.0:8080");

    axum::serve(listener, app).await.unwrap();
}

async fn configure_leds(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    debug!("configure_leds {body:?}");
    let mut s = state.lock();
    for led in s.leds.iter_mut() {
        led.color = Color32::from_rgb(0, 0, 0);
    }
    for (k, v) in body.as_object().unwrap() {
        let idx: usize = k.parse().unwrap();
        let val = v.as_bool().unwrap();
        if val {
            s.leds[idx].color = s.base_color;
        } // if val is false, turn the LED off, but that has already happened
    }
    // TODO: wait until screen refreshed
    thread::sleep(Duration::from_millis(100));
    return (StatusCode::OK, "success");
}

async fn set_num_leds(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    debug!("set_num_leds {body:?}");
    let n = body["num"].as_u64().unwrap() as usize;
    *state.lock() = AppState::new(n);
    return (StatusCode::OK, "success");
}

async fn get_num_leds(State(state): State<Arc<Mutex<AppState>>>) -> Json<Value> {
    debug!("get_num_leds");
    Json(serde_json::json!({ "num": state.lock().leds.len() }))
}

async fn set_led_positions(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    debug!("set_led_positions {body:?}");
    let mut s = state.lock();
    for (k, v) in body.as_object().unwrap() {
        let idx: usize = k.parse().unwrap();
        let arr = v.as_array().unwrap();
        s.leds[idx].position = Vec3 {
            x: arr[0].as_f64().unwrap() as f32,
            y: arr[1].as_f64().unwrap() as f32,
            z: arr[2].as_f64().unwrap() as f32,
        };
    }
    return (StatusCode::OK, "LED positions successfully saved");
}

async fn get_led_positions(State(state): State<Arc<Mutex<AppState>>>) -> Json<Value> {
    debug!("get_led_positions");
    let s = state.lock();
    let mut obj = serde_json::Map::new();
    for (i, led) in s.leds.iter().enumerate() {
        obj.insert(
            i.to_string(),
            serde_json::json!([led.position.x, led.position.y, led.position.z]),
        );
    }
    Json(Value::Object(obj))
}

async fn set_basecolor(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<Value>,
) -> impl IntoResponse {
    debug!("set_basecolor {body:?}");
    let dict = body.as_object().unwrap();
    let r = dict["r"].as_u64().unwrap() as u8;
    let g = dict["g"].as_u64().unwrap() as u8;
    let b = dict["b"].as_u64().unwrap() as u8;
    let mut s = state.lock();
    s.base_color = Color32::from_rgb(r, g, b);
    return (StatusCode::OK, "color updated");
}

async fn start_blink(State(state): State<Arc<Mutex<AppState>>>) -> impl IntoResponse {
    debug!("start_blink");
    let mut s = state.lock();
    s.effect = Effect::Blink;
    s.effect_start = std::time::Instant::now();
    return (StatusCode::OK, "blink effect started");
}

async fn start_allon(State(state): State<Arc<Mutex<AppState>>>) -> impl IntoResponse {
    debug!("start_allon");
    let mut s = state.lock();
    s.effect = Effect::AllOn;
    return (StatusCode::OK, "all on effect started");
}

async fn stop_effects(State(state): State<Arc<Mutex<AppState>>>) -> impl IntoResponse {
    debug!("stop_effects");
    let mut s = state.lock();
    s.effect = Effect::None;
    for led in s.leds.iter_mut() {
        led.color = Color32::from_rgb(0, 0, 0);
    }
    return (StatusCode::OK, "effects stopped");
}
