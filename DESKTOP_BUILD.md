# Concrem Connect — App Desktop (Windows) com Tauri v2

Camada desktop **aditiva**: usa exatamente o mesmo frontend (Vite/React) do app web.
Nada do app web/mobile foi alterado — o `npm run build` e o deploy na Vercel continuam iguais.

- **Nome:** Concrem Connect
- **Identifier:** `br.com.concrem.connect`
- **Janela:** 1280×800 (mín. 390×700), redimensionável, centralizada, sem cara de navegador
- **Instalador:** NSIS (`.exe`) — instala por usuário, cria atalho no Menu Iniciar
- **Roteamento:** o app usa `MemoryRouter`, então **refresh nunca quebra rota** no desktop

---

## 0. Pré-requisitos (uma vez por máquina)

O Tauri compila um binário nativo em **Rust**. Instale:

1. **Rust** (inclui `cargo`): https://www.rust-lang.org/tools/install
   - No Windows, o instalador pede o **"Microsoft C++ Build Tools"** (Visual Studio Build Tools com o workload *Desktop development with C++*). Aceite/instale.
2. **WebView2 Runtime** — já vem no Windows 10/11 atualizado. Se faltar, o instalador do Tauri baixa sozinho (modo padrão `downloadBootstrapper`).
3. **Node + npm** (já usados no projeto) e as dependências: `npm install`.

Confirme o Rust:
```bash
rustc --version
cargo --version
```

> Enquanto o Rust não estiver instalado, `npm run desktop:dev` / `desktop:build` não rodam
> (só o frontend web funciona). Todo o resto (config, ícones, scripts) já está pronto.

---

## 1. Rodar em modo desenvolvimento

```bash
npm run desktop:dev
```
Isso sobe o Vite (porta fixa **5173**) e abre a janela nativa apontando para ele, com
hot-reload. O `beforeDevCommand` (`npm run dev`) é disparado automaticamente pelo Tauri.

---

## 2. Gerar o instalador

```bash
npm run desktop:build
```
O Tauri roda `npm run build` (gera `dist/`), compila o binário e empacota o instalador NSIS.

Primeira compilação demora (baixa e compila as crates do Rust); as seguintes são rápidas.

---

## 3. Onde o instalador é gerado

```
src-tauri/target/release/bundle/nsis/Concrem Connect_0.1.0_x64-setup.exe
```
(o executável “solto” fica em `src-tauri/target/release/Concrem Connect.exe`)

Instale o `-setup.exe`: o app aparece no **Menu Iniciar** e pode ser aberto como um
programa normal. Para criar **atalho na área de trabalho**, marque a opção durante a
instalação (ou defina no instalador — ver seção 4 sobre personalização do NSIS).

---

## 4. Como trocar o ícone

Os ícones vêm de **um único PNG-fonte** `src-tauri/icon-source.png` (1024×1024,
verde institucional + isotipo). Para regenerar tudo:

```bash
npm run desktop:icon
```
Isso executa `scripts/gen-desktop-icon.mjs` (redesenha o PNG-fonte a partir de
`public/logos/Isotipo-Branco.png`) e depois `tauri icon`, que gera:
`src-tauri/icons/` → `icon.ico`, `icon.icns`, `32x32.png`, `128x128.png`,
`128x128@2x.png`, `StoreLogo.png`, `Square*Logo.png`, etc.

Para usar **outra arte**, substitua `src-tauri/icon-source.png` por um PNG quadrado
(1024×1024) e rode `npx tauri icon src-tauri/icon-source.png`.

---

## 5. Assinatura de código (code signing) — futuro

Sem assinatura, o Windows SmartScreen mostra "editor desconhecido" na primeira execução.
Para assinar:

1. Obtenha um **certificado de Code Signing** (OV ou, ideal, **EV**) de uma CA
   (DigiCert, Sectigo, etc.). EV reduz muito os avisos do SmartScreen.
2. No `src-tauri/tauri.conf.json`, em `bundle.windows`, configure:
   ```json
   "windows": {
     "certificateThumbprint": "<THUMBPRINT_DO_CERTIFICADO>",
     "digestAlgorithm": "sha256",
     "timestampUrl": "http://timestamp.digicert.com"
   }
   ```
   (o certificado precisa estar instalado no repositório de certificados do Windows;
   alternativamente use `signCommand` para HSM/token USB.)
3. Rode `npm run desktop:build` — o instalador e o `.exe` saem assinados.

Documentação: https://tauri.app/distribute/sign/windows/

---

## 6. Auto-update — futuro

O caminho recomendado é o **plugin updater** do Tauri v2:

1. Instalar: `npm i @tauri-apps/plugin-updater` e no `Cargo.toml`
   `tauri-plugin-updater = "2"`; registrar `.plugin(tauri_plugin_updater::Builder::new().build())`
   em `src-tauri/src/lib.rs` e adicionar `"updater:default"` em `capabilities/default.json`.
2. Gerar o par de chaves de assinatura do updater:
   `npx tauri signer generate -w ~/.tauri/concrem.key`
3. Em `tauri.conf.json`, adicionar o bloco `plugins.updater` com a **pubkey** e os
   `endpoints` (uma URL que serve um `latest.json`). O endpoint pode ser:
   - um arquivo estático em um bucket/CDN (S3, Cloudflare R2, GitHub Releases), ou
   - **GitHub Releases** (padrão simples): publique o instalador + `latest.json` a cada versão.
4. No CI, a cada release: `TAURI_SIGNING_PRIVATE_KEY=... npm run desktop:build` gera os
   artefatos já assinados + o `latest.json`.
5. No app, chamar `check()` do updater (ex.: no boot ou num botão "Verificar atualizações").

Documentação: https://tauri.app/plugin/updater/

---

## Notificações nativas — estrutura pronta

O plugin **`tauri-plugin-notification`** já está registrado no Rust
(`src-tauri/src/lib.rs`) e liberado em `capabilities/default.json`. Para integrar com a
**Central de Alertas**:

1. `npm i @tauri-apps/plugin-notification @tauri-apps/api`
2. Em `src/alerts/notify.ts`, detectar o ambiente desktop e usar o plugin:
   ```ts
   // roda só dentro do Tauri
   const isTauri = '__TAURI_INTERNALS__' in window;
   if (isTauri) {
     const { sendNotification, isPermissionGranted, requestPermission } =
       await import('@tauri-apps/plugin-notification');
     if (!(await isPermissionGranted())) await requestPermission();
     await sendNotification({ title, body });
   } else {
     // caminho web atual (Notification API / banner)
   }
   ```
   Assim o mesmo código de alertas dispara notificação nativa no desktop e mantém o
   comportamento web no navegador — sem tocar na regra de negócio.

---

## Links externos no navegador padrão

O plugin **`tauri-plugin-opener`** já está registrado. Para abrir um link no navegador
do sistema (não dentro da janela do app):
```ts
import { openUrl } from '@tauri-apps/plugin-opener';
await openUrl('https://concrem.com.br');
```
Use isso em links institucionais/WhatsApp/políticas quando forem implementados.

---

## Estrutura criada

```
src-tauri/
  Cargo.toml            # deps Rust (tauri v2 + plugins opener/notification)
  build.rs
  tauri.conf.json       # nome, identifier, janela, bundle NSIS, ícones
  icon-source.png       # PNG-fonte 1024×1024 (regenerável)
  src/
    main.rs             # entry point (sem console no Windows release)
    lib.rs              # Builder + plugins
  capabilities/
    default.json        # permissões da janela "main"
  icons/                # ícones gerados (ico/icns/png/Store)
scripts/
  gen-desktop-icon.mjs  # desenha o PNG-fonte a partir do isotipo
package.json            # scripts desktop:dev / desktop:build / desktop:icon / tauri
vite.config.ts          # porta fixa 5173 + clearScreen:false (para o Tauri)
```

## Segurança (CSP da janela)

Em `tauri.conf.json` a `app.security.csp` está **`null`** para garantir que Supabase,
Cloudflare Turnstile e Google Fonts carreguem de primeira no desktop. Recomendado
**endurecer depois** com a mesma CSP do web (ver `SEGURANCA.md`), validando que o login
(Turnstile) continua funcionando na janela nativa:
```
default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com;
script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
frame-src https://challenges.cloudflare.com; img-src 'self' data: blob: https://*.supabase.co; worker-src blob:
```

## Checklist pós-build (validar no app instalado)
- [ ] Janela abre centralizada, sem barra de endereço/controles de navegador
- [ ] Tela de **login** aparece e autentica (Supabase + Turnstile)
- [ ] Navegação entre telas funciona (menu lateral)
- [ ] Assets/ícones/logos carregam
- [ ] Ícone correto no atalho e na janela
- [ ] `npm run build` (web) continua funcionando e o deploy da Vercel não muda
