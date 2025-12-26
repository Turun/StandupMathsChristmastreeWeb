use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use parking_lot::Mutex;
use serde_json::Value;
use std::{net::SocketAddr, sync::Arc};

use crate::state::{AppState, Effect, Vec3};

pub async fn serve(state: Arc<Mutex<AppState>>) {
    // Build the router with all your endpoints
    let app = Router::new()
        .route("/configure_leds", post(configure_leds))
        .route("/set_num_leds", post(set_num_leds))
        .route("/get_num_leds", get(get_num_leds))
        .route("/set_led_positions", post(set_led_positions))
        .route("/get_saved_led_positions", get(get_led_positions))
        .route("/effects/blink", post(start_blink))
        .route("/effects/allon", post(start_allon))
        .route("/effects/stop", post(stop_effects))
        .with_state(state);

    // Bind the TCP listener
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("Web server listening on http://0.0.0.0:8080");

    // Run the server using the new Axum style
    axum::serve(listener, app).await.unwrap();
}

async fn configure_leds(State(state): State<Arc<Mutex<AppState>>>, Json(body): Json<Value>) {
    let mut s = state.lock();
    for (k, v) in body.as_object().unwrap() {
        let idx: usize = k.parse().unwrap();
        s.leds[idx].enabled = v.as_bool().unwrap();
    }
}

async fn set_num_leds(State(state): State<Arc<Mutex<AppState>>>, Json(body): Json<Value>) {
    let n = body["num"].as_u64().unwrap() as usize;
    *state.lock() = AppState::new(n);
}

async fn get_num_leds(State(state): State<Arc<Mutex<AppState>>>) -> Json<Value> {
    Json(serde_json::json!({ "num": state.lock().leds.len() }))
}

async fn set_led_positions(State(state): State<Arc<Mutex<AppState>>>, Json(body): Json<Value>) {
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
}

async fn get_led_positions(State(state): State<Arc<Mutex<AppState>>>) -> Json<Value> {
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

async fn start_blink(State(state): State<Arc<Mutex<AppState>>>) {
    let mut s = state.lock();
    s.effect = Effect::Blink;
    s.effect_start = std::time::Instant::now();
}

async fn start_allon(State(state): State<Arc<Mutex<AppState>>>) {
    let mut s = state.lock();
    s.effect = Effect::AllOn;
}

async fn stop_effects(State(state): State<Arc<Mutex<AppState>>>) {
    let mut s = state.lock();
    s.effect = Effect::None;
}
