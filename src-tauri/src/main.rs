// Impede a janela de console preta no Windows em build de produção.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    concrem_connect_lib::run()
}
