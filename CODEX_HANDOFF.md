# JAX — contrato de integração para o Codex

## Estado real

O frontend não é um agente de IA conectado. O roteamento textual atual é determinístico. Não há leitura de repositórios, envio de e-mail, acesso ao terminal, inspeção de tela ou manipulação de documentos. Não afirmar sucesso sem resultado verificado da ferramenta.

A interface inicia vazia: esfera, texto e compositor. A barra lateral é opt-in. `components/jax-window.tsx` implementa arraste, resize, minimizar, restaurar, fechar e maximizar sobre todo o viewport. Abrir uma janela minimiza as anteriores para impedir sobreposição automática; restaurar manualmente permite sobreposição por decisão do usuário. O dock mantém acesso às janelas minimizadas.

## Frontend

- `components/jax-workspace.tsx`: orquestra UI, teclado e histórico transitório (não persistido).
- `components/jax-window.tsx`: janelas com pointer capture no cabeçalho/alça; controles não propagam pointerdown ao arraste.
- `hooks/use-jax-voice.ts`: Web Speech API, quando disponível; um comando e escuta contínua são separados. Ativação explícita, cancelamento e erros de permissão. Não há síntese de voz. O reconhecimento pode ser processado pelo serviço do navegador: não é garantidamente offline. Não confundir escuta contínua com uma API conversacional bidirecional realtime.
- `lib/jax-bridge.ts`: contrato dos adaptadores futuros. Não há transporte autenticado implementado.
- `components/jax-capabilities.tsx`: catálogo acessível pela barra lateral. Compartilhamento usa `getDisplayMedia` com seletor nativo, prévia local e botão de parar; não envia imagens. Seleção de PDF/Word usa File API, sem upload ou extração simulada. Terminal, arquivos, exclusão e controle do navegador têm formulários de revisão que retornam `unavailable`, sem executar ações.
- Comandos locais `minimizar todas`, `fechar todas` e `organizar todas` operam apenas janelas próprias do JAX. Se não houver espaço mínimo para distribuir sem sobreposição, mantém apenas a última visível e minimiza as demais.
- A captura real do microfone não pôde ser validada por áudio na automação: o navegador automatizado negou a permissão, e a interface informou o bloqueio corretamente.

## Eventos locais da UI

Estes eventos são exclusivamente uma API interna da página, NÃO uma fronteira de autenticação. Nenhum evento de DOM pode autorizar ações no computador.

1. `jax:user-command`, detail `{ text, timestamp }`: comando textual recebido.
2. Disparar `jax:request-ui-snapshot` para solicitar estado. Receber `jax:ui-snapshot`, detail com viewport, janelas (geometria, z, visibilidade), IDs de elementos controláveis e permissões. Nunca incluir credenciais ou conteúdo sensível de outras abas.
3. `jax:ui-action`, detail `{ action, id, ... }`: ações aceitas `open` (title, query, url HTTPS opcional), `close`, `minimize`, `maximize`, `restore`, `move` (x, y finitos, limitados ao viewport), `resize` (width, height finitos, limites mínimos e viewport), `sidebar` (open boolean), `reply` (text). Não aceita HTML, JS, seletores arbitrários ou comandos de shell. URLs incorporadas são limitadas pelo frontend a vídeos YouTube validados.

Exemplo de consumidor futuro: após validar resposta do backend, emitir `jax:ui-action` com `action: "reply"` e o texto confirmado. Não conectar eventos de socket diretamente sem validar schema, sessão e escopo.

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
