# JAX

Assistente pessoal com interface minimalista de conversa, esfera animada e janelas controláveis, adaptado para **Android e PC**. O backend inicial oferece login de proprietário, histórico SQLite local e chat com provedores de IA configurados no servidor. Ferramentas externas e contas de serviços ainda precisam de integrações autorizadas.

## Comece por aqui

- [Plano completo do projeto](JAX_PROJECT_PLAN.md): visão, decisões da conversa, recursos, integrações, memória, arquitetura e ordem de implementação.
- [Contrato para o Codex](CODEX_HANDOFF.md): mapa do frontend, eventos/snapshots, ferramentas e regras de segurança.
- [Android, APK, Termux e PC](ANDROID_TERMUX_GUIDE.md): instalação web, workflow manual de APK debug e servidor LAN.
- [Backend e lista de trabalho](BACKEND_ROADMAP.md): configuração, recursos implementados e etapas seguintes.

## Desenvolvimento

Node.js compatível com Next.js 16 (preferir 22 LTS), pnpm 10 e lockfile versionado:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev:lan` e `pnpm start:lan` vinculam a `0.0.0.0` para acesso por outro dispositivo em rede confiável. Não exponha desenvolvimento à internet. No Termux, dependências nativas do Next podem exigir Linux via proot; o guia explica os limites.

Para ativar o chat, copie `.env.example` para `.env.local`, defina `JAX_OWNER_PASSWORD` e uma chave de provedor, reinicie o servidor e abra **Configurações** pelo ícone de engrenagem. São aceitos OpenAI, Google Gemini, OpenRouter, Anthropic, Groq e DeepSeek. Dentro do app é possível selecionar o modelo e apagar preferências lembradas. Para busca web, imagens e YouTube dentro do JAX, configure as chaves indicadas em `.env.example`. As chaves ficam no servidor; a janela de configurações aparece apenas quando aberta. Este primeiro backend requer Node.js 24 e armazenamento local gravável. Veja [BACKEND_ROADMAP.md](BACKEND_ROADMAP.md).

## APK

O workflow **APK Android de teste** empacota a interface no APK debug. Ao instalar, abra Configurações no JAX e informe sua própria chave de Gemini, OpenRouter ou outro provedor. Conversas, preferências e chaves ficam nos dados privados do app nesse aparelho; as chamadas às APIs de IA e busca exigem internet. Não precisa de Termux, hospedagem ou URL do JAX. O APK não controla outros aplicativos nem oferece respostas faladas nativas. O uso em navegador/PC continua disponível com o backend separado.

## Estado real

Janelas, texto, atalhos, formulários, prévias locais e voz do navegador quando suportada estão implementados. Frases finalizadas pela voz são enviadas como texto. O agente recebe as posições das janelas próprias do JAX, consulta buscas configuradas e pode abrir resultados sem fechar as janelas anteriores. Não interpreta pixels de vídeos ou de outras abas. Mensagens do modelo ficam no SQLite após login; comandos locais continuam fora desse histórico. Abrir GitHub, WhatsApp ou e-mail não concede acesso à conta nem envia mensagens automaticamente. O SQLite local não é adequado para hospedagem com disco efêmero; contas multiusuário e demais ferramentas ainda estão no plano.
