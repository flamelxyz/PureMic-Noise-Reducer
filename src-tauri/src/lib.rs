mod audio;
mod commands;
mod rnnoise;
mod state;

use std::sync::Arc;
use tokio::sync::Mutex;
use state::AppState;
use tauri::Manager;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("noise_cancellation=debug".parse().unwrap()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(Mutex::new(AppState::default())))
        .setup(|app| {
            // Setup Tray Icon
            let active_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray_active.png")).unwrap();
            let _tray = TrayIconBuilder::with_id("main_tray")
                .icon(active_icon)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, button_state, .. } = event {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let visible = window.is_visible().unwrap_or(false);
                                let minimized = window.is_minimized().unwrap_or(false);
                                if visible && !minimized {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        } else if button == MouseButton::Right {
                            tray.app_handle().exit(0);
                        }
                    }
                })
                .build(app)?;

            // Prevent window close, hide instead
            if let Some(window) = app.get_webview_window("main") {
                let w = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let _ = w.hide();
                        api.prevent_close();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::audio::get_microphones,
            commands::audio::get_output_devices,
            commands::audio::get_audio_level,
            commands::audio::detect_virtual_device,
            commands::audio::is_driver_installed,
            commands::audio::install_driver,
            commands::audio::uninstall_driver,
            commands::audio::get_platform,
            commands::audio::get_resource_dir,
            commands::audio::start_pipeline,
            commands::audio::stop_pipeline,
            commands::audio::set_denoise_enabled,
            commands::audio::set_denoise_hard_mode,
            commands::audio::set_eq_enabled,
            commands::audio::get_eq_enabled,
            commands::audio::set_eq_bands,
            commands::audio::get_eq_bands,
            commands::audio::set_input_gain,
            commands::audio::set_output_gain,
            commands::audio::set_microphone,
            commands::audio::set_output_device,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
