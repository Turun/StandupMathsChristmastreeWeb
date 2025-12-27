mod effects;
mod gui;
mod state;
mod web;

use crate::state::Vec3;
use gui::LedApp;
use parking_lot::Mutex;
use state::AppState;
use std::sync::Arc;
use tracing_subscriber::{fmt, EnvFilter};

/// Generates `num_leds` points in a cone.
/// Base: square from -1..1 in x/y, height z: 0..2.5
pub fn generate_cone_leds(num_leds: usize) -> Vec<Vec3> {
    let mut leds = Vec::with_capacity(num_leds);

    while leds.len() < num_leds {
        let z: f32 = rand::random_range(0.0..2.5);
        let x: f32 = rand::random_range(-1.0..1.0);
        let y: f32 = rand::random_range(-1.0..1.0);

        let radius = (x * x + y * y).sqrt();
        let max_allowed_radius = 1.0 - (z / 2.5);
        if radius < max_allowed_radius {
            leds.push(Vec3 { x, y, z });
        }
    }

    leds
}

pub fn rotate_point(p: Vec3, rot_x: f32, rot_y: f32) -> Vec3 {
    // Rotation around X axis
    let cos_x = rot_x.cos();
    let sin_x = rot_x.sin();
    let y1 = p.y * cos_x - p.z * sin_x;
    let z1 = p.y * sin_x + p.z * cos_x;

    // Rotation around Y axis
    let cos_y = rot_y.cos();
    let sin_y = rot_y.sin();
    let x2 = p.x * cos_y + z1 * sin_y;
    let z2 = -p.x * sin_y + z1 * cos_y;

    Vec3 {
        x: x2,
        y: y1,
        z: z2,
    }
}

fn main() {
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("warn,led_sim=trace"));

    fmt().with_env_filter(filter).init();

    let state = Arc::new(Mutex::new(AppState::new(500)));

    // web server
    {
        let s = state.clone();
        std::thread::spawn(|| {
            tokio::runtime::Runtime::new()
                .unwrap()
                .block_on(web::serve(s));
        });
    }

    // GUI
    let app = LedApp::new(state);
    eframe::run_native(
        "LED Strip Simulator",
        eframe::NativeOptions::default(),
        Box::new(|_| Box::new(app)),
    )
    .unwrap();
}
