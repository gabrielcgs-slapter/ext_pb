// tests/acoes-dom.test.js
// Testes para actionTogglePanels, actionToggleReadMode, actionAbrirArvore, actionCopyData

// ── Helpers de setup ──────────────────────────────────────────────────────

function makePanel(id) {
  const header = document.createElement('div');
  header.className = 'rich-stglpanel-header';
  header.id = id;
  return header;
}

function makeTreeHandle(collapsed) {
  const handle = document.createElement('span');
  handle.className = 'rich-tree-node-handle';
  const icon = document.createElement('span');
  icon.className = 'rich-tree-node-handleicon-collapsed';
  icon.style.display = collapsed ? 'block' : 'none';
  handle.appendChild(icon);
  return handle;
}

// ── actionTogglePanels ────────────────────────────────────────────────────

function actionTogglePanels() {
  const panels = document.querySelectorAll('.rich-stglpanel-header');
  panels.forEach(header => header.click());
  return { ok: true, count: panels.length };
}

describe('actionTogglePanels', () => {
  test('clica em todos os painéis e retorna contagem', () => {
    const clicks = [];
    const p1 = makePanel('p1');
    const p2 = makePanel('p2');
    p1.addEventListener('click', () => clicks.push('p1'));
    p2.addEventListener('click', () => clicks.push('p2'));
    document.body.appendChild(p1);
    document.body.appendChild(p2);

    const result = actionTogglePanels();

    expect(result).toEqual({ ok: true, count: 2 });
    expect(clicks).toEqual(['p1', 'p2']);
    document.body.innerHTML = '';
  });

  test('retorna count 0 quando não há painéis', () => {
    document.body.innerHTML = '';
    const result = actionTogglePanels();
    expect(result).toEqual({ ok: true, count: 0 });
  });
});

// ── actionToggleReadMode ──────────────────────────────────────────────────

const NAV_IDS = [
  'barra-brasil', 'barraSistemaSup', 'barraSistemaInf',
  'barraMenu', 'wrapper-clock-count', 'barraSuperior',
];

function actionToggleReadMode() {
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

describe('actionToggleReadMode', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('oculta elementos de navegação na primeira chamada', () => {
    const el = document.createElement('div');
    el.id = 'barraMenu';
    el.style.display = 'block';
    document.body.appendChild(el);

    const result = actionToggleReadMode();

    expect(result).toEqual({ ok: true, hidden: true });
    expect(el.style.display).toBe('none');
    expect(el.dataset.pbHidden).toBe('true');
  });

  test('restaura elementos na segunda chamada (toggle)', () => {
    const el = document.createElement('div');
    el.id = 'barraMenu';
    el.style.display = 'block';
    document.body.appendChild(el);

    actionToggleReadMode(); // esconde
    const result = actionToggleReadMode(); // restaura

    expect(result).toEqual({ ok: true, hidden: false });
    expect(el.style.display).toBe('block');
    expect(el.dataset.pbHidden).toBeUndefined();
  });

  test('ignora IDs ausentes no DOM sem erro', () => {
    document.body.innerHTML = '';
    const result = actionToggleReadMode();
    expect(result).toEqual({ ok: true, hidden: false });
  });
});

// ── actionAbrirArvore ─────────────────────────────────────────────────────

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

describe('actionAbrirArvore', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  test('clica apenas nos nós colapsados', () => {
    const clicks = [];
    const collapsed = makeTreeHandle(true);
    const expanded  = makeTreeHandle(false);
    collapsed.addEventListener('click', () => clicks.push('collapsed'));
    expanded.addEventListener('click',  () => clicks.push('expanded'));
    document.body.appendChild(collapsed);
    document.body.appendChild(expanded);

    const result = actionAbrirArvore();

    expect(result).toEqual({ ok: true, count: 1 });
    expect(clicks).toEqual(['collapsed']);
  });

  test('retorna count 0 quando não há nós colapsados', () => {
    document.body.appendChild(makeTreeHandle(false));
    const result = actionAbrirArvore();
    expect(result).toEqual({ ok: true, count: 0 });
  });

  test('retorna count 0 quando não há handles na página', () => {
    const result = actionAbrirArvore();
    expect(result).toEqual({ ok: true, count: 0 });
  });
});

// ── actionCopyData (lógica de extração) ──────────────────────────────────

// Replica apenas a lógica de formatação — a cópia em si depende de clipboard API
function buildCopyText(data) {
  return [
    `CAAE: ${data.caae ?? 'N/A'}`,
    `Título: ${data.titulo ?? 'N/A'}`,
    `Pesquisador Responsável: ${data.pesquisador ?? 'N/A'}`,
    `Área Temática: ${data.areaTematica ?? 'N/A'}`,
    `Patrocinador Principal: ${data.patrocinador ?? 'N/A'}`,
  ].join('\n');
}

describe('buildCopyText (formatação dos dados extraídos)', () => {
  test('formata campos presentes corretamente', () => {
    const text = buildCopyText({
      caae: '12345678.1.0001.5000',
      titulo: 'Estudo X',
      pesquisador: 'Dr. Silva',
      areaTematica: 'Oncologia',
      patrocinador: 'Fiocruz',
    });
    expect(text).toContain('CAAE: 12345678.1.0001.5000');
    expect(text).toContain('Título: Estudo X');
    expect(text).toContain('Pesquisador Responsável: Dr. Silva');
    expect(text).toContain('Área Temática: Oncologia');
    expect(text).toContain('Patrocinador Principal: Fiocruz');
  });

  test('substitui campos ausentes por N/A', () => {
    const text = buildCopyText({ caae: null, titulo: undefined });
    expect(text).toContain('CAAE: N/A');
    expect(text).toContain('Título: N/A');
    expect(text).toContain('Pesquisador Responsável: N/A');
  });
});
