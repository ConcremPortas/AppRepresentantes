// Ponto de entrada do app Tauri v2.
// Plugins registrados:
//  - opener: abre links externos (WhatsApp, site, políticas) no navegador padrão.
//  - notification: preparado para as notificações nativas da Central de Alertas.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Concrem Connect");
}
