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

function isDetalharPage(url) {
  return url?.includes('detalharProjetoAgrupadorApreciacao');
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
  } catch {
    // script já injetado (IIFE guard ativo) — ok continuar
  }

  const second = await tryMessage(tabId, action, payload);
  if (second._err) return { ok: false, error: second._err };
  return second;
}

async function savePdf(tabId) {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
  } catch (e) {
    if (e.message?.includes('Another debugger is already attached')) {
      throw new Error('Feche o DevTools antes de salvar o PDF.');
    }
    throw e;
  }
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Page.enable', {});
    const result = await chrome.debugger.sendCommand({ tabId }, 'Page.printToPDF', {
      landscape: false,
      printBackground: true,
      scale: 1,
      paperWidth: 8.27,
      paperHeight: 11.69,
      marginTop: 0.4,
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4,
    });
    const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await chrome.downloads.download({ url, filename: `plataforma_pb_${date}.pdf` });
    URL.revokeObjectURL(url);
    return { ok: true };
  } finally {
    await chrome.debugger.detach({ tabId });
  }
}

const FEEDBACK_MESSAGES = {
  copyData:       r => r.ok ? 'Dados copiados!' : `Erro: ${r.error}`,
  togglePanels:   r => r.ok ? `${r.count} seções alternadas` : `Erro: ${r.error}`,
  toggleReadMode: r => r.ok ? (r.hidden ? 'Modo leitura ativado' : 'Navegação restaurada') : `Erro: ${r.error}`,
aumentarQuadro: r => r.ok ? (r.enlarged ? 'Quadro aumentado' : 'Quadro restaurado') : `Erro: ${r.error}`,
  abrirArvore:    r => r.ok ? `${r.count} nós expandidos` : `Erro: ${r.error}`,
  submeterNotificacao: r => r.ok ? 'Notificação submetida!' : `Erro: ${r.error}`,
  submeterEmenda:      r => r.ok ? 'Emenda submetida!' : `Erro: ${r.error}`,
  imprimir:            r => r.ok ? 'Diálogo de impressão aberto.' : `Erro: ${r.error}`,
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

function _navigateToProjectInMainWorld(projectId) {
  const id = String(projectId ?? '');
  if (!/^\d+$/.test(id)) return { ok: false, error: 'ID de projeto inválido' };
  if (!document.getElementById('gerirPesquisaForm')) return { ok: false, error: 'Formulário gerirPesquisaForm não encontrado. Certifique-se de estar na página de Gerir Pesquisa.' };

  Richfaces.showModalPanel('ajaxStatusMP', { showModal: true });
  if (typeof jsfcljs === 'function') {
    jsfcljs(
      document.getElementById('gerirPesquisaForm'),
      {
        [`gerirPesquisaForm:dataTableProjetos:${id}:j_id243`]: `gerirPesquisaForm:dataTableProjetos:${id}:j_id243`,
        'coProjeto': id,
        'primeiraTela4x4': 'S',
        'siglaParam': 'P',
        'consultaCepOrConep': 'false',
      },
      ''
    );
  }
  return { ok: true };
}

async function navigateToProject(tabId, projectId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: _navigateToProjectInMainWorld,
      args: [projectId],
    });
    return results?.[0]?.result ?? { ok: false, error: 'Sem resultado da execução' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
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

      if (action === 'copyData' && response.ok) {
        try {
          await navigator.clipboard.writeText(response.text);
        } catch (e) {
          showFeedback(`Erro ao copiar: ${e.message}`, true);
          btn.disabled = false;
          return;
        }
      }

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
  const caaeAutoEl      = document.getElementById('protocols-caae-auto');
  const caaeValueEl     = document.getElementById('protocols-caae-value');

  let _autoProtocolData = null; // { caae, projectId } quando extraído da página

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

  function makeProtocolItem(p, i) {
    const item = document.createElement('div');
    item.className = 'protocol-item';
    item.dataset.index = String(i);
    item.title = 'Clique para buscar e abrir projeto';

    const info = document.createElement('div');
    info.className = 'protocol-item-info';

    const nome = document.createElement('div');
    nome.className = 'protocol-nome';
    nome.title = p.nome;
    nome.textContent = p.nome;

    const caae = document.createElement('div');
    caae.className = 'protocol-caae';
    caae.title = p.caae;
    caae.textContent = p.caae;

    info.appendChild(nome);
    info.appendChild(caae);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del';
    btnDel.dataset.index = String(i);
    btnDel.title = 'Remover';
    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';

    item.appendChild(info);
    item.appendChild(btnDel);
    return item;
  }

  function renderProtocols(list) {
    protocolsList.innerHTML = '';
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#999;font-size:11px;padding:4px 0';
      empty.textContent = 'Nenhum protocolo adicionado.';
      protocolsList.appendChild(empty);
      return;
    }
    list.forEach((p, i) => {
      protocolsList.appendChild(makeProtocolItem(p, i));
    });

    protocolsList.querySelectorAll('.protocol-item').forEach(item => {
      if (!onPage) {
        item.classList.add('disabled');
        return;
      }
      item.addEventListener('click', async () => {
        const idx = Number(item.dataset.index);
        const p = list[idx];
        if (!p) return;
        item.classList.add('disabled');
        const response = p.projectId
          ? await navigateToProject(tab.id, p.projectId)
          : await sendAction(tab.id, 'buscarProjeto', { caae: p.caae });
        showFeedback(
          response.ok ? `Abrindo ${p.nome}...` : `Erro: ${response.error}`,
          !response.ok
        );
        item.classList.remove('disabled');
      });
    });

    protocolsList.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async event => {
        event.stopPropagation();
        const idx = Number(btn.dataset.index);
        const list = await loadProtocols();
        const updated = removeFromList(list, idx);
        await saveProtocols(updated);
        renderProtocols(updated);
      });
    });
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

  function resetProtocolForm() {
    _autoProtocolData = null;
    caaeAutoEl.classList.add('hidden');
    caaeValueEl.textContent = '';
    inputNome.value = '';
  }

  document.getElementById('btn-show-add').addEventListener('click', async () => {
    caaeAutoEl.classList.add('hidden');
    protocolsForm.classList.remove('hidden');
    inputNome.focus();

    const res = await sendAction(tab.id, 'extractProtocolData');
    if (res.ok) {
      _autoProtocolData = { caae: res.caae, projectId: res.projectId };
      caaeValueEl.textContent = res.caae;
      caaeAutoEl.classList.remove('hidden');
    } else {
      _autoProtocolData = null;
      showFeedback(`Erro ao extrair dados: ${res.error}`, true);
    }
  });

  document.getElementById('btn-add-cancel').addEventListener('click', () => {
    protocolsForm.classList.add('hidden');
    resetProtocolForm();
  });

  document.getElementById('btn-add-confirm').addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    const caae = _autoProtocolData?.caae ?? '';
    const projectId = _autoProtocolData?.projectId ?? null;
    if (!nome || !caae) {
      showFeedback('Preencha Nome e CAAE.', true);
      return;
    }
    let updated;
    try {
      const list = await loadProtocols();
      updated = addToList(list, nome, caae, projectId);
    } catch (e) {
      showFeedback(e.message, true);
      return;
    }
    await saveProtocols(updated);
    protocolsForm.classList.add('hidden');
    resetProtocolForm();
    renderProtocols(updated);
  });

  const btnSalvarEImprimir = document.getElementById('btn-salvar-e-imprimir');
  if (btnSalvarEImprimir) {
    if (!onPage) {
      btnSalvarEImprimir.disabled = true;
    } else {
      const originalHTML = btnSalvarEImprimir.innerHTML;
      let awaitingConfirm = false;

      function resetBtn() {
        awaitingConfirm = false;
        btnSalvarEImprimir.innerHTML = originalHTML;
        btnSalvarEImprimir.classList.remove('btn-confirm-pending');
        btnSalvarEImprimir.disabled = false;
      }

      btnSalvarEImprimir.addEventListener('click', async () => {
        if (!awaitingConfirm) {
          awaitingConfirm = true;
          btnSalvarEImprimir.innerHTML = '<i class="fa-regular fa-file-pdf"></i> Confirmar';
          btnSalvarEImprimir.classList.add('btn-confirm-pending');
          return;
        }

        btnSalvarEImprimir.disabled = true;
        try {
          showFeedback('Gerando PDF…', false);
          const result = await savePdf(tab.id);
          if (!result.ok) {
            showFeedback(`Erro ao salvar PDF: ${result.error}`, true);
            resetBtn();
            return;
          }
          showFeedback('PDF salvo. Abrindo impressão…', false);
          const printResult = await sendAction(tab.id, 'imprimir');
          showFeedback(
            printResult.ok ? 'PDF salvo e diálogo de impressão aberto.' : `Erro ao imprimir: ${printResult.error}`,
            !printResult.ok
          );
        } catch (e) {
          showFeedback(`Erro: ${e.message}`, true);
        } finally {
          resetBtn();
        }
      });
    }
  }
});
