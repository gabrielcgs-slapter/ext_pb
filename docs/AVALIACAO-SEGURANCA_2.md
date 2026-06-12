# Avaliação Técnica Completa — Plataforma Brasil Toolkit v1.0.0

> **Base:** estado atual do código (branch `master`, commit `80be0ad` — pós-hardening)
> **Data:** 2026-06-12

---

## Resumo Executivo

**Nível geral de risco: BAIXO**

A extensão passou por um ciclo de hardening que eliminou os dois maiores riscos identificados anteriormente (`debugger`, CDNs externos). O código atual é disciplinado: sem `eval`, sem `innerHTML` com dados não confiáveis, sem comunicação com servidores externos, sem coleta de dados pessoais, com CSP explícita e permissões mínimas. Os pontos remanescentes são de baixa severidade.

**Principais pontos positivos:**

- Permissão `debugger` removida; impressão via `window.print()` ✅
- Font Awesome e fontes totalmente empacotados em `popup/fa/` ✅
- CSP definida no manifest: `script/object/style/font-src 'self'` ✅
- Verificação `sender.id !== chrome.runtime.id` em todas as mensagens ✅
- Dados armazenados apenas em `chrome.storage.local` — sem servidor externo ✅
- ESLint com `no-unsanitized` + `no-eval` + `no-implied-eval` + `no-new-func` ✅
- Allowlist de atributos em `attribute-config.js` (bloqueia `on*` e `style`) ✅

**Problemas remanescentes:**

1. `world: 'MAIN'` executa código no contexto da página — acoplamento frágil com globais JSF/RichFaces
2. `btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>'` — string estática, mas viola `no-unsanitized`
3. Seletor `j_id243` auto-gerado JSF ainda hardcoded em `_navigateToProjectInMainWorld`
4. `fetch` de `attributes.json` sem tratamento de erro explícito (silenciado por `.catch(() => {})`)

---

## 1. Segurança

### Vulnerabilidades Encontradas

| Severidade | Arquivo | Linha | Problema | Impacto | Correção |
|---|---|---|---|---|---|
| **Média** | `popup/popup.js` | 116–128 | `executeScript` com `world: 'MAIN'` chamando `jsfcljs`/`Richfaces` | Executa no contexto da página; depende de globais da página não confiáveis. O `projectId` é validado (`/^\d+$/`), mas futuros payloads sem validação seriam vetor | Manter validação estrita; considerar disparar evento DOM customizado em vez de chamar global diretamente |
| **Baixa** | `popup/popup.js` | 230 | `btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>'` | String literal, sem risco de XSS, mas inconsistente com a política `no-unsanitized` | Substituir por `createElement('i')` + `className` |
| **Baixa** | `popup/popup.js` | 104 | `_navigateToProjectInMainWorld` usa `j_id243` hardcoded | Quebrará silenciosamente quando JSF regenerar o ID | Tornar configurável ou usar seletor baseado em atributo semântico |
| **Informativo** | `content/attribute-config.js` | 3 | `fetch(rulesUrl)` sem `try/catch`; falha silenciada por `.catch(()=>{})` | Se `attributes.json` falhar, a config não é aplicada sem log | Logar o erro no `catch` para diagnóstico |
| **Informativo** | `background/service_worker.js` | 3 | `console.log` no install | Visível nas DevTools — sem risco, mas desnecessário em produção | Remover ou usar flag de debug |

### Pontos de Segurança Confirmados (positivos)

| Controle | Arquivo | Evidência |
|---|---|---|
| Sem eval/Function dinâmico | ESLint + todos os JS | `no-eval`, `no-implied-eval`, `no-new-func` configurados |
| Sem innerHTML com dados externos | `popup.js`, `content.js` | `no-unsanitized` no ESLint; dados renderizados via `textContent` |
| Verificação de origem de mensagens | `content.js:314` | `if (sender.id !== chrome.runtime.id) return;` |
| Permissões mínimas | `manifest.json` | Apenas `activeTab`, `scripting`, `storage` |
| Host permission restrito | `manifest.json:7` | Somente `plataformabrasil.saude.gov.br/*` |
| Content scripts restritos a URLs-alvo | `manifest.json:24-31` | Duas rotas específicas da plataforma |
| CSP explícita | `manifest.json:36-38` | `script/object/style/font-src 'self'` — sem `'unsafe-inline'` |
| Sem CDN externo | `popup.html` | Font Awesome local em `popup/fa/` |
| IIFE guard anti-dupla injeção | `content.js:5-6` | `window.__pbLoaded` |
| Clipboard via API segura | `popup.js:155` | `navigator.clipboard.writeText` |
| Dados apenas locais | `popup.js`, `protocols.js` | `chrome.storage.local` — sem servidor externo |
| `web_accessible_resources` mínimo | `manifest.json:39-46` | Apenas `config/attributes.json` |

---

## 2. Privacidade

**Nível: EXCELENTE para uso corporativo**

| Aspecto | Status | Detalhe |
|---|---|---|
| Coleta de dados pessoais | ✅ Nenhuma | Sem telemetria, analytics ou rastreamento |
| Transmissão a terceiros | ✅ Nenhuma | Toda comunicação é extensão ↔ página local |
| CDNs externos | ✅ Removidos | FA e fontes locais desde o hardening |
| Cookies | ✅ Não acessados | Nenhuma API de cookies na extensão |
| Histórico de navegação | ✅ Não coletado | `activeTab` lê só a aba ativa no momento do clique |
| Dados em storage | ✅ Locais | `chrome.storage.local` — apenas CAAEs e nomes de protocolo, sem PII sensível |
| `sessionStorage` | ✅ Flag de fluxo | Apenas `pb_pendingDetalhar = '1'`; removido logo após uso |

**Consideração LGPD/GDPR:** Os dados armazenados (nome do protocolo + CAAE) são identificadores de pesquisa, não dados pessoais diretos. Não há transmissão para servidor. A extensão não processa dados de saúde de participantes — somente metadados administrativos do sistema. **Risco regulatório: Baixo**.

---

## 3. Qualidade do Código

**Aspectos positivos:**
- Estrutura modular bem definida: `lib/`, `content/`, `popup/`, `background/`, `config/`
- 11 arquivos de teste cobrindo os fluxos principais
- ESLint com regras de segurança (`no-unsanitized`, `no-eval`)
- `paginateUntilFound` elimina duplicação entre `submeterEmenda` e `submeterNotificacao`
- `FEEDBACK_MESSAGES` e `TOGGLE_EXTRACTORS` como mapas declarativos extensíveis
- `tryMessage` + `sendAction` isolam a lógica de injeção de content script

**Problemas identificados:**

| Problema | Arquivo | Impacto |
|---|---|---|
| `j_id243` hardcoded em `_navigateToProjectInMainWorld` | `popup.js:104` | Quebra silenciosa quando JSF regenera IDs |
| `innerHTML` com literal (único uso) | `popup.js:230` | Inconsistência com a política; dificulta uso de `no-unsanitized` |
| Globals JSF (`jsfcljs`, `Richfaces`) sem type guard completo | `popup.js:99-113` | `jsfcljs` já tem `typeof` check; `Richfaces` não |
| `attribute-config.js` sem logging de erro | `attribute-config.js:3` | Falhas silenciosas dificultam diagnóstico |

---

## 4. Desempenho

**Análise:** sem gargalos significativos.

| Aspecto | Status | Detalhe |
|---|---|---|
| MutationObserver | ✅ | `observer.disconnect()` chamado em todos os caminhos de saída |
| Loop de paginação | ✅ | `MAX_PAGES = 50` previne loop infinito |
| Polling | ✅ | `POLL_TIMEOUT = 30000ms`, `POLL_INTERVAL = 300ms` — no máximo 100 ciclos |
| Injeção de scripts | ✅ | IIFE guard + lazy injection (`sendAction`) evita injeção redundante |
| Timers | ✅ | `clearInterval`/`clearTimeout` chamados nos paths de saída |
| Requisições de rede | ✅ | Único `fetch` é `attributes.json` local no load do content script |
| Service worker | ✅ | Mínimo — apenas listener de install |

**Risco potencial:** o polling de 300ms em `paginateUntilFound` pode disparar até 100 vezes por página por até 50 páginas = 5000 verificações DOM no pior caso. Para uso real (1-3 páginas de tabela), o impacto é desprezível.

---

## 5. Operabilidade

| Aspecto | Status | Detalhe |
|---|---|---|
| Feedback visual | ✅ | `showFeedback` com classes CSS `feedback-ok`/`feedback-err` + timeout de 3s |
| Estados de botão | ✅ | `btn.disabled = true` durante operações async |
| Toggle persistido | ✅ | `aumentarQuadro` salva estado em `storage.local` |
| Recuperação de "script não injetado" | ✅ | `sendAction` injeta content script automaticamente se não está presente |
| Indicador de página | ✅ | Dot verde/vermelho no header do popup |
| Cenário offline | ✅ | FA local; sem dependência externa |
| Formulário de protocolo | ✅ | Validação de CAAE com regex antes de salvar |
| Navegação post-reload | ✅ | `sessionStorage` com `PB_PENDING_DETALHAR` para lidar com navegação completa |

**Possível melhoria UX:** Quando `_navigateToProjectInMainWorld` encontra `Richfaces` undefined (plataforma atualizada), retorna `{ ok: false, error: 'Formulário gerirPesquisaForm não encontrado' }`. A mensagem é genérica — poderia ser mais específica para orientar o usuário.

---

## 6. Compatibilidade

| Aspecto | Status | Detalhe |
|---|---|---|
| Manifest V3 | ✅ | `manifest_version: 3` com service worker, sem background pages |
| Chrome atual | ✅ | Todas as APIs usadas são MV3-compatíveis |
| `scripting.executeScript` + `world: 'MAIN'` | ✅ | Disponível desde Chrome 95 |
| CSP MV3 | ✅ | `content_security_policy.extension_pages` (sintaxe correta para MV3) |
| Sem `externally_connectable` | ✅ | Reduz superfície de ataque |
| Fontes locais | ✅ | Sem dependência de DNS externo |

---

## Score Final

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Segurança** | **8.5 / 10** | Permissões mínimas, CSP, sem eval, sender check. Penalizada por `world: 'MAIN'` (acoplamento frágil) e `innerHTML` literal |
| **Privacidade** | **9.5 / 10** | Zero telemetria, zero CDN externo, dados apenas locais. Excelente |
| **Desempenho** | **8.5 / 10** | Observers com disconnect, limites de polling, IIFE guard. Sem memory leaks identificados |
| **Qualidade do Código** | **8.5 / 10** | Modular, testado, ESLint seguro, helper extraído. Penalizada por `j_id243` hardcoded e `innerHTML` inconsistente |
| **Operabilidade** | **8.5 / 10** | Feedback sólido, recovery de injeção, estado persistido, dots de status. Boa UX para ferramenta interna |
| **Manutenibilidade** | **7.5 / 10** | Boa organização e testes. Risco de quebra silenciosa nos seletores JSF auto-gerados |

---

## Melhorias Recomendadas (priorizadas)

1. **[Média] Substituir `innerHTML` por `createElement`** em `popup.js:230` — elimina o único uso inconsistente com a política `no-unsanitized`:
   ```js
   const icon = document.createElement('i');
   icon.className = 'fa-solid fa-trash';
   btnDel.appendChild(icon);
   ```

2. **[Média] Adicionar `typeof Richfaces !== 'undefined'` guard** em `_navigateToProjectInMainWorld` (`popup.js:99`) — hoje só `jsfcljs` tem o check.

3. **[Baixa] Tornar `j_id243` configurável** — extrair para constante nomeada com comentário explicando a origem, ou documentar como identificar dinamicamente.

4. **[Baixa] Logar falha de `fetch` de `attributes.json`** — substituir `.catch(() => {})` por `.catch(e => console.warn('[pb-toolkit] attributes.json:', e.message))`.

5. **[Informativo] Remover `console.log` do service worker** — ou condicioná-lo a uma flag de debug.

---

## Conclusão

### Uso pessoal: APTO ✅

Sem exfiltração de dados, sem código malicioso, escopo restrito a um único domínio governamental. Risco aceitável.

### Uso corporativo: APTO ✅ *(ressalvas menores)*

Os dois bloqueadores corporativos anteriores (`debugger` e CDN externos) foram eliminados. A extensão é adequada para distribuição em frota gerenciada. Recomenda-se documentar o uso de `world: 'MAIN'` na política interna de segurança, pois o mecanismo executa código no contexto da página da Plataforma Brasil (escopo já fixo no manifest).

### Chrome Web Store: APTO COM RESSALVAS ⚠️

- `world: 'MAIN'` requer justificativa na submissão (a CWS solicita explicação para execução no mundo principal)
- A extensão é single-purpose para plataforma governamental específica — não é um bloqueador, mas pode exigir revisão manual
- CSP, MV3, permissões mínimas e assets empacotados localmente atendem aos requisitos técnicos da loja

**Veredito:** a extensão está em excelente forma para uso interno/pessoal. A diferença entre o estado atual e uma versão publicável na CWS se resume a pequenas correções de consistência e uma justificativa de revisão para `world: 'MAIN'`.
