use egui::Color32;
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Clone, Copy, Serialize, Deserialize)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone)]
pub struct Led {
    pub enabled: bool,
    pub color: Color32,
    pub position: Vec3,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Effect {
    None,
    Blink,
    AllOn,
}

#[derive(Clone)]
pub struct AppState {
    pub leds: Vec<Led>,
    pub base_color: Color32,

    pub effect: Effect,
    pub effect_start: Instant,

    pub rotation_x: f32,
    pub rotation_y: f32,
    pub offset_x: f32,
    pub offset_y: f32,
}

impl AppState {
    pub fn new(num: usize) -> Self {
        let mut leds = Vec::with_capacity(num);
        for pos in super::generate_cone_leds(num) {
            leds.push(super::state::Led {
                enabled: true,
                color: egui::Color32::BLACK,
                position: pos,
            });
        }

        Self {
            leds,
            base_color: egui::Color32::from_rgb(150, 150, 150),
            effect: Effect::None,
            effect_start: std::time::Instant::now(),
            rotation_x: 0.0,
            rotation_y: 0.0,
            offset_x: 0.0,
            offset_y: 0.0,
        }
    }
}
