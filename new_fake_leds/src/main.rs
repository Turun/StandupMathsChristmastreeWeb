mod effects;
mod gui;
mod state;
mod web;

use gui::LedApp;
use parking_lot::Mutex;
use state::AppState;
use std::sync::Arc;

fn main() {
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
