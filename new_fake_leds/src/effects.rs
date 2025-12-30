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
        Effect::SweepingPlaneX | Effect::SweepingPlaneY | Effect::SweepingPlaneZ => {
            sweeping_plane_xyz(state)
        }
        Effect::ConcentricColor => concentric_color(state),
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
    let color = hsv_to_rgb(state.sweeping_plane_hue, 1.00, 0.30);

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

fn sweeping_plane_xyz(state: &mut AppState) {
    fn reset_sweeping_plane_xyz(state: &mut AppState) {
        state.effect_start = Instant::now();
        state.sweeping_plane_z = Vec::new();

        let mut min_z = f32::INFINITY;

        for led in &state.leds {
            let p = led.determined_position;
            let z = match state.effect {
                Effect::SweepingPlaneX => p.x,
                Effect::SweepingPlaneY => p.y,
                Effect::SweepingPlaneZ => p.z,
                _ => {
                    unreachable!()
                }
            };
            min_z = min_z.min(z);
            state.sweeping_plane_z.push(z);
        }

        // offset so z starts at 0
        for z in &mut state.sweeping_plane_z {
            *z -= min_z;
        }
    }

    let elapsed_ms = state.effect_start.elapsed().as_millis() as f32;

    // initialize z positions on first run
    if state.sweeping_plane_z.len() != state.leds.len() {
        reset_sweeping_plane_xyz(state);
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
            led.color = state.base_color;
        } else {
            led.color = Color32::BLACK;
        }
    }

    // reset when finished
    if &&plane_z > max_z {
        reset_sweeping_plane_xyz(state);
    }
}

fn concentric_color(state: &mut AppState) {
    let elapsed_ms = state.effect_start.elapsed().as_millis() as f32;

    let sum_z: f32 = state.leds.iter().map(|l| l.determined_position.z).sum();
    let count = state.leds.iter().filter(|l| l.enabled).count();
    let center_z: f32 = sum_z / count as f32;

    // calculate color
    let color = hsv_to_rgb(state.concentric_color_hue, 1.0, 0.30);

    let speed_in_units_per_ms = 0.001;

    let radius_reached = elapsed_ms * speed_in_units_per_ms;
    let radius_reached_squared = radius_reached * radius_reached;
    let mut max_radius_squared = 0.0;

    for led in &mut state.leds {
        if !led.enabled {
            continue;
        }
        let this_radius_squared = led.determined_position.x.powi(2)
            + led.determined_position.y.powi(2)
            + (led.determined_position.z - center_z).powi(2);
        if this_radius_squared < radius_reached_squared {
            led.color = color;
        }
        if this_radius_squared > max_radius_squared {
            max_radius_squared = this_radius_squared;
        }
    }

    // if this color covers all, reset with new color
    if radius_reached > max_radius_squared {
        state.concentric_color_hue = rand::random_range(0.0..360.0);
        state.effect_start = Instant::now();
    }
}
