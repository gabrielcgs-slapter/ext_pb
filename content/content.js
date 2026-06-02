// content/content.js
// extractor.js já foi injetado antes (manifest content_scripts order)

(function () {
  if (window.__pbLoaded) return;
  window.__pbLoaded = true;

  // ── Constantes de polling ──────────────────────────────────────────────
  const POLL_TIMEOUT  = 30000;
  const POLL_INTERVAL = 300;
  const INITIAL_DELAY = 500;
  const MAX_PAGES     = 50;

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

  async function actionCopyData() {
    const data = extractProjectData(document);
    const text = [
      `CAAE: ${data.caae ?? 'N/A'}`,
      `Título: ${data.titulo ?? 'N/A'}`,
      `Pesquisador Responsável: ${data.pesquisador ?? 'N/A'}`,
      `Área Temática: ${data.areaTematica ?? 'N/A'}`,
      `Patrocinador Principal: ${data.patrocinador ?? 'N/A'}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
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
    return doc.querySelector('a[title="Enviar Notificação"]') ?? null;
  }

  function findPaginacaoBtn(doc) {
    return doc.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos\\:j_id286') ?? null;
  }

  // eslint-disable-next-line no-unused-vars -- usada em tests/submeter-notificacao.test.js
  function waitForTableChange(tableEl, timeout = 5000, debounce = 300) {
    return new Promise((resolve, reject) => {
      let debounceTimer;
      const globalTimer = setTimeout(() => {
        clearTimeout(debounceTimer);
        observer.disconnect();
        reject(new Error('Timeout aguardando atualização da tabela'));
      }, timeout);
      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          clearTimeout(globalTimer);
          observer.disconnect();
          resolve();
        }, debounce);
      });
      observer.observe(tableEl, { childList: true, subtree: true });
    });
  }

  function findEmendaBtn(doc) {
    return doc.querySelector('a[title="Submeter Emenda"]') ?? null;
  }

  async function actionSubmeterEmenda() {
    for (let i = 0; i < MAX_PAGES; i++) {
      const btn = findEmendaBtn(document);
      if (btn) {
        btn.click();
        return { ok: true };
      }
      const pgBtn = findPaginacaoBtn(document);
      if (!pgBtn) {
        return { ok: false, error: 'Botão de submeter emenda não encontrado' };
      }
      pgBtn.click();

      const loaded = await new Promise(resolve => {
        const maxAttempts = Math.ceil(POLL_TIMEOUT / POLL_INTERVAL);
        let attempts = 0;
        setTimeout(() => {
          const timer = setInterval(() => {
            if (findEmendaBtn(document) || findPaginacaoBtn(document)) {
              clearInterval(timer);
              resolve(true);
            } else if (++attempts >= maxAttempts) {
              clearInterval(timer);
              resolve(false);
            }
          }, POLL_INTERVAL);
        }, INITIAL_DELAY);
      });

      if (!loaded) {
        return { ok: false, error: 'Timeout aguardando carregamento da página' };
      }
    }
    return { ok: false, error: 'Botão de submeter emenda não encontrado após percorrer todas as páginas' };
  }

  const PB_PENDING_DETALHAR = 'pb_pendingDetalhar';

  async function actionBuscarProjeto({ caae }) {
    const field = document.getElementById('gerirPesquisaForm:nuCAEE');
    if (!field) return { ok: false, error: 'Campo CAAE não encontrado' };

    const btn = document.getElementById('gerirPesquisaForm:idBtnBuscarProjPesquisa');
    if (!btn) return { ok: false, error: 'Botão de busca não encontrado' };

    field.value = caae;
    field.dispatchEvent(new Event('change'));

    // Flag set before click — survives full-page navigation (sessionStorage is tab-scoped)
    sessionStorage.setItem(PB_PENDING_DETALHAR, '1');
    btn.click();

    // If search triggers full reload, script dies here and flag is picked up on new load.
    // If search is AJAX, polling below finds Detalhar on same page.
    const found = await new Promise(resolve => {
      const maxAttempts = Math.ceil(POLL_TIMEOUT / POLL_INTERVAL);
      let attempts = 0;
      setTimeout(() => {
        const timer = setInterval(() => {
          const detalhar = document.querySelector('[title="Detalhar"]');
          if (detalhar) {
            clearInterval(timer);
            sessionStorage.removeItem(PB_PENDING_DETALHAR);
            detalhar.click();
            resolve(true);
          } else if (++attempts >= maxAttempts) {
            clearInterval(timer);
            resolve(false);
          }
        }, POLL_INTERVAL);
      }, 800); // initial delay maior para aguardar resposta do servidor
    });

    if (!found) {
      sessionStorage.removeItem(PB_PENDING_DETALHAR);
      return { ok: false, error: 'Botão Detalhar não encontrado após busca' };
    }
    return { ok: true };
  }

  async function actionSubmeterNotificacao() {
    for (let i = 0; i < MAX_PAGES; i++) {
      const btn = findNotificacaoBtn(document);
      if (btn) {
        btn.click();
        return { ok: true };
      }
      const pgBtn = findPaginacaoBtn(document);
      if (!pgBtn) {
        return { ok: false, error: 'Botão de notificação não encontrado' };
      }
      pgBtn.click();

      const loaded = await new Promise(resolve => {
        const maxAttempts = Math.ceil(POLL_TIMEOUT / POLL_INTERVAL);
        let attempts = 0;
        setTimeout(() => {
          const timer = setInterval(() => {
            if (findNotificacaoBtn(document) || findPaginacaoBtn(document)) {
              clearInterval(timer);
              resolve(true);
            } else if (++attempts >= maxAttempts) {
              clearInterval(timer);
              resolve(false);
            }
          }, POLL_INTERVAL);
        }, INITIAL_DELAY);
      });

      if (!loaded) {
        return { ok: false, error: 'Timeout aguardando carregamento da página' };
      }
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
    submeterEmenda:       actionSubmeterEmenda,
    buscarProjeto:        actionBuscarProjeto,
  };

  applyAttributeConfig(CONFIG_URL, document, 'load').catch(() => {});

  // Auto-click Detalhar if a buscarProjeto triggered full-page navigation
  if (sessionStorage.getItem(PB_PENDING_DETALHAR)) {
    sessionStorage.removeItem(PB_PENDING_DETALHAR);
    const _deadline = Date.now() + 15000;
    setTimeout(function _checkDetalhar() {
      const detalhar = document.querySelector('[title="Detalhar"]');
      if (detalhar) { detalhar.click(); return; }
      if (Date.now() < _deadline) setTimeout(_checkDetalhar, 300);
    }, 500);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    const fn = ACTIONS[msg.action];
    if (!fn) {
      sendResponse({ ok: false, error: `Ação desconhecida: ${msg.action}` });
      return;
    }
    Promise.resolve()
      .then(() => fn(msg))
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // mantém canal aberto para resposta async
  });
})();
