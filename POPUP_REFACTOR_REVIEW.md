# Revisão da Refatoração: popup_v2 vs popup

**Data:** 2026-06-14  
**Arquivos comparados:** `popup/popup.html` + `popup/popup.css` ↔ `popup_v2/popup.html` + `popup_v2/popup.css`

---

## Veredicto geral

**Adotar a v2.** Todas as mudanças são melhorias objetivas — não há nenhuma regressão funcional. A recomendação é migrar o conteúdo de `popup_v2/` de volta para `popup/`, sobrescrevendo os arquivos originais.

---

## HTML — comparação item a item

### ✅ Adotar — `<title>` presente

| v1 | v2 |
|----|-----|
| `<head>` sem `<title>` | `<title>Plataforma Brasil</title>` |

Ausência de `<title>` causa aviso de acessibilidade e aparece em branco em algumas implementações de popup no Chrome DevTools. Custo zero, adotar.

---

### ✅ Adotar — HTML semântico (`<header>`, `<main>`, `<section>`, `<form>`)

| v1 | v2 |
|----|-----|
| `<div id="header">` | `<header id="header">` |
| `<div id="actions">` | `<main id="actions">` |
| `<div id="protocols-panel">` | `<section id="protocols-panel">` |
| `<div id="protocols-form">` | `<form id="protocols-form" novalidate>` |

O uso de `<form>` habilita semântica de formulário nativa (Enter para submeter já funcionava via JS, mas agora o elemento tem a semântica correta). O `novalidate` é necessário pois a validação é feita no JS. `<header>`, `<main>` e `<section>` não alteram comportamento mas tornam a árvore de acessibilidade legível por leitores de tela.

---

### ✅ Adotar — `type="button"` em todos os botões

| v1 | v2 |
|----|-----|
| `<button data-action="copyData" class="btn">` | `<button type="button" data-action="copyData" class="btn">` |

Sem `type="button"`, botões dentro de um `<form>` fazem submit por padrão. Com `<div>` não importava, mas após a mudança para `<form>` (item acima) omitir o `type` seria um bug latente. Com `type="button"` explícito o comportamento é seguro independente do elemento pai.

---

### ✅ Adotar — atributos ARIA

| v1 | v2 |
|----|-----|
| Sem ARIA | `aria-hidden="true"` nos ícones FontAwesome |
| — | `role="status"` no status dot |
| — | `aria-live="polite"` no `#feedback`, `#protocols-caae-auto`, `#protocols-list` |
| — | `aria-atomic="true"` no `#feedback` |
| — | `aria-label="Lista de protocolos"` no `<section>` |

Leitores de tela anunciariam os ícones FontAwesome como caracteres Unicode sem `aria-hidden`. Os `aria-live` garantem que feedback de ação e atualizações da lista de protocolos sejam anunciados sem que o usuário precise mover o foco.

---

### ✅ Adotar — remoção do botão comentado (`toggleReadMode`)

| v1 | v2 |
|----|-----|
| Bloco `<!--# ... -->` ocupando 3 linhas | Removido |

Código morto comentado há tempo suficiente para estar no controle de versão. Se a feature for reativada, o histórico do git preserva o código original. Manter no HTML só adiciona ruído.

---

### ✅ Adotar — segundo `section-divider` (antes do grupo protocolos/submissão)

| v1 | v2 |
|----|-----|
| Um único divider antes do botão PDF | Divider antes do grupo protocolos/notificação/emenda E antes do PDF |

Agrupa visualmente as ações em três blocos lógicos: **navegação** (copiar, expandir, quadro, árvore) / **submissão** (protocolos, notificação, emenda) / **documento** (PDF). Melhora a leitura rápida da interface.

---

### ✅ Adotar — `autocomplete="off"` no input

O nome do protocolo é um label arbitrário do usuário, não um campo de formulário padrão. O autocomplete do browser sugeriria valores de outros formulários sem relação, poluindo a UX.

---

### ⚠️ Detalhe de integração — caminhos de asset

| v1 | v2 |
|----|-----|
| `src="logo_platBR.png"` | `src="../popup/logo_platBR.png"` |
| `href="fa/all.min.css"` | `href="../popup/fa/all.min.css"` |
| `src="protocols.js"` | `src="../popup/protocols.js"` |

Os caminhos `../popup/` fazem sentido porque a v2 está numa pasta diferente. **Ao migrar o conteúdo de volta para `popup/`**, os caminhos devem ser revertidos para relativos simples (`logo_platBR.png`, `fa/all.min.css`, etc.). Não é uma falha da v2 — é uma consequência natural de colocar os arquivos numa pasta de comparação paralela.

---

## CSS — comparação item a item

### ✅ Adotar — paleta de variáveis renomeada

| v1 | v2 | Problema na v1 |
|----|-----|----------------|
| `--primary: #006837` (verde) | `--green-700: #006837` / `--primary: var(--green-700)` | OK |
| `--primary-50: #e8f2f9` (azul!) | `--teal-50: #e8f2f9` / `--hover-bg: var(--teal-50)` | `primary-50` sugere que é uma versão clara do verde primário — mas é azul |
| `--primary-100: #064060` (teal escuro) | `--teal-900: #064060` / `--hover-border: var(--teal-900)` | `primary-100` deveria ser mais claro que `primary-50` pela convenção Tailwind; aqui é o oposto E é outra cor |

A nomenclatura original misturava duas famílias de cores (verde e teal/azul) sob o prefixo `primary`, tornando impossível entender o sistema de cores sem ler os valores hexadecimais. A v2 separa paleta bruta (`--teal-*`, `--green-*`, `--red-*`, `--amber-*`) de tokens semânticos (`--hover-bg`, `--hover-border`, `--primary`, `--error`).

---

### ✅ Adotar — borda suavizada

| v1 | v2 |
|----|-----|
| `--border: #000000` | `--border: rgba(0, 0, 0, 0.18)` |

Borda preta sólida em botões claros sobre fundo escuro cria um contraste excessivo que não existe em nenhum sistema de design moderno. `rgba(0,0,0,0.18)` resulta num cinza muito mais discreto e profissional.

---

### ✅ Adotar — largura do popup como variável

| v1 | v2 |
|----|-----|
| `body { width: 240px; }` | `body { width: var(--popup-width); }` |
| `body.wide { width: 300px; }` | `body.wide { width: var(--popup-wide); }` |

Alterar a largura num lugar (`--popup-width: 240px`) propaga para todos os contextos. Na v1, qualquer ajuste exigia lembrar dos dois lugares.

---

### ✅ Adotar — `.hidden` consolidado

| v1 | v2 |
|----|-----|
| `#protocols-panel.hidden { display: none; }` | `.hidden { display: none !important; }` |
| `#actions.hidden { display: none; }` | *(removidos)* |
| `#protocols-form.hidden { display: none; }` | *(removidos)* |
| `#protocols-caae-auto.hidden { display: none; }` | *(removidos)* |
| `#protocols-form input.hidden { display: none; }` | *(removidos)* |

Cinco regras fazendo a mesma coisa porque sem `!important` um seletor genérico seria sobrescrito por regras com ID. A v2 usa `!important` na classe utilitária — padrão aceito para classes de visibilidade (ver Tailwind `hidden`, Bootstrap `d-none`). Elimina 5 regras redundantes.

---

### ✅ Adotar — `.btn-active:hover` corrigido

| v1 | v2 |
|----|-----|
| `.btn-active:hover { background: var(--primary-100); }` → `#064060` (teal escuro!) | `.btn-active:hover { background: var(--green-100); }` → `#dcfce7` (verde claro) |

Na v1, ao passar o mouse sobre um botão ativo (ex.: "Aumentar quadro" quando ativo), o fundo ficava `#064060` — idêntico ao fundo da página, tornando o botão quase invisível. É um bug visual real, não apenas cosmético. A v2 mantém o tom verde claro no hover, consistente com o estado ativo.

---

### ✅ Adotar — `.btn-protocols` monocromático verde

| v1 | v2 |
|----|-----|
| `color: var(--accent)` → laranja | `color: var(--green-800)` → verde escuro |
| `border-color: var(--primary)` → verde | `border-color: var(--primary)` → verde |
| `background: var(--primary-50)` → azul-claro | `background: var(--green-50)` → verde muito claro |
| hover: `border-color: var(--primary-100)` → teal escuro | hover: `border-color: var(--primary)` → verde |

O botão "Lista de protocolos" na v1 combinava texto laranja (`--accent`), borda verde e fundo azul-claro — três famílias de cor diferentes num componente só. Na v2 é inteiramente verde, como um botão de ação primária diferenciada dos botões neutros.

---

### ✅ Adotar — `.section-divider` corrigido

| v1 | v2 |
|----|-----|
| `background: var(--border)` → `#000000` | `background: rgba(255, 255, 255, 0.12)` |

O divider separa grupos de botões sobre um fundo escuro (`#064060`). Uma linha preta sólida sobre fundo escuro resulta numa mancha escura sem sentido visual. Uma linha branca semitransparente produz o separador sutil correto.

---

### ✅ Adotar — animação `pulse-dot` no status dot ativo

```css
/* v2 — novo */
.dot-on {
  animation: pulse-dot 2.4s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.22); }
  50%       { box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.08); }
}
```

O dot estático (v1) não dá nenhum feedback visual sobre o estado "ao vivo". A animação é discreta (só o `box-shadow` pulsa, a cor permanece estável) e comunica claramente que a detecção de página é um estado ativo e não apenas uma cor aplicada. Custo de performance negligenciável (apenas `box-shadow`, sem reflow).

---

### ✅ Adotar — bordas internas em contexto escuro corrigidas

| Elemento | v1 | v2 |
|---------|-----|-----|
| `#protocols-header` border-bottom | `1px solid var(--border)` → preto | `rgba(255,255,255,0.12)` |
| `#protocols-form` border | `1px solid var(--border)` → preto | `rgba(255,255,255,0.1)` |

Ambos os elementos ficam sobre o fundo escuro `--bg` (`#064060`). Uma borda preta sobre fundo escuro é invisível ou cria contraste negativo. Branco semitransparente é a solução correta.

---

### ✅ Adotar — `#protocols-header` cor tokenizada

| v1 | v2 |
|----|-----|
| `color: #e9e9e9` | `color: var(--text-on-dark)` |

Valor hardcoded substituído pelo token `--text-on-dark: #e9e9e9`. O valor é idêntico, mas agora refatorável de um ponto só.

---

### ✅ Adotar — `--surface` mais frio

| v1 | v2 |
|----|-----|
| `--surface: #e9e9e9` | `--surface: #f0f4f8` |

`#f0f4f8` tem uma leve tonalidade azul-fria que harmoniza melhor com o fundo teal `#064060` e o verde do header. `#e9e9e9` é neutro mas resulta num contraste levemente amarelado ao lado do fundo frio.

---

### ✅ Adotar — `*::before, *::after` no reset

| v1 | v2 |
|----|-----|
| `* { box-sizing: border-box; }` | `*, *::before, *::after { box-sizing: border-box; }` |

Pseudo-elementos gerados por CSS (ex.: possíveis usos futuros de `::before`/`::after` para decoração) herdariam `content-box` sem o seletor `*::before, *::after`. Pequeno mas correto.

---

### ✅ Adotar — `transition: opacity 0.2s` no feedback

A barra de feedback na v1 aparece e desaparece abruptamente. A transição de opacidade torna a experiência mais suave sem mudar o layout.

---

## Resumo executivo

| Categoria | Itens v2 superiores | Itens v1 superiores | Empates |
|-----------|--------------------|--------------------|---------|
| HTML | 6 | 0 | 1 (caminhos — questão de contexto) |
| CSS | 13 | 0 | 0 |
| **Total** | **19** | **0** | **1** |

---

## Plano de migração recomendado

1. Copiar `popup_v2/popup.html` → `popup/popup.html`  
2. Copiar `popup_v2/popup.css` → `popup/popup.css`  
3. No `popup.html` migrado, reverter os caminhos para relativos simples:
   - `../popup/fa/all.min.css` → `fa/all.min.css`
   - `../popup/logo_platBR.png` → `logo_platBR.png`
   - `../popup/protocols.js` → `protocols.js`
   - `../popup/popup.js` → `popup.js`
4. Deletar `popup_v2/` após validação visual no Chrome
5. Atualizar `manifest.json` se necessário (o `default_popup` já aponta para `popup/popup.html` — sem mudança)

Nenhuma alteração em `popup.js` ou `protocols.js` é necessária: todos os seletores CSS e IDs do DOM permanecem idênticos.
