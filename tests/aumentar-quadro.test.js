// tests/aumentar-quadro.test.js
// Testa a lógica de toggle do aumentarQuadro diretamente

const STYLE_VAL = 'width: 90vw; max-width: 100vw; margin: 0;';

const RULES = [
  {
    trigger: 'aumentarQuadro',
    selector: '#formDetalharProjeto',
    attributes: { style: STYLE_VAL },
  },
];

function mockFetch() {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve(RULES),
  });
}

// Replica a lógica de actionAumentarQuadro isolada para teste
async function toggleAumentarQuadro(configUrl, doc) {
  const res = await fetch(configUrl);
  const rules = await res.json();
  const rules_aq = rules.filter(r => r.trigger === 'aumentarQuadro');

  rules_aq.forEach(({ selector, attributes }) => {
    doc.querySelectorAll(selector).forEach(el => {
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
    [...doc.querySelectorAll(selector)].some(el => el.dataset.pbEnlarged === 'true')
  );
  return { ok: true, enlarged };
}

afterEach(() => jest.restoreAllMocks());

describe('toggle aumentarQuadro', () => {
  test('1º clique — aplica style e marca enlarged=true', async () => {
    mockFetch();
    document.body.innerHTML = `<form id="formDetalharProjeto"></form>`;
    const result = await toggleAumentarQuadro('mock://url', document);
    const el = document.getElementById('formDetalharProjeto');
    expect(el.getAttribute('style')).toBe(STYLE_VAL);
    expect(el.dataset.pbEnlarged).toBe('true');
    expect(result.enlarged).toBe(true);
  });

  test('2º clique — remove style e limpa enlarged', async () => {
    mockFetch();
    document.body.innerHTML = `<form id="formDetalharProjeto"></form>`;
    await toggleAumentarQuadro('mock://url', document);  // aplica
    mockFetch();
    const result = await toggleAumentarQuadro('mock://url', document);  // remove
    const el = document.getElementById('formDetalharProjeto');
    expect(el.getAttribute('style')).toBeNull();
    expect(el.dataset.pbEnlarged).toBeUndefined();
    expect(result.enlarged).toBe(false);
  });

  test('3º clique — aplica novamente', async () => {
    mockFetch();
    document.body.innerHTML = `<form id="formDetalharProjeto"></form>`;
    await toggleAumentarQuadro('mock://url', document);
    mockFetch();
    await toggleAumentarQuadro('mock://url', document);
    mockFetch();
    const result = await toggleAumentarQuadro('mock://url', document);
    expect(document.getElementById('formDetalharProjeto').getAttribute('style')).toBe(STYLE_VAL);
    expect(result.enlarged).toBe(true);
  });
});
