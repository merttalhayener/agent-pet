// THROWAWAY SPIKE. Probes the platform features the Swift helper relies on:
// a transparent always-on-top panel, tray/menu bar entry, global shortcut,
// single-instance lock, snapshot reading, vscode:// navigation and notifications.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde_json::{json, Map, Value};
use std::{fs, path::PathBuf, sync::Mutex, time::Duration};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

struct Helper {
    dir: PathBuf,
    report: Mutex<Map<String, Value>>,
    self_test: bool,
    hold: u64,
    _lock: fs::File,
}

fn toggle_shortcut() -> Shortcut { Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SUPER), Code::KeyP) }

#[tauri::command]
fn snapshots(helper: tauri::State<Helper>) -> Vec<Value> {
    let Ok(entries) = fs::read_dir(&helper.dir) else { return vec![] };
    entries.flatten().filter_map(|e| {
        let name = e.file_name().to_string_lossy().to_string();
        if !name.starts_with("client-") || !name.ends_with(".json") { return None; }
        serde_json::from_slice(&fs::read(e.path()).ok()?).ok()
    }).collect()
}

#[tauri::command]
fn open_url(helper: tauri::State<Helper>, url: String) -> Result<(), String> {
    if !url.starts_with("vscode://") { return Err("rejected".into()); }
    helper.report.lock().unwrap().insert("openedUrl".into(), json!(url));
    if helper.self_test { return Ok(()); }
    open::that_detached(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn report(app: AppHandle, helper: tauri::State<Helper>, key: String, value: Value) {
    helper.report.lock().unwrap().insert(key.clone(), value);
    if helper.self_test && key == "ui" { finish(app); }
}

fn notify(title: &str, body: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        return tauri_winrt_notification::Toast::new(tauri_winrt_notification::Toast::POWERSHELL_APP_ID)
            .title(title).text1(body).show().map_err(|e| e.to_string());
    }
    #[cfg(not(windows))]
    { let _ = (title, body); Err("not probed on this platform".into()) }
}

fn finish(app: AppHandle) {
    std::thread::spawn(move || {
        let helper = app.state::<Helper>();
        let mut report = helper.report.lock().unwrap().clone();
        if let Some(w) = app.get_webview_window("pet") {
            report.insert("window".into(), json!({
                "visible": w.is_visible().ok(), "decorated": w.is_decorated().ok(),
                "alwaysOnTop": w.is_always_on_top().ok(), "size": w.outer_size().ok().map(|s| [s.width, s.height]),
                "scale": w.scale_factor().ok()
            }));
        }
        report.insert("shortcutRegistered".into(), json!(app.global_shortcut().is_registered(toggle_shortcut())));
        report.insert("notification".into(), json!(notify("Agent Pet spike", "Notification probe").map(|_| "shown".to_string()).unwrap_or_else(|e| e)));
        report.insert("platform".into(), json!({ "os": std::env::consts::OS, "arch": std::env::consts::ARCH }));
        let text = serde_json::to_string_pretty(&Value::Object(report)).unwrap();
        let _ = fs::write(helper.dir.join("spike-report.json"), &text);
        println!("{text}");
        std::thread::sleep(Duration::from_secs(helper.hold));
        app.exit(0);
    });
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let value = |flag: &str| args.iter().position(|a| a == flag).and_then(|i| args.get(i + 1)).cloned();
    let dir = PathBuf::from(value("--state-dir").expect("--state-dir is required"));
    fs::create_dir_all(&dir).expect("state directory");
    let lock = fs::OpenOptions::new().create(true).truncate(false).read(true).write(true).open(dir.join("desktop.lock")).expect("lock file");
    if lock.try_lock().is_err() { eprintln!("another helper owns {}", dir.display()); std::process::exit(3); }
    let mut probes = Map::new();
    probes.insert("lockAcquired".into(), json!(true));
    let helper = Helper { dir, report: Mutex::new(probes), self_test: args.iter().any(|a| a == "--self-test"),
        hold: value("--hold").and_then(|v| v.parse().ok()).unwrap_or(0), _lock: lock };

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app, _shortcut, event| {
            if event.state() != ShortcutState::Pressed { return; }
            if let Some(w) = app.get_webview_window("pet") {
                if w.is_visible().unwrap_or(false) { let _ = w.hide(); } else { let _ = w.show(); }
            }
        }).build())
        .manage(helper)
        .invoke_handler(tauri::generate_handler![snapshots, open_url, report])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let window = WebviewWindowBuilder::new(app, "pet", WebviewUrl::App("index.html".into()))
                .title("Agent Pet").inner_size(360.0, 300.0).min_inner_size(240.0, 160.0)
                .transparent(true).decorations(false).shadow(false).always_on_top(true)
                .skip_taskbar(true).visible_on_all_workspaces(true).resizable(true)
                .build()?;
            let _ = window;
            let show = MenuItem::with_id(app, "show", "Show Pet", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Agent Pet", true, None::<&str>)?;
            let mut tray = TrayIconBuilder::with_id("agent-pet").menu(&Menu::with_items(app, &[&show, &quit])?)
                .tooltip("Agent Pet").on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => { if let Some(w) = app.get_webview_window("pet") { let _ = w.show(); let _ = w.set_focus(); } }
                    "quit" => app.exit(0),
                    _ => {}
                });
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            #[cfg(target_os = "macos")]
            { tray = tray.title("1 running"); }
            let created = tray.build(app).is_ok();
            let shortcut = app.global_shortcut().register(toggle_shortcut()).map(|_| "registered".to_string()).unwrap_or_else(|e| e.to_string());
            let helper = app.state::<Helper>();
            let mut report = helper.report.lock().unwrap();
            report.insert("trayCreated".into(), json!(created));
            report.insert("shortcut".into(), json!(shortcut));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("helper failed to start");
}
