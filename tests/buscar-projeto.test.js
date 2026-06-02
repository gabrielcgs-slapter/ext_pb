// tests/buscar-projeto.test.js

// Inline da função (padrão do projeto — ver tests/submeter-emenda.test.js)
async function actionBuscarProjeto(msg, doc = document) {
  const POLL_INTERVAL = 50;
  const maxWait = msg._maxWait !== undefined ? msg._maxWait : 5000;

  const field = doc.getElementById('gerirPesquisaForm:nuCAEE');
  if (!field) return { ok: false, error: 'Campo CAAE não encontrado' };

  field.value = msg.caae;
  field.dispatchEvent(new Event('change'));

  const btn = doc.getElementById('gerirPesquisaForm:idBtnBuscarProjPesquisa');
  if (!btn) return { ok: false, error: 'Botão de busca não encontrado' };
  btn.click();

  const found = await new Promise(resolve => {
    const deadline = Date.now() + maxWait;
    function check() {
      const detalhar = doc.querySelector('[title="Detalhar"]');
      if (detalhar) { detalhar.click(); return resolve(true); }
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(check, POLL_INTERVAL);
    }
    setTimeout(check, 0);
  });

  if (!found) return { ok: false, error: 'Botão Detalhar não encontrado após busca' };
  return { ok: true };
}

describe('actionBuscarProjeto', () => {
  test('preenche CAAE, clica buscar e clica Detalhar quando aparece', async () => {
    let searchClicked = false;
    let detalharClicked = false;

    document.body.innerHTML = `
      <input id="gerirPesquisaForm:nuCAEE" type="text" />
      <button id="gerirPesquisaForm:idBtnBuscarProjPesquisa">Buscar</button>
    `;

    document.getElementById('gerirPesquisaForm:idBtnBuscarProjPesquisa')
      .addEventListener('click', () => {
        searchClicked = true;
        const a = document.createElement('a');
        a.setAttribute('title', 'Detalhar');
        a.addEventListener('click', () => { detalharClicked = true; });
        document.body.appendChild(a);
      });

    const result = await actionBuscarProjeto({ caae: '66068322.1.1001.5262' });
    expect(result).toEqual({ ok: true });
    expect(document.getElementById('gerirPesquisaForm:nuCAEE').value).toBe('66068322.1.1001.5262');
    expect(searchClicked).toBe(true);
    expect(detalharClicked).toBe(true);
  });

  test('retorna erro quando campo CAAE não existe', async () => {
    document.body.innerHTML = '<div>Página errada</div>';
    const result = await actionBuscarProjeto({ caae: '123' });
    expect(result).toEqual({ ok: false, error: 'Campo CAAE não encontrado' });
  });

  test('retorna erro quando botão de busca não existe', async () => {
    document.body.innerHTML = `<input id="gerirPesquisaForm:nuCAEE" type="text" />`;
    const result = await actionBuscarProjeto({ caae: '123' });
    expect(result).toEqual({ ok: false, error: 'Botão de busca não encontrado' });
  });

  test('retorna erro quando Detalhar não aparece no timeout', async () => {
    document.body.innerHTML = `
      <input id="gerirPesquisaForm:nuCAEE" type="text" />
      <button id="gerirPesquisaForm:idBtnBuscarProjPesquisa">Buscar</button>
    `;
    const result = await actionBuscarProjeto({ caae: '123', _maxWait: 0 });
    expect(result).toEqual({ ok: false, error: 'Botão Detalhar não encontrado após busca' });
  });
});
