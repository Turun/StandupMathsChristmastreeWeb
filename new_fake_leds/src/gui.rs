use crate::{effects::update_effects, rotate_point, state::AppState};
use egui::{Color32, Pos2};
use parking_lot::Mutex;
use std::{sync::Arc, time::Duration};

pub struct LedApp {
    state: Arc<Mutex<AppState>>,
    last_drag: Option<egui::Pos2>,
    last_pan: Option<egui::Pos2>,
}

impl LedApp {
    pub fn new(state: Arc<Mutex<AppState>>) -> Self {
        Self {
            state,
            last_drag: None,
            last_pan: None,
        }
    }
}

impl eframe::App for LedApp {
    fn update(&mut self, ctx: &egui::Context, _: &mut eframe::Frame) {
        let mut state = self.state.lock();
        update_effects(&mut state);

        let pointer = ctx.input(|i| i.pointer.clone());

        // --- Rotation with left mouse ---
        if let Some(pos) = pointer.interact_pos() {
            if pointer.primary_down() {
                if let Some(last) = self.last_drag {
                    let delta = pos - last;
                    state.rotation_y += delta.x * 0.01; // yaw
                    state.rotation_x += delta.y * 0.01; // pitch
                    state.rotation_x = state
                        .rotation_x
                        .clamp(-std::f32::consts::FRAC_PI_2, std::f32::consts::FRAC_PI_2);
                }
                self.last_drag = Some(pos);
            } else {
                self.last_drag = None;
            }
        }

        // --- Pan/drag with middle mouse ---
        if let Some(pos) = pointer.interact_pos() {
            if pointer.middle_down() {
                if let Some(last) = self.last_pan {
                    let delta = pos - last;
                    state.offset_x += delta.x;
                    state.offset_y += delta.y;
                }
                self.last_pan = Some(pos);
            } else {
                self.last_pan = None;
            }
        }

        // Draw LEDs
        egui::CentralPanel::default().show(ctx, |ui| {
            let rect = ui.available_rect_before_wrap();
            let center = rect.center();

            for led in &state.leds {
                let rotated = rotate_point(led.position, state.rotation_x, state.rotation_y);
                let p = Pos2 {
                    x: center.x + rotated.x * 200.0 + state.offset_x,
                    y: center.y - rotated.y * 200.0 + state.offset_y,
                };
                ui.painter().circle_filled(
                    p,
                    4.0,
                    if led.enabled {
                        led.color
                    } else {
                        Color32::DARK_GRAY
                    },
                );
            }
        });

        ctx.request_repaint_after(Duration::from_millis(25));
    }
}
