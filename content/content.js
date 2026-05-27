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

// ── Layout ─────────────────────────────────────────────────────────────

function injectLayoutStyles() {
  const style = document.createElement('style');
  style.id = 'pb-toolkit-layout';
  style.textContent = `
    #geral         { width: 100% !important; max-width: none !important; }
    #conteudoImage { width: 100% !important; max-width: none !important; }
    #conteudoFull  { width: 100% !important; max-width: none !important; }
  `;
  document.head.appendChild(style);
}

injectLayoutStyles();

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
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (e) {
    return { ok: false, error: 'Falha ao copiar: ' + e.message };
  }
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
