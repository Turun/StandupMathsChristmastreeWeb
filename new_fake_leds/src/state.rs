use egui::{Color32, Context};
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
    pub determined_position: Vec3,
    pub actual_position: Vec3,
}

#[derive(Clone, Copy, PartialEq)]
pub enum Effect {
    None,
    Blink,
    AllOn,
    SweepingPlane,
    SweepingPlaneX,
    SweepingPlaneY,
    SweepingPlaneZ,
}

#[derive(Clone)]
pub struct AppState {
    pub egui_context: Option<Context>,

    pub leds: Vec<Led>,
    pub base_color: Color32,

    pub effect: Effect,
    pub effect_start: Instant,

    // sweeping plane state
    pub sweeping_plane_z: Vec<f32>,
    pub sweeping_plane_hue: f32,

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
                determined_position: Vec3 {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                },
                actual_position: pos,
            });
        }

        Self {
            egui_context: None,
            leds,
            base_color: egui::Color32::from_rgb(150, 150, 150),
            effect: Effect::None,
            effect_start: std::time::Instant::now(),
            sweeping_plane_z: Vec::new(),
            sweeping_plane_hue: 0.0,
            rotation_x: -std::f32::consts::FRAC_PI_2,
            rotation_y: 0.0,
            offset_x: 0.0,
            offset_y: 0.0,
        }
    }
}
