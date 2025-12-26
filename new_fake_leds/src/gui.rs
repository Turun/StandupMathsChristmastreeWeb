use crate::{effects::update_effects, state::AppState};
use egui::{Color32, Pos2};
use parking_lot::Mutex;
use std::sync::Arc;

pub struct LedApp {
    state: Arc<Mutex<AppState>>,
}

impl LedApp {
    pub fn new(state: Arc<Mutex<AppState>>) -> Self {
        Self { state }
    }
}

impl eframe::App for LedApp {
    fn update(&mut self, ctx: &egui::Context, _: &mut eframe::Frame) {
        let mut state = self.state.lock();
        update_effects(&mut state);

        egui::CentralPanel::default().show(ctx, |ui| {
            let rect = ui.available_rect_before_wrap();
            let center = rect.center();

            for led in &state.leds {
                let p = Pos2 {
                    x: center.x + led.position.x * 200.0,
                    y: center.y - led.position.y * 200.0,
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

        ctx.request_repaint();
    }
}
