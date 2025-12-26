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

pub struct AppState {
    pub leds: Vec<Led>,
    pub base_color: Color32,

    pub effect: Effect,
    pub effect_start: Instant,
}

impl AppState {
    pub fn new(num: usize) -> Self {
        Self {
            leds: (0..num)
                .map(|_| Led {
                    enabled: false,
                    color: Color32::BLACK,
                    position: Vec3 {
                        x: 0.0,
                        y: 0.0,
                        z: 0.0,
                    },
                })
                .collect(),
            base_color: Color32::from_rgb(50, 50, 50),
            effect: Effect::None,
            effect_start: Instant::now(),
        }
    }
}
