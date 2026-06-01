# Chrome Extension – Plataforma Brasil DOM Toolkit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensão Chrome que injeta funcionalidades de manipulação de DOM na página `detalharProjetoAgrupadorApreciacao.jsf` da Plataforma Brasil, acessíveis via popup ao clicar no ícone da extensão.

**Architecture:** Manifest V3 com content script injetado somente nas páginas da Plataforma Brasil. O popup envia mensagens ao content script via `chrome.tabs.sendMessage`. Lógica de extração isolada em `lib/extractor.js` (funções puras, testáveis com Jest). Sem build step — JS vanilla, sem bundler.

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JS ES2020, Jest 29 (testes unitários das funções puras), `chrome.tabs` / `chrome.scripting` / `chrome.storage.local`

---

## Estrutura de Arquivos

```
ext_pb/
  manifest.json                    ← permissões, content scripts, popup
  popup/
    popup.html                     ← UI do popup (botões de ação)
    popup.js                       ← lógica do popup; envia msgs ao content script
    popup.css                      ← estilos do popup
  content/
    content.js                     ← recebe msgs; executa manipulações DOM
  lib/
    extractor.js                   ← funções puras de extração de dados da página
  background/
    service_worker.js              ← registra listeners de instalação (minimal)
  tests/
    extractor.test.js              ← testes Jest das funções puras
  icons/
    icon16.png  icon48.png  icon128.png   ← ícones placeholder (ver Tarefa 1)
  package.json                     ← apenas Jest como devDependency
```

**Fluxo de comunicação:**
```
[popup.js]  →  chrome.tabs.sendMessage({action: "..."})
                        ↓
              [content.js]  →  executa manipulação DOM  →  retorna {ok, data}
                        ↓
[popup.js]  ←  response callback  →  atualiza UI do popup
```

---

## Funcionalidades (5 ações no popup)

| Botão | Ação | DOM alvo |
|-------|------|----------|
| **Copiar dados** | Extrai CAAE, título, pesquisador, status, instituição → clipboard | `.labelClass` spans |
| **Expandir/Colapsar tudo** | Toggle de todos os painéis `rich-stglpanel` | `SimpleTogglePanelManager` |
| **Modo leitura** | Oculta barras de nav, cronômetro, menu | `#barra-brasil`, `#barraSistemaSup`, `#barraSistemaInf`, `#barraMenu`, `#wrapper-clock-count` |
| **Colorir trâmites** | Destaca linhas da tabela por tipo de evento | `#formDetalharProjeto\\:tableTramiteApreciacaoProjeto` |
| **Exportar CSV** | Extrai tabela de trâmites → download `.csv` | mesma tabela acima |

---

## Tarefa 1: Scaffold da extensão (manifest + ícones + package.json)

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `icons/icon16.png` (placeholder via canvas — ver step abaixo)

- [ ] **Step 1: Criar `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Plataforma Brasil Toolkit",
  "version": "1.0.0",
  "description": "Ferramentas de DOM para a Plataforma Brasil (detalharProjetoAgrupadorApreciacao)",
  "permissions": ["activeTab", "scripting", "storage", "clipboardWrite"],
  "host_permissions": [
    "https://plataformabrasil.saude.gov.br/*",
    "https://*.saude.gov.br/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://plataformabrasil.saude.gov.br/*detalharProjetoAgrupadorApreciacao*"
      ],
      "js": ["lib/extractor.js", "content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background/service_worker.js"
  }
}
```

- [ ] **Step 2: Criar `package.json` (apenas Jest)**

```json
{
  "name": "ext-pb",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  },
  "jest": {
    "testEnvironment": "jsdom"
  }
}
```

- [ ] **Step 3: Instalar dependências**

```bash
cd /home/gabrielcgs12/python/ext_pb
npm install
```

Expected: `node_modules/` criado com Jest.

- [ ] **Step 4: Criar ícones placeholder (script de geração)**

Crie `scripts/gen_icons.js`:

```javascript
// Gera ícones PNG simples via sharp-free approach usando buffer manual
// Ícones são PNGs 1x1 pixel roxos (placeholder). Substituir depois.
const fs = require('fs');
const path = require('path');

// PNG mínimo válido 1x1 pixel cor #6b3fa0 (roxo)
// Gerado com: python3 -c "import struct,zlib; ..."
// Bytes calculados manualmente para PNG 16x16 sólido
function makePlaceholderPng(size) {
  // Usa canvas via node se disponível; caso contrário, copia um PNG hardcoded
  // Para uso em desenvolvimento: qualquer PNG válido serve
  // Aqui usamos o menor PNG válido (1x1 transparente) em base64
  const MINIMAL_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGBgAAAABQABXvMqGgAAAABJRU5ErkJggg==',
    'base64'
  );
  return MINIMAL_PNG;
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), makePlaceholderPng(size));
}
console.log('Ícones placeholder criados em icons/');
```

Execute:
```bash
node scripts/gen_icons.js
```

Expected: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` criados.

- [ ] **Step 5: Commit**

```bash
git init
git add manifest.json package.json package-lock.json icons/ scripts/
git commit -m "chore: scaffold manifest v3 + icons placeholder + jest setup"
```

---

## Tarefa 2: `lib/extractor.js` — funções puras de extração

**Files:**
- Create: `lib/extractor.js`
- Create: `tests/extractor.test.js`

Estas funções recebem `document` como parâmetro para facilitar testes com jsdom.

- [ ] **Step 1: Escrever testes que falham**

```javascript
// tests/extractor.test.js
const { extractProjectData, extractTramites, buildCsv } = require('../lib/extractor');

function makeDoc(html) {
  document.body.innerHTML = html;
  return document;
}

describe('extractProjectData', () => {
  test('extrai CAAE, título, pesquisador, situação', () => {
    makeDoc(`
      <span class="labelClass">CAAE: </span>57957522.5.1001.5262
      </td><td><b><span class="labelClass">Título da Pesquisa: </span></b>Meu Projeto</td>
      <span class="labelClass">Pesquisador Responsável: </span>João Silva</td>
      <span class="labelClass">Situação da Versão do Projeto: </span>Aprovado</td>
      <span class="labelClass">Instituição Proponente: </span>FIOCRUZ</td>
    `);
    const data = extractProjectData(document);
    expect(data.caae).toBe('57957522.5.1001.5262');
    expect(data.titulo).toBe('Meu Projeto');
    expect(data.pesquisador).toBe('João Silva');
    expect(data.situacao).toBe('Aprovado');
    expect(data.instituicao).toBe('FIOCRUZ');
  });

  test('retorna null em campo ausente', () => {
    makeDoc('<p>Sem dados</p>');
    const data = extractProjectData(document);
    expect(data.caae).toBeNull();
  });
});

describe('extractTramites', () => {
  test('extrai linhas da tabela de trâmites', () => {
    makeDoc(`
      <table id="formDetalharProjeto:tableTramiteApreciacaoProjeto">
        <tbody id="formDetalharProjeto:tableTramiteApreciacaoProjeto:tb">
          <tr class="rich-table-row">
            <td><span>N22</span></td>
            <td><span>26/05/2026 10:10:10</span></td>
            <td><span>Parecer liberado</span></td>
            <td><span>10</span></td>
            <td><span>Coordenador</span></td>
            <td><span>FIOCRUZ</span></td>
            <td><span>CONEP</span></td>
            <td><span></span></td>
          </tr>
        </tbody>
      </table>
    `);
    const tramites = extractTramites(document);
    expect(tramites).toHaveLength(1);
    expect(tramites[0].apreciacao).toBe('N22');
    expect(tramites[0].tipo).toBe('Parecer liberado');
    expect(tramites[0].origem).toBe('FIOCRUZ');
  });

  test('retorna [] se tabela ausente', () => {
    makeDoc('<p>sem tabela</p>');
    expect(extractTramites(document)).toEqual([]);
  });
});

describe('buildCsv', () => {
  test('gera CSV com header + linhas', () => {
    const tramites = [
      { apreciacao: 'N22', dataHora: '26/05/2026', tipo: 'Parecer liberado', versao: '10', perfil: 'Coord', origem: 'FIOCRUZ', destino: 'CONEP', informacoes: '' }
    ];
    const csv = buildCsv(tramites);
    expect(csv).toContain('Apreciação,Data/Hora,Tipo Trâmite');
    expect(csv).toContain('N22,26/05/2026,Parecer liberado');
  });
});
```

- [ ] **Step 2: Rodar testes para verificar que falham**

```bash
npm test
```

Expected: `Cannot find module '../lib/extractor'`

- [ ] **Step 3: Implementar `lib/extractor.js`**

```javascript
// lib/extractor.js

function getTextAfterLabel(doc, labelText) {
  const spans = doc.querySelectorAll('span.labelClass');
  for (const span of spans) {
    if (span.textContent.includes(labelText)) {
      const td = span.closest('td');
      if (!td) continue;
      // O texto do campo é o textContent do td menos o label
      const full = td.textContent.trim();
      const label = span.textContent.trim();
      return full.startsWith(label) ? full.slice(label.length).trim() : full.trim();
    }
  }
  return null;
}

function extractProjectData(doc) {
  return {
    caae: getTextAfterLabel(doc, 'CAAE:'),
    titulo: getTextAfterLabel(doc, 'Título da Pesquisa:'),
    pesquisador: getTextAfterLabel(doc, 'Pesquisador Responsável:'),
    situacao: getTextAfterLabel(doc, 'Situação da Versão do Projeto:'),
    instituicao: getTextAfterLabel(doc, 'Instituição Proponente:'),
  };
}

function extractTramites(doc) {
  const tbody = doc.querySelector(
    '[id$="tableTramiteApreciacaoProjeto:tb"]'
  );
  if (!tbody) return [];

  return Array.from(tbody.querySelectorAll('tr.rich-table-row')).map(tr => {
    const cells = tr.querySelectorAll('td span');
    return {
      apreciacao:  cells[0]?.textContent.trim() ?? '',
      dataHora:    cells[1]?.textContent.trim() ?? '',
      tipo:        cells[2]?.textContent.trim() ?? '',
      versao:      cells[3]?.textContent.trim() ?? '',
      perfil:      cells[4]?.textContent.trim() ?? '',
      origem:      cells[5]?.textContent.trim() ?? '',
      destino:     cells[6]?.textContent.trim() ?? '',
      informacoes: cells[7]?.textContent.trim() ?? '',
    };
  });
}

function buildCsv(tramites) {
  const header = 'Apreciação,Data/Hora,Tipo Trâmite,Versão,Perfil,Origem,Destino,Informações';
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const rows = tramites.map(t =>
    [t.apreciacao, t.dataHora, t.tipo, t.versao, t.perfil, t.origem, t.destino, t.informacoes]
      .map(escape).join(',')
  );
  return [header, ...rows].join('\n');
}

// Exporta para Node.js (Jest) e também funciona no browser (content script)
if (typeof module !== 'undefined') {
  module.exports = { extractProjectData, extractTramites, buildCsv };
}
```

- [ ] **Step 4: Rodar testes para verificar que passam**

```bash
npm test
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Commit**

```bash
git add lib/extractor.js tests/extractor.test.js
git commit -m "feat: add extractor.js pure functions with Jest tests"
```

---

## Tarefa 3: `content/content.js` — receptor de mensagens + manipulações DOM

**Files:**
- Create: `content/content.js`

Este arquivo é injetado na página e escuta mensagens vindas do popup.

- [ ] **Step 1: Criar `content/content.js`**

```javascript
// content/content.js
// extractor.js já foi injetado antes (manifest content_scripts order)

const TRAMITE_COLORS = {
  'Parecer liberado':                 '#d4edda',
  'Aprovado':                         '#d4edda',
  'Reaprovação anual':                '#cce5ff',
  'Notificação enviada':              '#fff3cd',
  'Pendência':                        '#ffe0b2',
  'Não aprovado':                     '#f8d7da',
  'Parecer do colegiado emitido':     '#e2d9f3',
  'Parecer do relator emitido':       '#e2d9f3',
};

function matchColor(tipo) {
  for (const [keyword, color] of Object.entries(TRAMITE_COLORS)) {
    if (tipo.toLowerCase().includes(keyword.toLowerCase())) return color;
  }
  return null;
}

// ── Ações ──────────────────────────────────────────────────────────────

function actionCopyData() {
  const data = extractProjectData(document);
  const text = [
    `CAAE: ${data.caae ?? 'N/A'}`,
    `Título: ${data.titulo ?? 'N/A'}`,
    `Pesquisador: ${data.pesquisador ?? 'N/A'}`,
    `Situação: ${data.situacao ?? 'N/A'}`,
    `Instituição: ${data.instituicao ?? 'N/A'}`,
  ].join('\n');
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
  return { ok: true, text };
}

function actionTogglePanels() {
  const panels = document.querySelectorAll('.rich-stglpanel-header');
  panels.forEach(header => header.click());
  return { ok: true, count: panels.length };
}

function actionToggleReadMode() {
  const NAV_IDS = [
    'barra-brasil', 'barraSistemaSup', 'barraSistemaInf',
    'barraMenu', 'wrapper-clock-count', 'barraSuperior'
  ];
  let hidden = false;
  NAV_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.dataset.pbHidden === 'true') {
      el.style.display = el.dataset.pbOrigDisplay || '';
      el.removeAttribute('data-pb-hidden');
    } else {
      el.dataset.pbOrigDisplay = el.style.display;
      el.style.display = 'none';
      el.dataset.pbHidden = 'true';
      hidden = true;
    }
  });
  return { ok: true, hidden };
}

function actionColorTramites() {
  const tbody = document.querySelector('[id$="tableTramiteApreciacaoProjeto:tb"]');
  if (!tbody) return { ok: false, error: 'Tabela de trâmites não encontrada' };

  const rows = tbody.querySelectorAll('tr.rich-table-row');
  rows.forEach(tr => {
    const tipo = tr.cells[2]?.querySelector('span')?.textContent.trim() ?? '';
    const color = matchColor(tipo);
    if (color) {
      tr.style.backgroundColor = color;
      // Remove hover handlers para não sobrescrever cor
      tr.onmouseover = null;
      tr.onmouseout = null;
    }
  });
  return { ok: true, count: rows.length };
}

function actionExportCsv() {
  const tramites = extractTramites(document);
  if (!tramites.length) return { ok: false, error: 'Nenhum trâmite encontrado' };

  const csv = buildCsv(tramites);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tramites_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { ok: true, rows: tramites.length };
}

// ── Listener ──────────────────────────────────────────────────────────

const ACTIONS = {
  copyData:       actionCopyData,
  togglePanels:   actionTogglePanels,
  toggleReadMode: actionToggleReadMode,
  colorTramites:  actionColorTramites,
  exportCsv:      actionExportCsv,
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const fn = ACTIONS[msg.action];
  if (!fn) {
    sendResponse({ ok: false, error: `Ação desconhecida: ${msg.action}` });
    return;
  }
  try {
    sendResponse(fn());
  } catch (e) {
    sendResponse({ ok: false, error: e.message });
  }
});
```

- [ ] **Step 2: Verificar sintaxe**

```bash
node --check content/content.js
```

Expected: sem output (sem erros de sintaxe).

- [ ] **Step 3: Commit**

```bash
git add content/content.js
git commit -m "feat: add content script with 5 DOM actions"
```

---

## Tarefa 4: `popup/` — UI do popup

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`
- Create: `popup/popup.js`

- [ ] **Step 1: Criar `popup/popup.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="header">
    <span id="title">Plataforma Brasil</span>
    <span id="status-dot" class="dot dot-off" title="Página não detectada"></span>
  </div>

  <div id="actions">
    <button data-action="copyData" class="btn">
      📋 Copiar dados do projeto
    </button>
    <button data-action="togglePanels" class="btn">
      🔽 Expandir / Colapsar seções
    </button>
    <button data-action="toggleReadMode" class="btn">
      👓 Modo leitura (ocultar nav)
    </button>
    <button data-action="colorTramites" class="btn">
      🎨 Colorir histórico de trâmites
    </button>
    <button data-action="exportCsv" class="btn">
      💾 Exportar trâmites CSV
    </button>
  </div>

  <div id="feedback"></div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `popup/popup.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  font-size: 13px;
  width: 240px;
  background: #f5f5f5;
}

#header {
  background: #064060;
  color: #fff;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

#title { font-weight: 600; font-size: 14px; }

.dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot-on  { background: #4caf50; }
.dot-off { background: #9e9e9e; }

#actions { padding: 8px; display: flex; flex-direction: column; gap: 6px; }

.btn {
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}
.btn:hover  { background: #e8f0fe; border-color: #064060; }
.btn:active { background: #c5d8e8; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

#feedback {
  min-height: 28px;
  padding: 4px 12px;
  font-size: 11px;
  color: #333;
}
.feedback-ok  { color: #2e7d32; }
.feedback-err { color: #c62828; }
```

- [ ] **Step 3: Criar `popup/popup.js`**

```javascript
// popup/popup.js

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isPlataformaBrasil(url) {
  return url && url.includes('detalharProjetoAgrupadorApreciacao');
}

function showFeedback(msg, isError = false) {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.className = isError ? 'feedback-err' : 'feedback-ok';
  setTimeout(() => { el.textContent = ''; el.className = ''; }, 3000);
}

async function sendAction(tabId, action) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action }, response => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { ok: false, error: 'Sem resposta do content script' });
      }
    });
  });
}

const FEEDBACK_MESSAGES = {
  copyData:       r => r.ok ? 'Dados copiados!' : `Erro: ${r.error}`,
  togglePanels:   r => r.ok ? `${r.count} seções alternadas` : `Erro: ${r.error}`,
  toggleReadMode: r => r.ok ? (r.hidden ? 'Modo leitura ativado' : 'Navegação restaurada') : `Erro: ${r.error}`,
  colorTramites:  r => r.ok ? `${r.count} trâmites coloridos` : `Erro: ${r.error}`,
  exportCsv:      r => r.ok ? `CSV exportado (${r.rows} linhas)` : `Erro: ${r.error}`,
};

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getActiveTab();
  const onPage = isPlataformaBrasil(tab?.url ?? '');

  document.getElementById('status-dot').className = `dot ${onPage ? 'dot-on' : 'dot-off'}`;
  document.getElementById('status-dot').title = onPage
    ? 'Página Plataforma Brasil detectada'
    : 'Página não é Plataforma Brasil';

  document.querySelectorAll('.btn').forEach(btn => {
    if (!onPage) { btn.disabled = true; return; }
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const action = btn.dataset.action;
      const response = await sendAction(tab.id, action);
      const msg = FEEDBACK_MESSAGES[action]?.(response) ?? (response.ok ? 'OK' : response.error);
      showFeedback(msg, !response.ok);
      btn.disabled = false;
    });
  });
});
```

- [ ] **Step 4: Verificar sintaxe**

```bash
node --check popup/popup.js
```

Expected: sem output.

- [ ] **Step 5: Commit**

```bash
git add popup/
git commit -m "feat: add popup UI with 5 action buttons"
```

---

## Tarefa 5: `background/service_worker.js`

**Files:**
- Create: `background/service_worker.js`

- [ ] **Step 1: Criar `background/service_worker.js`**

```javascript
// background/service_worker.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Plataforma Brasil Toolkit instalado.');
});
```

- [ ] **Step 2: Verificar sintaxe**

```bash
node --check background/service_worker.js
```

- [ ] **Step 3: Commit**

```bash
git add background/service_worker.js
git commit -m "chore: add minimal service worker"
```

---

## Tarefa 6: Carregar e testar a extensão no Chrome

Não há testes automatizados de integração para extensões Chrome — validação é manual.

- [ ] **Step 1: Abrir `chrome://extensions/` no Chrome**

- [ ] **Step 2: Ativar "Modo do desenvolvedor" (canto superior direito)**

- [ ] **Step 3: Clicar "Carregar sem compactação" e selecionar `/home/gabrielcgs12/python/ext_pb`**

Expected: extensão aparece na lista sem erros.

- [ ] **Step 4: Abrir `caae_exemp.html` como arquivo local no Chrome**

```
Arquivo > Abrir arquivo > /home/gabrielcgs12/python/ext_pb/caae_exemp.html
```

**Nota:** Para arquivos locais (`file://`), adicionar `"file://*"` em `host_permissions` no `manifest.json` e recarregar a extensão. Alternativamente, servir com:

```bash
cd /home/gabrielcgs12/python/ext_pb
python3 -m http.server 8080
```

Acessar: `http://localhost:8080/caae_exemp.html`

Para localhost funcionar, adicionar `"http://localhost/*"` em `host_permissions`.

- [ ] **Step 5: Testar cada botão**

| Botão | Verificar |
|-------|-----------|
| Copiar dados | Colar em editor — deve conter CAAE `57957522.5.1001.5262` |
| Expandir/Colapsar | Seções devem abrir/fechar |
| Modo leitura | Barra laranja/nav desaparecem; clicar novamente restaura |
| Colorir trâmites | Linhas com "Parecer liberado" ficam verdes; "Notificação" amarelas |
| Exportar CSV | Arquivo `tramites_<ts>.csv` baixado com header + dados |

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: verify extension loads and all actions work"
```

---

## Verificação de Spec Coverage

| Requisito | Tarefa |
|-----------|--------|
| Extensão Chrome | Tarefa 1 (manifest.json) |
| Manipular DOM de `detalharProjetoAgrupadorApreciacao` | Tarefa 3 |
| Opções via clique no ícone | Tarefa 4 (popup) |
| Extrair dados principais (CAAE etc.) | Tarefa 2 + 3 (`copyData`) |
| Expandir/Colapsar seções | Tarefa 3 (`togglePanels`) |
| Modo leitura | Tarefa 3 (`toggleReadMode`) |
| Colorir trâmites | Tarefa 3 (`colorTramites`) |
| Exportar CSV | Tarefa 3 (`exportCsv`) |
| Testes unitários | Tarefa 2 (Jest, `extractor.test.js`) |
