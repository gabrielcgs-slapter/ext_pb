# Avaliação de Segurança — Plataforma Brasil Toolkit v1.0.0

> Documento de trabalho. Gerado em 2026-06-11. Base: commit `1cac1e7`.

## Resumo Executivo

**Nível geral de risco: MÉDIO**

A extensão é tecnicamente bem-construída, com escopo restrito, testes automatizados e nenhuma exfiltração de dados ou vulnerabilidade clássica de injeção. Não há `eval`, nem `innerHTML` com dados não confiáveis, nem comunicação com servidores externos para dados do usuário. O risco vem de três pontos: a permissão `debugger` (altamente privilegiada), a dependência de CDNs externos no popup, e a fragilidade estrutural de seletores hardcoded.

**Principais problemas encontrados:**

1. Permissão `debugger` concedida — dá acesso ao protocolo DevTools completo da aba (maior risco de privilégio e o principal bloqueador para a Chrome Web Store).
2. Popup carrega CSS/fontes de `cdnjs.cloudflare.com` e `fonts.googleapis.com` — vazamento de metadados (IP/timing), quebra offline e exposição a supply-chain de terceiros.
3. Injeção em `world: 'MAIN'` executando `jsfcljs`/`Richfaces` da página — acoplamento frágil, embora o `projectId` seja validado.
4. Seletores RichFaces auto-gerados hardcoded (`j_id286`, `j_id243`) — quebram a cada mudança da plataforma.

---

## Vulnerabilidades Encontradas

| Severidade | Arquivo | Problema | Impacto | Correção |
|---|---|---|---|---|
| **Alta** | `manifest.json:6` | Permissão `debugger` declarada | Acesso ao CDP completo da aba (ler/alterar rede, DOM, JS). Aviso forte ao usuário na instalação; revisão reforçada/rejeição na CWS | Substituir geração de PDF por `chrome.tabs` + `window.print()` ou `Page.printToPDF` via outra via; se inviável, isolar e justificar formalmente |
| **Média** | `popup/popup.html:7,9` | CSS/fontes de CDN externo (cdnjs, Google Fonts) | Vaza IP/timing do usuário corporativo a terceiros; quebra sem internet; risco de supply-chain | Empacotar Font Awesome e a fonte localmente nos assets da extensão |
| **Média** | `popup/popup.js:128-162` | `executeScript` com `world: 'MAIN'` chamando `jsfcljs`/`Richfaces` | Executa no contexto da página; depende de globais não confiáveis. Hoje mitigado por `/^\d+$/`, mas qualquer extensão futura do payload sem validação vira vetor | Manter validação estrita de todos os args; documentar invariante; preferir disparo de evento DOM a chamar global da página |
| **Baixa** | `content/content.js:80`, `attribute-config.js:3` | `fetch` de `attributes.json` aplica `setAttribute` de config (inclui `style`) em elementos via seletor arbitrário | Config é interna e `web_accessible`, mas o padrão "setar atributos arbitrários por seletor" é perigoso se a config virar editável | Validar atributos permitidos (allowlist); nunca permitir `style`/`on*` vindos de fonte externa |
| **Baixa** | `manifest.json:6` | `activeTab` + `scripting` + `downloads` juntos | Superfície ampla, embora cada uso seja legítimo | Reavaliar se `activeTab` é necessário dado o `host_permissions` fixo |
| **Informativo** | `popup/popup.js:264` | `innerHTML` com string estática (ícone) | Sem risco atual (string literal) | Trocar por `textContent` + elemento `<i>` por consistência com `no-unsanitized` |

### Pontos positivos de segurança (evidências)

- `content.js:358` — `if (sender.id !== chrome.runtime.id) return;` bloqueia mensagens de outras extensões.
- `host_permissions` restrito a `plataformabrasil.saude.gov.br/*` (manifest:7-9) — escopo mínimo.
- `content_scripts.matches` restritos às páginas-alvo (manifest:25-28).
- Protocolos renderizados via `textContent` (`popup.js:248-255`) — sem XSS no storage.
- `debugger.detach` em `finally` (`popup.js:95`) — sem vazamento de sessão.

---

## Melhorias Recomendadas (priorizadas por impacto)

- [x] **1. Remover ou justificar `debugger`** — substituído por `window.print()`. Permissões `debugger` e `downloads` removidas do manifest.
- [x] **2. Internalizar Font Awesome e a fonte** — FA 6.7.2 em `popup/fa/` (CSS + woff2); Google Fonts removido; `font-family` usa `system-ui`.
- [x] **3. Allowlist de atributos** em `attribute-config.js` — bloqueia `on*` e `style`. Entrada `style` removida de `attributes.json`; estilo de `aumentarQuadro` hardcoded em JS.
- [x] **4. Tornar seletores resilientes** — `findPaginacaoBtn` usa `td.rich-datascr-button[onclick*="fastforward"]` em vez de `j_id286`.
- [x] **5. Extrair duplicação** — `paginateUntilFound(findFn, msg)` helper extraído; `actionSubmeterEmenda` e `actionSubmeterNotificacao` são 1-liners.
- [x] **6. Adicionar CSP explícita** — `content_security_policy.extension_pages` adicionado ao manifest; `script/style/font-src` restritos a `'self'`.
- [ ] **7. Service worker vazio** (`service_worker.js`) só loga — confirmado mínimo, sem mudança necessária.

---

## Score Final

| Dimensão | Nota | Justificativa |
|---|---|---|
| **Segurança** | 6.5 / 10 | Sem XSS/exfiltração/eval; bom check de `sender.id` e escopo restrito. Penalizada por `debugger` e injeção em `MAIN` world |
| **Privacidade** | 7.0 / 10 | Nenhuma telemetria; dados só em `storage.local` e clipboard. Penalizada pelo vazamento a cdnjs/Google Fonts |
| **Desempenho** | 8.5 / 10 | `MutationObserver` com `disconnect`, timeouts limpos, `MAX_PAGES` limitado. Sem leaks |
| **Qualidade do Código** | 8.0 / 10 | Modular, ESLint + `no-unsanitized`, 11 arquivos de teste, IIFE guard. Penalizada por duplicação e acoplamento RichFaces |
| **Operabilidade** | 8.0 / 10 | Feedback ao usuário, estado de toggle persistido, tratamento de "debugger já anexado", confirmação no PDF |
| **Manutenibilidade** | 6.0 / 10 | Boa organização, mas seletores `j_id*` auto-gerados são frágeis e quebram com a plataforma |

---

## Conclusão

**Apta para uso pessoal: SIM.**
Não há exfiltração de dados, comunicação suspeita ou código malicioso. O escopo é restrito a um único domínio governamental e os dados ficam locais. A permissão `debugger` é usada de forma legítima (gerar PDF via `Page.printToPDF`, `popup.js:76`). Risco aceitável para o próprio autor.

**Apta para uso corporativo: COM RESSALVAS.**
Bloqueadores antes de distribuir em ambiente gerenciado:
- A permissão `debugger` aciona aviso forte e costuma violar políticas de TI corporativas (acesso ao CDP = capacidade de ler/alterar tráfego e DOM).
- A dependência de `cdnjs.cloudflare.com` e Google Fonts (`popup.html:7,9`) vaza metadados de rede e quebra em ambientes offline/isolados — inaceitável em redes restritas de saúde. Internalizar os assets resolve.
- Recomenda-se empacotar tudo localmente e remover `debugger` antes de aprovar para frota.

**Apta para publicação na Chrome Web Store: NÃO (na forma atual).**
- A permissão `debugger` é fortemente desencorajada pela política da CWS e leva a revisão manual reforçada ou rejeição, exigindo justificativa robusta de "narrow use case". Como o único uso é gerar PDF, há alternativas mais simples que evitam a permissão.
- Carregar recursos remotos (CSS/fontes de CDN) conflita com as diretrizes de "todo o código/recurso empacotado" da CWS para MV3.
- A extensão é claramente de nicho (ferramenta interna para um sistema governamental específico), o que por si só não impede publicação, mas reforça que distribuição privada/empresarial é o caminho mais adequado que a loja pública.

**Veredito:** ferramenta sólida e bem-testada para uso interno. Para qualquer distribuição além do uso pessoal, remova `debugger`, internalize os assets de CDN e endureça os seletores.
