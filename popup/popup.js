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

const CONTENT_SCRIPTS = [
  'lib/extractor.js',
  'content/attribute-config.js',
  'content/content.js',
];

function tryMessage(tabId, action, payload = {}) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { action, ...payload }, response => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, _err: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { ok: false, error: 'Sem resposta do content script' });
      }
    });
  });
}

async function sendAction(tabId, action, payload = {}) {
  const first = await tryMessage(tabId, action, payload);
  if (!first._err) return first;

  if (!first._err.includes('Receiving end does not exist')) {
    return { ok: false, error: first._err };
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_SCRIPTS });
  } catch (_) {
    // script já injetado (IIFE guard ativo) — ok continuar
  }

  const second = await tryMessage(tabId, action, payload);
  if (second._err) return { ok: false, error: second._err };
  return second;
}

const FEEDBACK_MESSAGES = {
  copyData:       r => r.ok ? 'Dados copiados!' : `Erro: ${r.error}`,
  togglePanels:   r => r.ok ? `${r.count} seções alternadas` : `Erro: ${r.error}`,
  toggleReadMode: r => r.ok ? (r.hidden ? 'Modo leitura ativado' : 'Navegação restaurada') : `Erro: ${r.error}`,
aumentarQuadro: r => r.ok ? (r.enlarged ? 'Quadro aumentado' : 'Quadro restaurado') : `Erro: ${r.error}`,
  abrirArvore:    r => r.ok ? `${r.count} nós expandidos` : `Erro: ${r.error}`,
  submeterNotificacao: r => r.ok ? 'Notificação submetida!' : `Erro: ${r.error}`,
  submeterEmenda:      r => r.ok ? 'Emenda submetida!' : `Erro: ${r.error}`,
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

  document.querySelectorAll('.btn[data-action]').forEach(btn => {
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

  // ── Painel de Protocolos ────────────────────────────────────────────────

  const actionsEl       = document.getElementById('actions');
  const protocolsPanel  = document.getElementById('protocols-panel');
  const protocolsList   = document.getElementById('protocols-list');
  const protocolsForm   = document.getElementById('protocols-form');
  const inputNome       = document.getElementById('input-nome');
  const inputCaae       = document.getElementById('input-caae');

  function showView(view) {
    if (view === 'protocols') {
      actionsEl.classList.add('hidden');
      protocolsPanel.classList.remove('hidden');
      document.body.classList.add('wide');
    } else {
      actionsEl.classList.remove('hidden');
      protocolsPanel.classList.add('hidden');
      document.body.classList.remove('wide');
    }
  }

  function renderProtocols(list) {
    protocolsList.innerHTML = '';
    if (list.length === 0) {
      protocolsList.innerHTML = '<div style="color:#999;font-size:11px;padding:4px 0">Nenhum protocolo adicionado.</div>';
      return;
    }
    list.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'protocol-item';
      item.innerHTML = `
        <div class="protocol-item-info">
          <div class="protocol-nome" title="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</div>
          <div class="protocol-caae" title="${escapeHtml(p.caae)}">${escapeHtml(p.caae)}</div>
        </div>
        <button class="btn-exec" data-index="${i}" title="Buscar e abrir projeto">▶</button>
        <button class="btn-del" data-index="${i}" title="Remover">🗑</button>
      `;
      protocolsList.appendChild(item);
    });

    protocolsList.querySelectorAll('.btn-exec').forEach(btn => {
      if (!onPage) { btn.disabled = true; return; }
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.index);
        const protocols = await loadProtocols();
        const p = protocols[idx];
        if (!p) return;
        btn.disabled = true;
        const response = await sendAction(tab.id, 'buscarProjeto', { caae: p.caae });
        showFeedback(
          response.ok ? `Abrindo ${p.nome}...` : `Erro: ${response.error}`,
          !response.ok
        );
        btn.disabled = false;
      });
    });

    protocolsList.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.index);
        const list = await loadProtocols();
        const updated = removeFromList(list, idx);
        await saveProtocols(updated);
        renderProtocols(updated);
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.getElementById('btn-open-protocols').addEventListener('click', async () => {
    const list = await loadProtocols();
    renderProtocols(list);
    showView('protocols');
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    protocolsForm.classList.add('hidden');
    showView('actions');
  });

  document.getElementById('btn-show-add').addEventListener('click', () => {
    protocolsForm.classList.toggle('hidden');
    inputNome.focus();
  });

  document.getElementById('btn-add-cancel').addEventListener('click', () => {
    protocolsForm.classList.add('hidden');
    inputNome.value = '';
    inputCaae.value = '';
  });

  document.getElementById('btn-add-confirm').addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    const caae = inputCaae.value.trim();
    if (!nome || !caae) {
      showFeedback('Preencha Nome e CAAE.', true);
      return;
    }
    const list = await loadProtocols();
    const updated = addToList(list, nome, caae);
    await saveProtocols(updated);
    inputNome.value = '';
    inputCaae.value = '';
    protocolsForm.classList.add('hidden');
    renderProtocols(updated);
  });
});
