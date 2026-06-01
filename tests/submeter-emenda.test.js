// tests/submeter-emenda.test.js

function findEmendaBtn(doc) {
  const table = doc.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
  if (!table) return null;
  return table.querySelector('a[title="Submeter Emenda"]') ?? null;
}

function findFastforwardBtn(doc) {
  const table = doc.querySelector('#formDetalharProjeto\\:tabelaApreciacoesProjetos');
  if (!table) return null;
  return table.querySelector('td.rich-datascr-button[onclick*="fastforward"]') ?? null;
}

afterEach(() => jest.restoreAllMocks());

describe('findEmendaBtn(doc)', () => {
  test('retorna anchor <a> quando botão está presente na tabela', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tr><td>
          <a href="#" title="Submeter Emenda">
            <img src="/common/images/ico_adicionar.png" alt="Submeter Emenda">
          </a>
        </td></tr>
      </table>`;
    const btn = findEmendaBtn(document);
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('A');
    expect(btn.title).toBe('Submeter Emenda');
  });

  test('retorna null quando botão está ausente (tabela existe mas sem link)', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tr><td>Sem botão de emenda</td></tr>
      </table>`;
    expect(findEmendaBtn(document)).toBeNull();
  });

  test('não confunde com outros links da tabela (title diferente)', () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tr><td>
          <a href="#" title="Enviar Notificação">
            <img src="/common/images/ico_notificar.png">
          </a>
        </td></tr>
      </table>`;
    expect(findEmendaBtn(document)).toBeNull();
  });

  test('retorna null quando tabela está ausente do DOM', () => {
    document.body.innerHTML = '<div>Página sem tabela</div>';
    expect(findEmendaBtn(document)).toBeNull();
  });
});

// ── actionSubmeterEmenda replica ───────────────────────────────────────────

async function actionSubmeterEmenda(doc, waitFn, maxPages = 50) {
  for (let i = 0; i < maxPages; i++) {
    const btn = findEmendaBtn(doc);
    if (btn) {
      btn.click();
      return { ok: true };
    }
    const ffBtn = findFastforwardBtn(doc);
    if (!ffBtn) {
      return { ok: false, error: 'Botão de submeter emenda não encontrado' };
    }
    ffBtn.click();
    const loaded = await waitFn(doc);
    if (!loaded) {
      return { ok: false, error: 'Timeout aguardando carregamento da página' };
    }
  }
  return { ok: false, error: 'Botão de submeter emenda não encontrado após percorrer todas as páginas' };
}

const waitImmediate = () => Promise.resolve(true);

describe('actionSubmeterEmenda', () => {
  beforeEach(() => {
    global.Event = global.Event || {};
    if (!global.Event.fire) global.Event.fire = () => {};
  });

  test('clica no botão de emenda quando presente na primeira página', async () => {
    let clicked = false;
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody>
          <tr><td>
            <a href="#" title="Submeter Emenda" id="emenda-btn">
              <img src="/common/images/ico_adicionar.png">
            </a>
          </td></tr>
        </tbody>
      </table>`;
    document.getElementById('emenda-btn').addEventListener('click', () => { clicked = true; });
    const result = await actionSubmeterEmenda(document, waitImmediate);
    expect(result).toEqual({ ok: true });
    expect(clicked).toBe(true);
  });

  test('pagina com fastforward e clica no botão na segunda página', async () => {
    let ffClicked = false;
    let emendaClicked = false;

    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody id="tbody-principal">
          <tr><td>Sem emenda</td></tr>
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
          <a href="#" title="Submeter Emenda" id="emenda-btn">
            <img src="/common/images/ico_adicionar.png">
          </a>
        </td></tr>`;
      document.getElementById('emenda-btn').addEventListener('click', () => { emendaClicked = true; });
    });

    const result = await actionSubmeterEmenda(document, waitImmediate);
    expect(result).toEqual({ ok: true });
    expect(ffClicked).toBe(true);
    expect(emendaClicked).toBe(true);
  });

  test('retorna erro quando fastforward ausente e botão não encontrado', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody><tr><td>Sem nada</td></tr></tbody>
      </table>`;
    const result = await actionSubmeterEmenda(document, waitImmediate);
    expect(result).toEqual({ ok: false, error: 'Botão de submeter emenda não encontrado' });
  });

  test('retorna erro quando página não carrega dentro do timeout', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody><tr><td>Sem emenda</td></tr></tbody>
        <tfoot>
          <td class=" rich-datascr-button" id="ff-btn">»</td>
        </tfoot>
      </table>`;
    document.getElementById('ff-btn').setAttribute(
      'onclick',
      "Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});"
    );
    const waitTimeout = () => Promise.resolve(false);
    const result = await actionSubmeterEmenda(document, waitTimeout);
    expect(result).toEqual({ ok: false, error: 'Timeout aguardando carregamento da página' });
  });

  test('retorna erro após percorrer maxPages sem encontrar botão', async () => {
    document.body.innerHTML = `
      <table id="formDetalharProjeto:tabelaApreciacoesProjetos">
        <tbody><tr><td>Sem emenda</td></tr></tbody>
        <tfoot>
          <td class=" rich-datascr-button" id="ff-btn">»</td>
        </tfoot>
      </table>`;
    document.getElementById('ff-btn').setAttribute(
      'onclick',
      "Event.fire(this, 'rich:datascroller:onscroll', {'page': 'fastforward'});"
    );
    const result = await actionSubmeterEmenda(document, waitImmediate, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/percorrer todas as páginas/);
  });
});
