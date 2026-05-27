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
