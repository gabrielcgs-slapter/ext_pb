# Plataforma Brasil Toolkit

Extensão para o Chrome que adiciona ferramentas de produtividade à **Plataforma Brasil** — sistema do Ministério da Saúde para gestão de pesquisas com seres humanos (CEP/CONEP).

A extensão atua nas páginas de detalhamento de projetos (`detalharProjetoAgrupadorApreciacao`) e de gerenciamento de pesquisas (`gerirPesquisaAgrupador`), automatizando tarefas repetitivas e melhorando a experiência de leitura e navegação.

---

## Instalação no Chrome

> A extensão ainda não está publicada na Chrome Web Store. A instalação é feita em modo desenvolvedor.

1. Faça o download ou clone este repositório:
   ```bash
   git clone https://github.com/gabrielcgs-slapter/ext_pb.git
   ```
2. Abra o Chrome e acesse `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta do repositório.
5. O ícone da extensão aparecerá na barra de ferramentas do Chrome.

---

## Funcionalidades

O popup da extensão exibe um indicador de status: um ponto **verde** confirma que a página atual é reconhecida como Plataforma Brasil; um ponto **cinza** indica que os botões estão desabilitados.

### 📋 Copiar dados do projeto
Extrai os principais metadados do projeto aberto (CAAE, título, pesquisador responsável, área temática e patrocinador principal) e copia o resultado formatado para a área de transferência.

### 🔽 Expandir / Colapsar seções
Alterna o estado de todos os painéis de seções da página com um clique, equivalente a abrir ou fechar cada painel manualmente.

### 👓 Modo leitura
Oculta as barras de navegação, rodapé e outros elementos de interface para uma leitura mais limpa do conteúdo. Um segundo clique restaura o layout original.

### 🔲 Aumentar quadro
Expande a largura do quadro principal de conteúdo para ocupar toda a tela. O botão mantém o estado entre cliques (toggle) e o estado é salvo entre sessões.

### 🌳 Abrir árvore de documentos
Expande automaticamente todos os nós colapsados da árvore de documentos do projeto.

### 🔔 Submeter notificação
Localiza e clica no botão **Enviar Notificação** do projeto, navegando automaticamente pelas páginas da tabela de apreciações até encontrá-lo.

### 📝 Submeter emenda
Localiza e clica no botão **Submeter Emenda**, com a mesma navegação automática por paginação da ação acima.

### 📄 Lista de Protocolos
Painel para salvar uma lista de projetos de interesse (nome + CAAE). Para cada protocolo salvo é possível:
- **Executar (▶)** — preenche o campo de busca com o CAAE, dispara a pesquisa e abre automaticamente o detalhamento do projeto.
- **Remover (🗑)** — remove o protocolo da lista.

A lista é persistida no `chrome.storage.local` e sobrevive ao fechamento do navegador.

---

## Sugestões e bugs

Contribuições são bem-vindas! Se você encontrar um bug ou tiver uma ideia de nova funcionalidade, abra uma [issue](../../issues) descrevendo:

- **Bug**: passos para reproduzir, comportamento esperado vs. observado, e se possível um print da página.
- **Nova feature**: o que você precisa fazer na Plataforma Brasil hoje que é lento ou repetitivo.

Algumas ideias que podem ser exploradas futuramente:

- Exportar dados do projeto em CSV ou JSON
- Atalhos de teclado para as ações principais
- Suporte a outras páginas da Plataforma Brasil (ex: pareceres, pendências)
- Indicação visual do status de cada protocolo salvo (ex: situação do projeto)
- Busca e filtragem na lista de protocolos
