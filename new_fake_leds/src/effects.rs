use std::{f32, time::Instant};

use crate::{
    hsv_to_rgb,
    state::{AppState, Effect},
};
use egui::Color32;

pub fn update_effects(state: &mut AppState) {
    match state.effect {
        Effect::Blink => blink(state),
        Effect::AllOn => {
            for led in &mut state.leds {
                if led.enabled {
                    led.color = state.base_color;
                }
            }
        }
        Effect::SweepingPlane => sweeping_plane(state),
        Effect::None => {}
    }
}

fn blink(state: &mut AppState) {
    let elapsed = state.effect_start.elapsed().as_secs();
    let on = elapsed % 2 == 0;

    for led in &mut state.leds {
        if led.enabled && on {
            led.color = state.base_color;
        } else {
            led.color = Color32::BLACK;
        }
    }
}

fn sweeping_plane(state: &mut AppState) {
    fn reset_sweeping_plane(state: &mut AppState) {
        state.effect_start = Instant::now();

        let theta: f32 = rand::random_range(0.0..f32::consts::TAU);
        let cos_theta = theta.cos();
        let sin_theta = theta.sin();
        let alpha: f32 = rand::random_range(0.0..f32::consts::TAU);
        let cos_alpha = alpha.cos();
        let sin_alpha = alpha.sin();

        state.sweeping_plane_z = Vec::new();

        let mut min_z = f32::INFINITY;

        for led in &state.leds {
            let p = led.determined_position;
            let z = sin_theta * (sin_alpha * p.x + cos_alpha * p.y) + cos_theta * p.z;
            min_z = min_z.min(z);
            state.sweeping_plane_z.push(z);
        }

        // offset so z starts at 0
        for z in &mut state.sweeping_plane_z {
            *z -= min_z;
        }

        // new hue
        state.sweeping_plane_hue = rand::random_range(0.0..360.0);
    }

    let elapsed_ms = state.effect_start.elapsed().as_millis() as f32;

    // color
    let color = hsv_to_rgb(state.sweeping_plane_hue, 0.40, 0.20);

    // initialize z positions on first run
    if state.sweeping_plane_z.len() != state.leds.len() {
        reset_sweeping_plane(state);
    }

    // find max z
    let max_z = &state
        .sweeping_plane_z
        .iter()
        .max_by(|x, y| x.partial_cmp(y).unwrap())
        .unwrap();

    // sweep speed (units per ms)
    let speed = 0.001;
    let plane_z = elapsed_ms * speed;

    for (i, led) in state.leds.iter_mut().enumerate() {
        let z = state.sweeping_plane_z[i];
        if (z - 0.1) < plane_z && plane_z < (z + 0.1) && led.enabled {
            led.color = color;
        } else {
            led.color = Color32::BLACK;
        }
    }

    // reset when finished
    if &&plane_z > max_z {
        reset_sweeping_plane(state);
    }
}
