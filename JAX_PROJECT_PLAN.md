# JAX — plano completo Android, APK, PC e backend

## 1. Visão e decisões consolidadas

JAX é o assistente pessoal de Luiz, inspirado na presença do Jarvis e na simplicidade de conversa do ChatGPT/Gemini. Deve abrir com pouca informação: esfera, conversa e compositor. Ferramentas aparecem conforme o pedido, não como um painel permanentemente cheio. A inspiração não pressupõe acesso às APIs ou contas desses produtos.

Este documento consolida os requisitos disponíveis da conversa; não é uma transcrição privada nem inclui credenciais. O trabalho é conjunto: v0 desenvolve o frontend e as pontes; Codex conecta inteligência, serviços, persistência e companions. Não substituir o frontend atual por outro dashboard.

**Android é uma prioridade adicional, não substitui o PC.** A mesma interface deve funcionar no Chrome Android, no navegador desktop e em um APK Android conectado à versão publicada. O servidor também poderá ficar em uma máquina Linux ou ambiente Linux no Termux; um PC acessa a URL desse servidor. Compartilhar uma URL não concede controle do computador nem sincroniza sessões automaticamente.

O aparelho de referência é o POCO X8 Pro. A especificação física não determina pixels CSS: densidade, zoom, Chrome, teclado e barras de navegação variam. Medir o viewport real; nunca travar o layout na resolução da tela ou prometer 120 Hz por CSS.

## 2. Experiência desejada

- Conversar por texto desde o início; voz opt-in com comandos isolados e modo contínuo distintos.
- Estados visuais da esfera: repouso, ouvindo, pensando e falando; resposta ao toque/mouse. A animação `speaking` não prova que existe TTS conectado.
- Consultar clima, notícias e pesquisas; abrir um vídeo YouTube específico; combinar pedidos como “pesquisa isso e olha meu projeto”. Resultados precisam de fontes reais e datas.
- JAX precisa conhecer sua própria interface: origem do workspace, posição e tamanho reais da esfera, compositor, dock, janelas, áreas reservadas e janela ativa.
- Abrir a informação nova em destaque e minimizar a anterior. Nenhuma sobreposição automática no mobile. Desktop pode restaurar várias janelas por decisão do usuário.
- Arrastar, redimensionar, minimizar, restaurar, maximizar e fechar. Movimento programático interpolado; arraste acompanha o dedo/mouse diretamente. Nunca esconder o botão de fechar. Respeitar movimento reduzido.
- Maximizar ocupa a área útil e pode cobrir conversa/esfera; cabeçalho de navegação permanece disponível para recuperar recursos. Respostas em fullscreen usam um diálogo pequeno, rolável, arrastável e dispensável.
- Sidebar recolhida por padrão, com backdrop modal, foco gerenciado e rolagem interna. Dock horizontal recupera painéis anteriores sem cobrir o compositor.
- Em retrato, uma janela ativa; mosaicos só onde houver espaço. Ao girar ou abrir teclado, recompor geometria e preservar acesso aos controles. Em alturas muito pequenas, usar maximizar para ler o painel inteiro.
- Nenhuma mensagem “enviei”, “li seu projeto”, “executei” ou “excluí” sem retorno verificado da ferramenta correspondente.

## 3. O que está implementado nesta entrega

| Recurso | Situação real |
| --- | --- |
| Interface adaptativa Android e PC | Implementada; VisualViewport, safe-area, toque e estados compactos |
| Janelas próprias do JAX | Arraste/resize, minimizar, dock, restaurar, fullscreen e fechamento animado |
| Esfera e conversa por texto | Implementadas; histórico apenas em memória da sessão |
| Voz no navegador | Web Speech API quando disponível; ativação explícita e pausa ao sair da página |
| Pesquisa, notícias, clima | Links externos e roteamento local; não são resultados de pesquisa conectados |
| YouTube | Incorporação de URL de vídeo validada; outros sites abrem externamente |
| GitHub/Codex/ChatGPT | Atalhos externos, sem leitura de conta nem automação autenticada |
| Projetos | Campo organização/repositório e link validado ao GitHub; nenhuma listagem inventada |
| WhatsApp | Preparação de texto e abertura por `wa.me`; contato e envio confirmados no WhatsApp |
| E-mail | Acesso/preparação visual; nenhum envio real |
| Tela | `getDisplayMedia` com autorização, se suportado; alternativa de imagem com prévia local |
| PDF/Word | Seleção local; sem upload, extração ou análise conectados |
| Arquivos, terminal, exclusão, controle de navegador | Formulários/contratos; execução indisponível |
| Instalação web | Manifest e ícones; Chrome decide disponibilizar instalação/adicionar à tela inicial |
| APK | Projeto Android WebView e workflow manual de APK debug; não compilado nem testado em aparelho nesta entrega |
| Termux → PC | Scripts LAN e guia de implantação; execução física no Termux não validada |
| Memória persistente, agente, voz realtime/TTS e sync entre aparelhos | Planejados; dependem de backend real |

Não há modo offline nem service worker de cache de conversas. Recarregar pode perder contexto local. Minimizar uma janela não encerra necessariamente mídia/captura; usar parar ou fechar.

### Suportes complementares sem mudar a essência

A variedade de abordagens deve compartilhar o mesmo workspace, não criar interfaces paralelas nem substituir recursos existentes:

- **Entrada:** texto e toque/teclado hoje; voz web conforme suporte; STT/TTS/realtime conectados futuramente, sempre com alternativa por texto.
- **Dispositivo:** navegador Android e PC; instalação web quando oferecida; shell APK; servidor Linux no Termux acessível pelo PC na LAN. Retrato e paisagem ajustam a mesma interface, sem bloqueio de orientação no shell Android.
- **Informação:** links externos e vídeo incorporado hoje; pesquisa com fontes, contas e documentos analisados somente depois da conexão correspondente.
- **Ação:** preparação e revisão na UI hoje; execução remota, companion desktop e módulos nativos Android futuros, cada um com permissões próprias e revogáveis.
- **Continuidade:** estado de sessão hoje; histórico, memória e sincronização entre aparelhos apenas após backend autenticado e banco conectado.

**Invariantes visuais:** preservar a esfera como presença central, fundo escuro e acentos atuais, conversa e compositor como foco, sidebar recolhida e janelas sob demanda. Recursos novos entram nos painéis existentes; não transformar a abertura em dashboard, grade de cartões ou menu permanente. Manter alternativas quando voz, captura, instalação ou APIs nativas estiverem indisponíveis.

**Inventário obrigatório:** toda capacidade nova precisa indicar se está funcional, parcialmente disponível, aguardando conexão ou indisponível no dispositivo. Um atalho não equivale a integração e uma permissão concedida não comprova execução. Atualizar as tabelas deste plano e o handoff ao conectar cada recurso.

## 4. Arquitetura a preservar

```text
Android Chrome / APK / PC browser
           ↓ sessão e transporte autenticados
       Backend JAX — agente + ferramentas + auditoria
           ├─ serviços autorizados por usuário (GitHub, e-mail, busca…)
           ├─ banco de conversas, projetos e memória por usuário
           ├─ companion desktop pareado (arquivos, terminal, navegador)
           └─ módulo Android futuro (APIs nativas explicitamente autorizadas)
```

A URL do backend pode ser a mesma nos aparelhos. UI e grants são por dispositivo; conversas só serão compartilhadas após implementar conta, backend e persistência. Vercel não controla o PC nem o Android. Termux não contorna o sandbox do Android. APK atual não tem bridge JavaScript nativa, serviço em background, acessibilidade, shell, controle de outros apps ou captura nativa.

## 5. Integrações previstas e limites

| Integração | Como conectar depois | Permissão/limite |
| --- | --- | --- |
| GitHub e projetos | Conector server-side autorizado por usuário; listar repos, inspecionar código, branch, diff e PR | Escopo explícito por repositório; confirmar escrita; tokens nunca no cliente |
| Codex | Execução via API/serviço realmente disponível; tarefa, logs, cancelamento e diff | Abrir o site não é integração; não presumir automação da conta ChatGPT |
| ChatGPT e Gemini | Modelos por backend/API oficial quando escolhidos | Referência visual não autoriza acesso à conta pessoal |
| Google/pesquisa/notícias/clima | Ferramentas server-side com fonte, horário e região consentida | Nada de previsão ou manchete inventada; localização opt-in |
| Agenda | Provedor autorizado; leitura e eventual criação em etapas separadas | Pedir escopo mínimo; confirmar alterações |
| YouTube | Pesquisa de vídeo real e embed permitido ou abertura externa | Respeitar bloqueios de incorporação, login e reprodução |
| WhatsApp | `wa.me` já prepara texto; envio automatizado futuro apenas por canal/API oficial apropriado | Confirmar destinatário/conteúdo; consentimento, políticas e janelas da API; não automatizar clandestinamente conta pessoal |
| E-mail | Provedor autenticado, rascunho, revisão e envio server-side | Confirmar destinatários, assunto, corpo e anexos; idempotência |
| Tela Android | Módulo MediaProjection com consentimento por sessão e indicador visível | Capturar não concede cliques nem controle irrestrito; não é funcionalidade do WebView atual |
| Tela PC | Seletor nativo da web ou companion autorizado | Encerrar tracks ao parar/fechar; imagens são sensíveis |
| Navegador/abas externas | Extensão ou companion pareado, limitado a origens/alvos autorizados | A página não inspeciona nem clica arbitrariamente em outras abas |
| Arquivos/pastas/documentos | Seleção explícita ou roots autorizados no companion; parsers PDF/DOCX no backend | Limites de tamanho, tipo, traversal, symlinks e malware; sem acesso geral silencioso |
| Terminal | Companion: executável + argv estruturados, cwd permitido, timeout e cancelamento | Confirmar comando exato; nunca interpolar texto do modelo em shell |
| Exclusão | Preferir lixeira e possibilidade de desfazer | Confirmar lista exata e destino; nunca consentimento genérico |
| Voz | STT/TTS/realtime no backend; streaming, interrupção e estado sincronizado com áudio | Indicador e botão parar; testar eco, latência, perda de rede e troca de app |

O contrato anterior menciona o conector `github/jax-github-workspace`: revalidar conexão, escopo e autorização antes de usá-lo. Nenhuma integração foi provisionada apenas por aparecer nesta lista.

## 6. Memória e arquivos de contexto futuros

Implementar persistência em banco conectado com isolamento por usuário, não em localStorage. Memória deve distinguir fatos confirmados, preferências, contexto de projeto e resumo de conversa, com origem, data, versão e opção de corrigir/apagar/exportar. Não memorizar tokens, senhas, dados privados de documentos por padrão ou instruções de páginas como se fossem do usuário.

Namespaces sugeridos: `profile`, `preferences`, `projects/{id}`, `conversations/{id}`, `tasks/{id}`. Se o Codex usar arquivos de contexto de agente, gerar `profile.md`, `preferences.md`, `project-context.md` e `decisions.md` a partir de dados autorizados; estes arquivos não devem ser publicados automaticamente no GitHub. O repositório guarda a especificação e código, não a memória pessoal de produção.

## 7. Contrato de ferramentas e UI

Ver `CODEX_HANDOFF.md` e `lib/jax-bridge.ts`. Requests futuros devem conter requestId, sessão autenticada, ferramenta, parâmetros validados, alvo/dispositivo, escopo e revisão de confirmação. Resultados: unavailable, awaiting-approval, running, completed, failed ou cancelled, com `verified` e dados verificáveis. O campo `requiresApproval` vindo do cliente não é uma decisão de segurança.

Receber snapshot antes de planejar janelas e após a animação. Os retângulos visuais são pixels CSS no viewport; limites normais e posições de janelas normais usam origem do workspace. Em fullscreen o alvo usa coordenadas do viewport. Considerar `visualViewport` e seus offsets, safe-area, compositor, dock e `activeWindowId`; nunca usar resolução física do POCO.

Eventos `jax:ui-action` são locais e sem autoridade de backend. Validar e autorizar respostas de transporte no servidor e validar schema no cliente. Não aceitar scripts, seletores arbitrários, URLs inseguras ou comandos de shell nesses eventos.

## 8. Ordem proposta para o Codex

1. Ler este plano, o handoff e executar a interface atual; não refazer a UX desktop/mobile.
2. Implementar sessões reais, transporte autenticado, validação de schemas e isolamento por usuário/dispositivo. Confirmar serviços já conectados antes de escolher novos.
3. Conectar agente e ferramentas de leitura com resultados verificáveis e fontes; substituir roteamento determinístico sem perder ações locais.
4. Conectar GitHub/projetos/Codex com escopos, branch de trabalho, logs e revisão de diff. Não executar writes em `main` sem autorização explícita.
5. Implementar memória e sync entre dispositivos com consentimento, conflitos/versionamento e exclusão/exportação.
6. Conectar STT/TTS/realtime e testar conversa real no aparelho e no PC. O estado `speaking` segue áudio real, não um timer.
7. Conectar envio de e-mail e eventual canal oficial WhatsApp com revisão vinculada ao conteúdo e idempotência.
8. Implementar companion desktop pareado e capacidades nativas Android em módulos separados, com grants revogáveis.
9. Validar shell Android, assinar APK release com keystore protegido e definir distribuição/atualizações. Avaliar TWA/Capacitor apenas se trouxer benefício comprovado, sem duplicar o frontend.
10. Reforçar rate limiting, limites de custo, cancelamento, auditoria redigida, observabilidade e testes de segurança.

## 9. Critérios de aceite e validação manual

- Android 360/393/412 px CSS, paisagem, zoom, teclado aberto/fechado e desktop: nenhum controle vital fora da área útil; compositor acessível fora de fullscreen.
- Abrir duas ou mais janelas, minimizar, restaurar pelo dock/sidebar, expandir e voltar, arrastar e resize por dedo/mouse. No mobile uma ativa; desktop preserva múltiplas quando solicitadas.
- Consultar snapshot durante e após movimento: `target` e `visual` podem diferir na transição e devem convergir ao fim. Não avaliar uma captura no meio dos 440 ms como posição final.
- Sidebar retorna foco, fecha por Escape/backdrop e permite rolagem. Animações respeitam preferência por movimento reduzido.
- No POCO real: Chrome com barras expandidas/recolhidas, teclado/IME, gesto voltar, recorte, instalação, links WhatsApp/e-mail e alternância entre apps. A automação não comprova essas condições físicas.
- Microfone físico: permitir, negar, revogar, parar, suspender ao trocar de app e retomar somente por gesto. Sem promessa de wake word ou escuta em background.
- APK: compilar e executar lint no workflow; instalar em Android real, validar WebView atualizado, seleção de arquivo, links externos, teclado, voltar e permissões. Debug não é release assinado para loja.
- Servidor Termux/Linux: abrir URL pelo PC na mesma LAN; testar firewall e suspensão de bateria; confirmar que páginas HTTP em IP privado não oferecem necessariamente voz/captura.
- Backend: nenhum resultado inventado; cancelamento não vira sucesso; mensagens, escrita de código, terminal e exclusão exigem confirmação específica verificável.

## 10. Mapa de arquivos e guias

- `components/jax-workspace.tsx`: comandos, histórico transitório, janelas e eventos.
- `hooks/use-jax-layout.ts` / `lib/jax-layout.ts`: viewport visual, áreas reservadas e geometria.
- `components/jax-window.tsx` / `jax-floating-reply.tsx`: janelas e diálogo fullscreen.
- `components/jax-sidebar.tsx` / `jax-resource-panels.tsx`: atalhos, projetos e WhatsApp.
- `hooks/use-jax-voice.ts`: reconhecimento web e ciclo de vida.
- `styles/jax-mobile.css`: adaptação por largura/altura sem abandonar desktop.
- `app/manifest.ts` e `public/jax-icon*`: instalação web, sem promessa de offline.
- `android/` e `.github/workflows/android-apk.yml`: base APK e build manual.
- `ANDROID_TERMUX_GUIDE.md`: instalação, build e acesso via LAN.
- `CODEX_HANDOFF.md`: API local, segurança e ponte com o backend.

## 11. Fontes técnicas

- POCO X8 Pro: https://www.mi.com/global/product/poco-x8-pro/specs/
- VisualViewport: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- Manifest web: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- MediaProjection: https://developer.android.com/media/grow/media-projection
- Android WebView: https://developer.android.com/develop/ui/views/layout/webapps/managing-webview
- Permissões WebView: https://developer.android.com/reference/android/webkit/PermissionRequest
- Segurança de WebView: https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges
- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting

Atualização: 30/10/2026. Funcionalidades marcadas como futuras não foram implementadas pelo simples acréscimo deste plano.
