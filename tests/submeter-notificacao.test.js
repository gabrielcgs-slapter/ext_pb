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
