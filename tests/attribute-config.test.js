// tests/attribute-config.test.js
const { applyAttributeConfig } = require('../content/attribute-config');
const fs = require('fs');
const path = require('path');

const RULES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/attributes.json'), 'utf8')
);

function mockFetch(rules) {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve(rules),
  });
}

function makeDoc(html) {
  document.body.innerHTML = html;
  return document;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('applyAttributeConfig — trigger=load', () => {
  test('aplica atributos em trâmites (data-pb-tramite)', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`
      <table>
        <tbody id="formDetalharProjeto:tableTramiteApreciacaoProjeto:tb">
          <tr class="rich-table-row"><td>linha 1</td></tr>
          <tr class="rich-table-row"><td>linha 2</td></tr>
        </tbody>
      </table>
    `);
    await applyAttributeConfig('mock://url', doc, 'load');
    const rows = doc.querySelectorAll('.rich-table-row');
    rows.forEach(tr => {
      expect(tr.getAttribute('data-pb-tramite')).toBe('true');
    });
  });

  test('aplica atributos em painéis (data-pb-panel)', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`
      <div class="rich-stglpanel-header">Painel A</div>
      <div class="rich-stglpanel-header">Painel B</div>
    `);
    await applyAttributeConfig('mock://url', doc, 'load');
    const panels = doc.querySelectorAll('.rich-stglpanel-header');
    panels.forEach(el => {
      expect(el.getAttribute('data-pb-panel')).toBe('true');
    });
  });

  test('aplica atributos em #detalheUsuario (data-pb-role)', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`<div id="detalheUsuario">Usuário X</div>`);
    await applyAttributeConfig('mock://url', doc, 'load');
    expect(doc.getElementById('detalheUsuario').getAttribute('data-pb-role')).toBe('user-info');
  });

  test('NÃO aplica regras de outros triggers', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`<form id="formDetalharProjeto"></form>`);
    await applyAttributeConfig('mock://url', doc, 'load');
    expect(doc.getElementById('formDetalharProjeto').getAttribute('style')).toBeNull();
  });
});

describe('applyAttributeConfig — trigger=aumentarQuadro', () => {
  test('adiciona style em #formDetalharProjeto', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`<form id="formDetalharProjeto"></form>`);
    await applyAttributeConfig('mock://url', doc, 'aumentarQuadro');
    const style = doc.getElementById('formDetalharProjeto').getAttribute('style');
    expect(style).toContain('90vw');
    expect(style).toContain('-50vw');
  });

  test('NÃO aplica regras de trigger=load', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`
      <form id="formDetalharProjeto"></form>
      <div class="rich-stglpanel-header"></div>
    `);
    await applyAttributeConfig('mock://url', doc, 'aumentarQuadro');
    expect(doc.querySelector('.rich-stglpanel-header').getAttribute('data-pb-panel')).toBeNull();
  });
});

describe('applyAttributeConfig — sem trigger', () => {
  test('aplica todas as regras sem filtro', async () => {
    mockFetch(RULES);
    const doc = makeDoc(`
      <form id="formDetalharProjeto"></form>
      <div class="rich-stglpanel-header"></div>
    `);
    await applyAttributeConfig('mock://url', doc);
    expect(doc.getElementById('formDetalharProjeto').getAttribute('style')).toContain('90vw');
    expect(doc.querySelector('.rich-stglpanel-header').getAttribute('data-pb-panel')).toBe('true');
  });
});

describe('applyAttributeConfig — casos gerais', () => {
  test('não falha se seletor não encontrar elemento', async () => {
    mockFetch(RULES);
    const doc = makeDoc('<p>DOM vazio</p>');
    await expect(applyAttributeConfig('mock://url', doc, 'load')).resolves.not.toThrow();
  });

  test('aplica múltiplos atributos na mesma regra', async () => {
    const rules = [
      {
        trigger: 'load',
        selector: '.alvo',
        attributes: { 'data-a': 'x', 'data-b': 'y' },
      },
    ];
    mockFetch(rules);
    const doc = makeDoc('<span class="alvo"></span>');
    await applyAttributeConfig('mock://url', doc, 'load');
    const el = doc.querySelector('.alvo');
    expect(el.getAttribute('data-a')).toBe('x');
    expect(el.getAttribute('data-b')).toBe('y');
  });
});
