use crate::state::{AppState, Effect};
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
