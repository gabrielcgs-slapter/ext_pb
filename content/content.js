// content/content.js
// extractor.js já foi injetado antes (manifest content_scripts order)

(function () {
  if (window.__pbLoaded) return;
  window.__pbLoaded = true;

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

  function removeLayoutStyles() {
    document.getElementById('pb-toolkit-layout')?.remove();
  }

  // ── Atributos via config ────────────────────────────────────────────────

  const CONFIG_URL = chrome.runtime.getURL('config/attributes.json');

  // ── Ações ──────────────────────────────────────────────────────────────

  function actionCopyData() {
    const data = extractProjectData(document);
    const text = [
      `CAAE: ${data.caae ?? 'N/A'}`,
      `Título: ${data.titulo ?? 'N/A'}`,
      `Pesquisador Responsável: ${data.pesquisador ?? 'N/A'}`,
      `Área Temática: ${data.areaTematica ?? 'N/A'}`,
      `Patrocinador Principal: ${data.patrocinador ?? 'N/A'}`,
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

  async function actionAumentarQuadro() {
    const res = await fetch(CONFIG_URL);
    const rules = await res.json();
    const rules_aq = rules.filter(r => r.trigger === 'aumentarQuadro');

    rules_aq.forEach(({ selector, attributes }) => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.pbEnlarged === 'true') {
          Object.keys(attributes).forEach(attr => el.removeAttribute(attr));
          delete el.dataset.pbEnlarged;
        } else {
          Object.entries(attributes).forEach(([attr, val]) => el.setAttribute(attr, val));
          el.dataset.pbEnlarged = 'true';
        }
      });
    });

    const enlarged = rules_aq.some(({ selector }) =>
      [...document.querySelectorAll(selector)].some(el => el.dataset.pbEnlarged === 'true')
    );

    if (enlarged) injectLayoutStyles(); else removeLayoutStyles();

    return { ok: true, enlarged };
  }

  function actionAbrirArvore() {
    let count = 0;
    document.querySelectorAll('.rich-tree-node-handle').forEach(handle => {
      const collapsed = handle.querySelector('.rich-tree-node-handleicon-collapsed');
      if (collapsed && collapsed.style.display !== 'none') {
        handle.click();
        count++;
      }
    });
    return { ok: true, count };
  }

  function findNotificacaoBtn(doc) {
    const table = doc.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
    if (!table) return null;
    return table.querySelector('a img[src*="ico_notificar.png"]')?.closest('a') ?? null;
  }

  function findFastforwardBtn(doc) {
    const table = doc.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
    if (!table) return null;
    return table.querySelector('td.rich-datascr-button[onclick*="fastforward"]') ?? null;
  }

  function waitForTableChange(tableEl, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout aguardando atualização da tabela'));
      }, timeout);
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      });
      observer.observe(tableEl, { childList: true, subtree: true });
    });
  }

  async function actionSubmeterNotificacao() {
    const MAX_PAGES = 50;
    for (let i = 0; i < MAX_PAGES; i++) {
      const btn = findNotificacaoBtn(document);
      if (btn) {
        btn.click();
        return { ok: true };
      }
      const ffBtn = findFastforwardBtn(document);
      if (!ffBtn) {
        return { ok: false, error: 'Botão de notificação não encontrado' };
      }
      const table = document.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
      ffBtn.click();
      await waitForTableChange(table);
    }
    return { ok: false, error: 'Botão de notificação não encontrado após percorrer todas as páginas' };
  }

  // ── Listener ──────────────────────────────────────────────────────────

  const ACTIONS = {
    copyData:             actionCopyData,
    togglePanels:         actionTogglePanels,
    toggleReadMode:       actionToggleReadMode,
    aumentarQuadro:       actionAumentarQuadro,
    abrirArvore:          actionAbrirArvore,
    submeterNotificacao:  actionSubmeterNotificacao,
  };

  applyAttributeConfig(CONFIG_URL, document, 'load').catch(() => {});

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const fn = ACTIONS[msg.action];
    if (!fn) {
      sendResponse({ ok: false, error: `Ação desconhecida: ${msg.action}` });
      return;
    }
    Promise.resolve()
      .then(() => fn())
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // mantém canal aberto para resposta async
  });
})();
