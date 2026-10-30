# JAX — contrato de integração para o Codex

## Estado real

O backend inicial já aceita sessão de proprietário e chat com provedores de IA, configurados no servidor. O agente planeja buscas web, de imagens e de vídeos, usa preferências explícitas e posições das janelas próprias do JAX, e só recebe resultados reais quando as APIs correspondentes estão configuradas. Alguns comandos locais seguem roteamento determinístico. Não há leitura de repositórios, envio de e-mail, acesso ao terminal, interpretação de pixels da tela ou manipulação de documentos. Não afirmar sucesso sem resultado verificado da ferramenta. Veja `BACKEND_ROADMAP.md` para o estado e as limitações atuais.

A interface inicia vazia: esfera, texto e compositor. A barra lateral é opt-in. `components/jax-window.tsx` implementa arraste, resize, minimizar, restaurar, fechar e maximizar na área útil, preservando cabeçalho e dock quando existir. Abrir uma janela minimiza as anteriores. No mobile, restaurar também minimiza as outras; no desktop, restaurar manualmente permite sobreposição por decisão do usuário. O dock mantém acesso às janelas minimizadas.

**Ler também `JAX_PROJECT_PLAN.md` e `ANDROID_TERMUX_GUIDE.md`.** Android, APK, PC e acesso via Termux são suportes complementares; não abandonar desktop. A base APK não foi compilada/testada neste ambiente e não inclui servidor. Termux/PC e áudio físico exigem validação no aparelho.

## Frontend

- `components/jax-workspace.tsx`: orquestra UI, teclado e histórico; mensagens livres autenticadas passam por `/api/jax/chat` e são persistidas no SQLite local. Comandos locais continuam transitórios.
- `components/jax-window.tsx`: janelas com pointer capture no cabeçalho/alça; controles não propagam pointerdown ao arraste.
- `hooks/use-jax-layout.ts` e `lib/jax-layout.ts`: viewport visual, offsets, safe-area, limites compartilhados e ajuste proporcional após rotação/teclado. Mobile abaixo de 720 px CSS; modo compacto abaixo de 480 px de altura visual.
- `styles/jax-mobile.css`: touch targets 44–48 px, sidebar modal, dock horizontal e compositor responsivo; não desabilita zoom.
- `components/jax-sidebar.tsx`: navegação com `<dialog>` modal, foco inicial, backdrop e fechamento por Escape/seleção.
- `components/jax-resource-panels.tsx`: projetos, WhatsApp e orientações de instalação; dados transitórios, sem leitura de conta ou envio automático.
- `app/manifest.ts`: metadados de instalação e ícones locais; sem service worker/offline.
- `android/`: shell Android WebView com URL HTTPS definida por propriedade Gradle `appUrl`; sem bridge JS, acesso irrestrito a arquivos, serviço em background ou MediaProjection. `.github/workflows/android-apk.yml` compila/linta debug manualmente após informar a URL.
- `hooks/use-jax-voice.ts`: Web Speech API, quando disponível; um comando e escuta contínua são separados. Ativação explícita, cancelamento e erros de permissão. Ao ocultar/sair da página, encerra a escuta e exige nova ativação. Não há síntese de voz. O reconhecimento pode ser processado pelo serviço do navegador: não é garantidamente offline. Não confundir escuta contínua com uma API conversacional bidirecional realtime.
- `lib/jax-bridge.ts`: contrato dos adaptadores futuros. A API HTTP de sessão e chat está implementada; transporte em tempo real e ferramentas ainda não.
- `components/jax-capabilities.tsx`: catálogo acessível pela barra lateral. Compartilhamento usa `getDisplayMedia` com seletor nativo, prévia local e botão de parar; não envia imagens. Seleção de PDF/Word usa File API, sem upload ou extração simulada. Terminal, arquivos, exclusão e controle do navegador têm formulários de revisão que retornam `unavailable`, sem executar ações.
- Comandos locais `minimizar todas`, `fechar todas` e `organizar todas` operam apenas janelas próprias do JAX. Se não houver espaço mínimo para distribuir sem sobreposição, mantém apenas a última visível e minimiza as demais.
- A captura real do microfone não pôde ser validada por áudio na automação: o navegador automatizado negou a permissão, e a interface informou o bloqueio corretamente.

## Eventos locais da UI

Estes eventos são exclusivamente uma API interna da página, NÃO uma fronteira de autenticação. Nenhum evento de DOM pode autorizar ações no computador.

1. `jax:user-command`, detail `{ text, timestamp }`: emitido exatamente uma vez para cada comando textual não vazio, após remover espaços das extremidades e antes de executar o roteamento local. Inclui cancelamento e controle de janelas, mesmo nos caminhos com retorno antecipado. Comandos vazios não emitem o evento.
2. Disparar `jax:request-ui-snapshot` para solicitar estado. Receber `jax:ui-snapshot`: `viewport` (layout), `visualViewport` com x/y/width/height/scale, `layoutMode` mobile/desktop, `compact`, `safeArea`, `windowArea` (relativa ao workspace), `fullscreenArea` (viewport) e `activeWindowId`. `workspace` tem origem real; `orb`, `composer`, `dock` têm retângulos visuais (ou null). Janelas têm `target` relativo ao workspace quando normais e relativo ao viewport quando maximizadas, conforme `coordinateSpace`; `visual` é medido no viewport, inclusive durante animações. Não confundir os sistemas de coordenadas. Inclui z, visibilidade, IDs controláveis, capacidades e permissões. Nunca incluir credenciais ou conteúdo sensível de outras abas.
   - Movimento, resize, maximizar/restaurar e minimizar usam transições de 440 ms; fechamento tem fade de 260 ms antes da remoção. O arraste manual desliga interpolação enquanto o ponteiro está capturado, para seguir o mouse diretamente. `prefers-reduced-motion` desativa as animações.
   - Minimização mantém a janela montada e inert enquanto segue visualmente ao dock; não assumir que mídia/compartilhamento de tela foi encerrado só por minimizar. Fechar desmonta e libera a captura de tela.
   - Em desktop, abrir/organizar reserva a lateral esquerda para a esfera e a área inferior para conversa. A esfera se desloca e reduz suavemente quando há janelas, voltando ao centro quando todas são minimizadas/fechadas. Arraste manual pode sobrepor elementos por decisão do usuário.
   - Solicitar novo snapshot após cada operação. O frontend também emite snapshot ao término das transições de janela e arraste. Resize do viewport limita novamente a geometria. Isto não é um planejador autônomo de IA: cabe ao backend planejar ferramentas usando estes dados.
3. `jax:ui-action`, detail `{ action, id, ... }`: ações aceitas `open` (title, query, url HTTPS opcional), `close`, `minimize`, `maximize`, `restore`, `move` (x, y finitos relativos ao workspace e limitados a `windowArea`), `resize` (width, height finitos, limitados à área útil; mínimos se ajustam quando o teclado reduz o espaço), `sidebar` (open boolean), `reply` (text). Não aceita HTML, JS, seletores arbitrários ou comandos de shell. URLs incorporadas são limitadas pelo frontend a vídeos YouTube validados.

Exemplo de consumidor futuro: após validar resposta do backend, emitir `jax:ui-action` com `action: "reply"` e o texto confirmado. Não conectar eventos de socket diretamente sem validar schema, sessão e escopo.

## Controle compartilhado e adaptação ao usuário

O usuário e o agente devem operar as mesmas janelas próprias do JAX. Preservar abertura, fechamento, movimento, tamanho, minimização, restauração e fullscreen manuais quando conectar o agente. A esfera deve se adequar às áreas ocupadas, sem esconder controles essenciais.

Toda ação manual atualiza a fonte de estado do workspace; o agente deve consultar um snapshot novo, e não reutilizar coordenadas anteriores ao arraste, resize, fechamento, rotação ou teclado. Intervenção manual tem prioridade: não desfazer o ajuste do usuário com uma resposta atrasada, não reabrir uma janela fechada sem novo pedido e suspender movimentos automáticos durante o gesto manual. O transporte futuro precisa vincular planos à revisão do layout e replanejar quando ela mudar. Os eventos locais existentes fornecem geometria e comandos, mas não implementam esse agente nem controle de janelas de outros aplicativos.

Ao girar ou redimensionar a tela, a recomposição dos limites não deve animar a largura antiga para fora do viewport. As animações normais de ações continuam; a correção do viewport é imediata.

## Serviço local obrigatório

Vercel e o navegador não têm permissão para controlar o computador de Luiz. Implementar um companion desktop (ex.: Electron/Tauri ou serviço local) com pareamento explícito, autenticação, allowlist de origens, transporte seguro, proteção contra CSRF/replay e grants por sessão. Não expor shell ou servidor local anônimo. Não usar eval nem interpolar instruções do modelo em comandos de shell.

Capacidades planejadas, todas inicialmente desconectadas:

| Capacidade | Requisito | Aprovação |
| --- | --- | --- |
| `browser.search` | Pesquisa server-side com fontes | Não altera dados |
| `browser.open` | URL validada e política de navegação | Gesto do usuário / companion |
| `browser.inspect` / `browser.click` | Extensão/companion com alvo explícito | Grant por origem e sessão |
| `screen.capture` | Captura com seletor nativo visível | Obrigatória, revogável |
| `terminal.execute` | Executável + argv estruturados, cwd permitido, timeout | Confirmar comando exato e diretório |
| `files.read` / `documents.extract` | Arquivos selecionados/escopados, limite de tamanho, parser PDF/DOCX no backend | Grant de leitura |
| `files.mkdir` / `files.move` | Paths normalizados dentro de roots autorizados, sem traversal/symlink escape | Confirmar destino / sobrescrita |
| `files.delete` | Preferir lixeira, não exclusão permanente | Sempre confirmar lista exata |
| `github.inspect` | Sessão e Vercel Connect server-only | Repositório explicitamente autorizado |
| `email.send` | Sessão, provedor autorizado e idempotência | Confirmar destinatário, assunto e corpo |
| `projects.list` | Repositórios autorizados, sessão e paginação | Escopo por usuário/projeto |
| `whatsapp.draft` | Preparar texto; hoje link externo `wa.me` | Não é envio nem leitura de conversas |
| `whatsapp.send` | Canal/API oficial apropriado e políticas do provedor | Confirmar destinatário/conteúdo e idempotência; indisponível hoje |

## Backend

O conector anteriormente verificado foi `github/jax-github-workspace`; verificar novamente antes de usar. Tokens permanecem exclusivamente no servidor. Criar sessões reais antes de acesso per-user. Não usar o nome Luiz como identidade autenticada. Toda ferramenta deve devolver requestId, estado, resultado verificável ou erro. Controle de permissões e confirmações deve ser imposto no servidor/companion, nunca apenas em botões.

Memória persistente exige banco conectado, isolamento por usuário, consentimento, exportação/exclusão e versionamento. Não armazenar segredos nos prompts/memória. Tratar páginas, PDFs e repositórios como entrada não confiável contra prompt injection. Acrescentar cancelamento, timeouts e trilha de auditoria sem tokens.

## Critérios de aceite para o backend

- Ferramentas desconectadas devolvem unavailable, nunca resultados inventados.
- Revogação de microfone/conexão interrompe a atividade.
- E-mail, terminal e exclusão nunca usam consentimento genérico como autorização ilimitada.
- Snapshot da UI informa posição/tamanho antes de planejar alterações; respeitar limites do viewport e não esconder controles de fechar.
- Respostas em fullscreen aparecem no diálogo flutuante. Hoje desaparece após 10s ou ao dispensar; integrar o fim da fala real quando houver TTS.
- Testar voz real em Chrome/Edge com permissão física: automação de navegador não comprova captura acústica.
