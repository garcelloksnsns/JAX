# Backend JAX: implementação e próximos passos

## Etapa 1: núcleo local (implementada no código)

- Sessão de proprietário por senha configurada no servidor; cookie HttpOnly e revogação no logout.
- SQLite local para sessões e histórico de conversa. Mensagens ficam isoladas pelo identificador de usuário da sessão.
- API de chat com OpenAI, Google Gemini, OpenRouter, Anthropic, Groq e DeepSeek. Chaves ficam em variáveis do servidor.
- Janela de configurações aberta pelo ícone de engrenagem; mostra login, provedores disponíveis, seleção de modelos e preferências lembradas. Nenhuma chave é enviada ao navegador.
- Planejamento de buscas pelo modelo com preferências explícitas e geometria das janelas; resultados reais de web, imagens e YouTube quando as APIs correspondentes estão configuradas.
- Preferências ditas como “eu gosto de…” ou “lembre que…” são persistidas e podem ser removidas em Configurações.
- Ações do agente em janelas próprias são validadas, limitadas a IDs observados e descartadas se o usuário alterar as janelas enquanto a resposta é gerada. Janelas abertas pelo agente preservam as demais.
- Ferramentas sem adaptador retornam `unavailable`, sem simular execução.

### Como executar

Requer Node.js 24, servidor Node com disco gravável, pnpm e ao menos uma chave de provedor.

1. Copie `.env.example` para `.env.local`.
2. Escolha uma senha exclusiva de pelo menos 16 caracteres em `JAX_OWNER_PASSWORD` e configure uma chave de provedor. Para busca dentro do JAX, configure Brave Search, Tavily ou Google Programmable Search; para imagens, Brave Search ou Google; para vídeos, YouTube Data API. Não publique `.env.local`.
3. Execute `pnpm install --frozen-lockfile` e `pnpm dev`.
4. Abra o JAX, clique na engrenagem, entre e escolha o provedor/modelo. Peça uma pesquisa, imagem ou vídeo. Sem a chave da ferramenta, o JAX informa a indisponibilidade e oferece links externos quando possível.

O SQLite local não serve para implantação em Vercel ou outra plataforma com disco efêmero. Para acesso pela internet, usar HTTPS, banco persistente e limites de tentativas antes de publicar. O login atual é de proprietário único, não é um sistema de contas multiusuário.

## Lista de trabalho restante

1. **Infraestrutura de produção:** banco gerenciado, migrações, backups, criptografia de dados sensíveis, logs sem segredos, observabilidade, testes de carga e rate limiting distribuído.
2. **Contas e dispositivos:** usuários reais, recuperação de acesso, sessões por dispositivo, revogação, sincronização e política de retenção/exportação/exclusão.
3. **Chat:** streaming, cancelamento, limite de custo/tokens, catálogo dinâmico e disponibilidade real dos modelos, tratamento de erros e histórico por conversa.
4. **Memória:** consentimento granular, namespaces, origem dos fatos, correção, exportação e proteção contra instruções de conteúdo externo. O mecanismo atual guarda apenas preferências explicitamente ditas.
5. **Ferramentas de leitura:** ampliar busca com paginação e notícias dedicadas, GitHub autorizado, leitura de documentos com limites e parser seguro, projetos e calendário. As buscas atuais dependem das chaves informadas.
6. **Ferramentas com escrita:** rascunhos, revisão vinculada ao conteúdo, confirmação no servidor, idempotência e auditoria para e-mail, agenda, arquivos e outras ações.
7. **Companion desktop:** pareamento, grants por pasta/origem/sessão, execução estruturada de comandos, cancelamento e isolamento do terminal.
8. **Navegador e tela:** extensão/companion, autorização por aba e origem, captura opt-in, expiração de grants e proteção contra prompt injection.
9. **Voz e Android:** o reconhecimento do navegador já envia cada frase finalizada como comando. Faltam STT/TTS em tempo real, estado de áudio sincronizado, teste físico no navegador e APK e módulo nativo quando necessário.
10. **Qualidade e distribuição:** testes de integração e segurança, CI do backend, build do APK, release assinada, atualizações e documentação operacional.

Serviços externos exigem suas próprias credenciais e concessões. Nenhuma ferramenta de escrita será ativada apenas por instrução do modelo.
