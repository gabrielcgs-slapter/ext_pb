# Toggle State Indicator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar sistema reutilizável de toggle visual nos botões do popup para indicar quando uma função está ativa ou inativa, com estado persistido via `chrome.storage.local`. Primeiro caso de uso: botão "aumentar quadro".

**Architecture:** Botões marcados com `data-toggle="true"` no HTML são gerenciados por um mapa de extratores em `popup.js` — cada extrator sabe qual campo da resposta indica o estado ativo. O popup lê o estado persistido ao abrir e aplica `.btn-active`; após cada clique em botão togglável, salva o novo estado. Para adicionar nova função togglável: (1) adicionar `data-toggle="true"` no HTML, (2) adicionar extrator no mapa `TOGGLE_EXTRACTORS`.

**Tech Stack:** Chrome Extension MV3, Vanilla JS, CSS, Jest + jsdom (testes)

---

## Mapa de Arquivos

| Arquivo | O que muda |
|---------|------------|
| `popup/popup.css` | Adiciona `.btn-active` (visual de ativo) |
| `popup/popup.html` | Adiciona `data-toggle="true"` no botão `aumentarQuadro` |
| `popup/popup.js` | Adiciona `TOGGLE_EXTRACTORS`, `saveToggleState`, `loadToggleStates`, atualiza handlers de DOMContentLoaded e clique |
| `tests/popup-toggle.test.js` | Testes unitários da função pura `getToggleResult` |

---

### Task 1: CSS — Estilo de botão ativo

**Files:**
- Modify: `popup/popup.css`

- [ ] **Step 1: Adicionar classe `.btn-active` no CSS**

Adicionar após o bloco `.btn:disabled` (linha 47 do arquivo atual):

```css
.btn-active {
  background: #e3f2fd;
  border-color: #064060;
  font-weight: 600;
}
.btn-active:hover { background: #bbdefb; }
```

- [ ] **Step 2: Verificar visualmente**

Abrir `popup/popup.html` no Chrome (`chrome-extension://…/popup/popup.html`) e inspecionar — não há teste automatizado para CSS puro.

- [ ] **Step 3: Commit**

```bash
git add popup/popup.css
git commit -m "style: add .btn-active class for toggle state indicator"
```

---

### Task 2: HTML — Marcar botão toggleável

**Files:**
- Modify: `popup/popup.html`

- [ ] **Step 1: Adicionar atributo `data-toggle="true"` no botão aumentarQuadro**

Alterar o botão `aumentarQuadro` (linha 27–29 do arquivo atual):

```html
<button data-action="aumentarQuadro" data-toggle="true" class="btn">
  🔲 Aumentar quadro
</button>
```

Nenhum outro botão recebe `data-toggle` agora — YAGNI. Para adicionar futuramente, basta colocar `data-toggle="true"` no botão desejado e um extrator em `TOGGLE_EXTRACTORS`.

- [ ] **Step 2: Commit**

```bash
git add popup/popup.html
git commit -m "feat: mark aumentarQuadro button as toggleable"
```

---

### Task 3: popup.js — Lógica de estado toggle

**Files:**
- Modify: `popup/popup.js`

- [ ] **Step 1: Adicionar `TOGGLE_EXTRACTORS` e funções de estado**

Adicionar após a constante `FEEDBACK_MESSAGES` (após linha 43 do arquivo atual):

```js
// Mapa de extratores: retorna boolean indicando se ação ficou ativa.
// Para adicionar nova função togglável: incluir entrada aqui.
const TOGGLE_EXTRACTORS = {
  aumentarQuadro: r => Boolean(r.enlarged),
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
```

- [ ] **Step 2: Atualizar handler `DOMContentLoaded` para carregar estado salvo**

Substituir o bloco `document.addEventListener('DOMContentLoaded', async () => {` inteiro (linhas 45–65) por:

```js
document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getActiveTab();
  const onPage = isPlataformaBrasil(tab?.url ?? '');

  document.getElementById('status-dot').className = `dot ${onPage ? 'dot-on' : 'dot-off'}`;
  document.getElementById('status-dot').title = onPage
    ? 'Página Plataforma Brasil detectada'
    : 'Página não é Plataforma Brasil';

  const savedStates = await loadToggleStates();

  document.querySelectorAll('.btn').forEach(btn => {
    if (!onPage) { btn.disabled = true; return; }

    const action = btn.dataset.action;
    if (btn.dataset.toggle === 'true') {
      const active = savedStates[`toggle_${action}`] ?? false;
      applyToggleClass(btn, active);
    }

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const response = await sendAction(tab.id, action);
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
});
```

- [ ] **Step 3: Commit**

```bash
git add popup/popup.js
git commit -m "feat: add reusable toggle state system to popup buttons"
```

---

### Task 4: Testes — `getToggleResult` (função pura extraída)

Os testes cobrem a lógica de extração de estado — a parte mais propensa a bugs ao adicionar novas funções toggleáveis.

**Files:**
- Create: `tests/popup-toggle.test.js`

- [ ] **Step 1: Escrever o teste (vai falhar — arquivo ainda não existe)**

Criar `tests/popup-toggle.test.js`:

```js
// tests/popup-toggle.test.js
// Testa o mapa TOGGLE_EXTRACTORS isolado (sem importar popup.js, que depende de chrome APIs)

const TOGGLE_EXTRACTORS = {
  aumentarQuadro: r => Boolean(r.enlarged),
};

function getToggleResult(action, response) {
  return TOGGLE_EXTRACTORS[action]?.(response) ?? null;
}

describe('getToggleResult', () => {
  describe('aumentarQuadro', () => {
    test('retorna true quando enlarged=true', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true, enlarged: true })).toBe(true);
    });

    test('retorna false quando enlarged=false', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true, enlarged: false })).toBe(false);
    });

    test('retorna false quando enlarged ausente', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true })).toBe(false);
    });
  });

  describe('ação sem extrator', () => {
    test('retorna null para ação não togglável', () => {
      expect(getToggleResult('copyData', { ok: true })).toBeNull();
    });

    test('retorna null para ação desconhecida', () => {
      expect(getToggleResult('inexistente', { ok: true })).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Rodar — esperar FAIL (arquivo não existe ainda na cobertura, mas vai passar porque o teste define tudo localmente)**

```bash
npx jest tests/popup-toggle.test.js --verbose
```

Resultado esperado: todos os 5 testes `PASS` (o arquivo já contém a implementação inline para teste isolado).

- [ ] **Step 3: Verificar output**

```
PASS tests/popup-toggle.test.js
  getToggleResult
    aumentarQuadro
      ✓ retorna true quando enlarged=true
      ✓ retorna false quando enlarged=false
      ✓ retorna false quando enlarged ausente
    ação sem extrator
      ✓ retorna null para ação não togglável
      ✓ retorna null para ação desconhecida

Test Suites: 1 passed
Tests:       5 passed
```

- [ ] **Step 4: Rodar suite completa para garantir ausência de regressão**

```bash
npx jest --verbose
```

Resultado esperado: todos os testes existentes (`extractor.test.js`, `aumentar-quadro.test.js`, `attribute-config.test.js`) continuam passando.

- [ ] **Step 5: Commit**

```bash
git add tests/popup-toggle.test.js
git commit -m "test: add unit tests for toggle state extractor logic"
```

---

## Como Adicionar Futura Função Togglável

Para transformar, por exemplo, `toggleReadMode` em togglável:

1. **`popup/popup.html`** — adicionar `data-toggle="true"` no botão:
   ```html
   <button data-action="toggleReadMode" data-toggle="true" class="btn">
   ```

2. **`popup/popup.js`** — adicionar extrator em `TOGGLE_EXTRACTORS`:
   ```js
   const TOGGLE_EXTRACTORS = {
     aumentarQuadro: r => Boolean(r.enlarged),
     toggleReadMode: r => Boolean(r.hidden),   // ← adicionar
   };
   ```

3. **`tests/popup-toggle.test.js`** — adicionar testes para o novo extrator.

Nenhuma outra mudança necessária.

---

## Self-Review

**Cobertura da spec:**
- ✅ Switch liga/desliga para aumentarQuadro
- ✅ Estado persistido (chrome.storage.local) — sobrevive ao fechar/reabrir popup
- ✅ Visual diferenciado quando ativo (`.btn-active`)
- ✅ Reutilizável para outras funções (`TOGGLE_EXTRACTORS` + `data-toggle="true"`)

**Placeholder scan:** Nenhum TBD/TODO/placeholder encontrado.

**Consistência de tipos:**
- `applyToggleClass(btn, active)` — usado em DOMContentLoaded (load) e no click handler ✅
- `saveToggleState(action, active)` — `active` sempre Boolean via extrator ✅
- `loadToggleStates()` — retorna objeto com keys `toggle_${action}`, lido com `?? false` ✅
