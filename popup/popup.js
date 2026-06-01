// popup/popup.js

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const PB_PATTERNS = [
  'detalharProjetoAgrupadorApreciacao',
  'gerirPesquisaAgrupador.jsf',
];

function isPlataformaBrasil(url) {
  return url && PB_PATTERNS.some(p => url.includes(p));
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
  aumentarQuadro: r => r.ok ? (r.enlarged ? 'Quadro aumentado' : 'Quadro restaurado') : `Erro: ${r.error}`,
  abrirArvore:    r => r.ok ? `${r.count} nós expandidos` : `Erro: ${r.error}`,
};

// Map of toggle state extractors — add an entry here to make any action toggleable.
const TOGGLE_EXTRACTORS = {
  aumentarQuadro: r => Boolean(r?.enlarged),
};

async function saveToggleState(action, active) {
  await chrome.storage.local.set({ [`toggle_${action}`]: active });
}

async function loadToggleStates() {
  const keys = Object.keys(TOGGLE_EXTRACTORS).map(a => `toggle_${a}`);
  return chrome.storage.local.get(keys);
}

function applyToggleClass(btn, active) {
  btn.classList.toggle('btn-active', active);
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getActiveTab();
  const onPage = isPlataformaBrasil(tab?.url ?? '');

  document.getElementById('status-dot').className = `dot ${onPage ? 'dot-on' : 'dot-off'}`;
  document.getElementById('status-dot').title = onPage
    ? 'Página Plataforma Brasil detectada'
    : 'Página não é Plataforma Brasil';

  const savedStates = await loadToggleStates();

  document.querySelectorAll('.btn').forEach(btn => {
    if (!onPage) { btn.disabled = true; return; }

    const action = btn.dataset.action;
    if (btn.dataset.toggle === 'true') {
      const active = savedStates[`toggle_${action}`] ?? false;
      applyToggleClass(btn, active);
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const response = await sendAction(tab.id, action);
      const msg = FEEDBACK_MESSAGES[action]?.(response) ?? (response.ok ? 'OK' : response.error);
      showFeedback(msg, !response.ok);

      if (btn.dataset.toggle === 'true' && response.ok) {
        const extractor = TOGGLE_EXTRACTORS[action];
        if (extractor) {
          const active = extractor(response);
          await saveToggleState(action, active);
          applyToggleClass(btn, active);
        }
      }

      btn.disabled = false;
    });
  });
});
