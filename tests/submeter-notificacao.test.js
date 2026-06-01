// tests/submeter-notificacao.test.js
// Testa a lógica dos helpers findNotificacaoBtn e findFastforwardBtn

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

afterEach(() => jest.restoreAllMocks());

describe('findNotificacaoBtn(doc)', () => {
  test('retorna anchor <a> quando botão está presente na tabela', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tr><td>
          <a href="#" title="Enviar Notificação">
            <img src="/common/images/ico_notificar.png" alt="Enviar Notificação">
          </a>
        </td></tr>
      </table>
    `;
    const btn = findNotificacaoBtn(document);
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('A');
    expect(btn.querySelector('img')).not.toBeNull();
  });

  test('retorna null quando botão está ausente (tabela existe mas sem img)', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tr><td>Sem botão de notificação</td></tr>
      </table>
    `;
    const btn = findNotificacaoBtn(document);
    expect(btn).toBeNull();
  });

  test('retorna null quando tabela está ausente do DOM', () => {
    document.body.innerHTML = `<div>Página sem tabela</div>`;
    const btn = findNotificacaoBtn(document);
    expect(btn).toBeNull();
  });
});

describe('findFastforwardBtn(doc)', () => {
  test('retorna <td> quando botão fastforward está presente e ativo', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tfoot>
          <td class=" rich-datascr-button" onclick="Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});">»</td>
        </tfoot>
      </table>
    `;
    const btn = findFastforwardBtn(document);
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('TD');
    expect(btn.className).toContain('rich-datascr-button');
    expect(btn.getAttribute('onclick')).toContain('fastforward');
  });

  test('retorna null quando botão fastforward está desativado (classe dsbld, sem onclick)', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tfoot>
          <td class=" rich-datascr-button-dsbld rich-datascr-button">»</td>
        </tfoot>
      </table>
    `;
    const btn = findFastforwardBtn(document);
    expect(btn).toBeNull();
  });

  test('retorna null quando tabela está ausente do DOM', () => {
    document.body.innerHTML = `<div>Página sem tabela</div>`;
    const btn = findFastforwardBtn(document);
    expect(btn).toBeNull();
  });
});

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

describe('waitForTableChange', () => {
  test('resolve após debounce quando DOM da tabela muda', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody id="tbody"></tbody>
      </table>`;
    const table = document.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
    const p = waitForTableChange(table, 1000, 10);
    document.getElementById('tbody').innerHTML = '<tr><td>novo</td></tr>';
    await expect(p).resolves.toBeUndefined();
  });

  test('resolve apenas após mutações pararem (debounce)', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody id="tbody"></tbody>
      </table>`;
    const table = document.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
    const p = waitForTableChange(table, 1000, 30);
    // múltiplas mutações rápidas (simula RichFaces: limpa rows, depois renderiza)
    document.getElementById('tbody').innerHTML = '';
    document.getElementById('tbody').innerHTML = '<tr><td>página 2</td></tr>';
    await expect(p).resolves.toBeUndefined();
  });

  test('rejeita após timeout sem mutação', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody></tbody>
      </table>`;
    const table = document.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
    await expect(waitForTableChange(table, 50, 10)).rejects.toThrow('Timeout aguardando atualização da tabela');
  });
});

// ── actionSubmeterNotificacao replica ──────────────────────────────────────

async function actionSubmeterNotificacao(doc, waitFn, maxPages = 50) {
  for (let i = 0; i < maxPages; i++) {
    const btn = findNotificacaoBtn(doc);
    if (btn) {
      btn.click();
      return { ok: true };
    }
    const ffBtn = findFastforwardBtn(doc);
    if (!ffBtn) {
      return { ok: false, error: 'Botão de notificação não encontrado' };
    }
    ffBtn.click();
    const loaded = await waitFn(doc);
    if (!loaded) {
      return { ok: false, error: 'Timeout aguardando carregamento da página' };
    }
  }
  return { ok: false, error: 'Botão de notificação não encontrado após percorrer todas as páginas' };
}

// waitFn que simula página carregada imediatamente
const waitImmediate = () => Promise.resolve(true);

describe('actionSubmeterNotificacao', () => {
  beforeEach(() => {
    // Event.fire is a Prototype.js method not available in jsdom
    global.Event = global.Event || {};
    if (!global.Event.fire) global.Event.fire = () => {};
  });

  test('clica no botão de notificação quando presente na primeira página', async () => {
    let clicked = false;
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody>
          <tr><td>
            <a href="#" title="Enviar Notificação" id="notif-btn">
              <img src="/common/images/ico_notificar.png">
            </a>
          </td></tr>
        </tbody>
      </table>`;
    document.getElementById('notif-btn').addEventListener('click', () => { clicked = true; });
    const result = await actionSubmeterNotificacao(document, waitImmediate);
    expect(result).toEqual({ ok: true });
    expect(clicked).toBe(true);
  });

  test('pagina com fastforward e clica no botão na segunda página', async () => {
    let ffClicked = false;
    let notifClicked = false;

    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody id="tbody-principal">
          <tr><td>Sem notificação</td></tr>
        </tbody>
        <tfoot>
          <td class=" rich-datascr-button" id="ff-btn">»</td>
        </tfoot>
      </table>`;

    document.getElementById('ff-btn').setAttribute(
      'onclick',
      "Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});"
    );

    const ffBtn = document.getElementById('ff-btn');
    ffBtn.addEventListener('click', () => {
      ffClicked = true;
      document.getElementById('tbody-principal').innerHTML = `
        <tr><td>
          <a href="#" title="Enviar Notificação" id="notif-btn">
            <img src="/common/images/ico_notificar.png">
          </a>
        </td></tr>`;
      document.getElementById('notif-btn').addEventListener('click', () => { notifClicked = true; });
    });

    const result = await actionSubmeterNotificacao(document, waitImmediate);
    expect(result).toEqual({ ok: true });
    expect(ffClicked).toBe(true);
    expect(notifClicked).toBe(true);
  });

  test('retorna erro quando fastforward ausente e botão não encontrado', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody>
          <tr><td>Sem nada</td></tr>
        </tbody>
      </table>`;
    const result = await actionSubmeterNotificacao(document, waitImmediate);
    expect(result).toEqual({ ok: false, error: 'Botão de notificação não encontrado' });
  });

  test('retorna erro quando página não carrega dentro do timeout', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody><tr><td>Sem notificação</td></tr></tbody>
        <tfoot>
          <td class=" rich-datascr-button" id="ff-btn">»</td>
        </tfoot>
      </table>`;
    document.getElementById('ff-btn').setAttribute(
      'onclick',
      "Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});"
    );
    const waitTimeout = () => Promise.resolve(false);
    const result = await actionSubmeterNotificacao(document, waitTimeout);
    expect(result).toEqual({ ok: false, error: 'Timeout aguardando carregamento da página' });
  });

  test('retorna erro após percorrer maxPages sem encontrar botão', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody><tr><td>Sem notificação</td></tr></tbody>
        <tfoot>
          <td class=" rich-datascr-button" id="ff-btn">»</td>
        </tfoot>
      </table>`;
    document.getElementById('ff-btn').setAttribute(
      'onclick',
      "Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});"
    );
    const result = await actionSubmeterNotificacao(document, waitImmediate, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/percorrer todas as páginas/);
  });
});
