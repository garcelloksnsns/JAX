# JAX no Android, APK, Termux e PC

**APK local:** o workflow da branch `codex/jax-agent-apk` agora empacota a interface no APK. Não é necessário Termux nem URL publicada para essa edição. Cada pessoa informa suas chaves nas Configurações do app. A interface e a memória funcionam localmente; IA, pesquisa e vídeos precisam de internet e das chaves correspondentes. As instruções de URL e WebView abaixo descrevem a edição anterior e ficam como referência para servir o projeto no PC/Termux.

A interface web é compartilhada: não existe uma versão mobile que substitua o PC. A implementação não é um aplicativo React Native; dependências legadas Expo/React Native do template não constituem um build nativo. O projeto Android desta entrega é um shell WebView separado, sem JavaScript bridge nativa.

## 1. Usar agora no Android e PC

Abra a URL HTTPS publicada no Chrome Android ou no computador. No Android, use o menu → Adicionar à tela inicial ou Instalar app quando o Chrome oferecer. Manifest e ícones estão incluídos. Não há garantia de instalação, modo offline ou reconhecimento de voz em todo navegador.

No PC, janelas continuam arrastáveis e redimensionáveis; sidebar, dock, voz e teclado são preservados. No mobile, uma janela ativa evita sobreposição e o dock recupera as outras. A largura e altura CSS reais, não o modelo do celular, determinam o layout.

## 2. APK de teste pelo GitHub — sem terminal no celular

1. Integrar a branch de trabalho por PR no repositório correto, após revisão. Um workflow novo precisa estar na branch padrão para aparecer como workflow manual no GitHub.
2. Publicar o frontend Next.js e copiar sua URL HTTPS real. Não usar URL de preview com autenticação que exija sair da origem; o shell só mantém a origem configurada dentro do WebView.
3. No GitHub, abrir **Actions → APK Android de teste → Run workflow**; selecionar a branch `codex/jax-agent-apk`. O APK dessa branch já inclui a interface e não pede URL.
4. O workflow instala JDK 17, Gradle 8.13 e Android SDK 35; executa `assembleDebug` e `lintDebug`.
5. Se passar, baixar o artifact `jax-android-debug`; extrair `app-debug.apk` e instalar no Android aceitando a instalação dessa fonte conscientemente.

Esse fluxo **não foi executado nesta entrega**: não foi disponibilizado um APK binário testado. O ambiente de desenvolvimento atual não tem JDK/Android SDK/Gradle. A base deve passar pelo workflow e por teste físico. O APK debug não é uma release de produção nem uma publicação na Play Store. Builds separados podem ter chaves debug diferentes e não atualizar uma instalação anterior.

O APK conecta ao frontend publicado; não embute Node.js, Next.js, banco nem backend. A URL pode ser alterada no botão de configuração dentro do APK. Atualizações da web chegam pelo servidor. Assinatura release, keystore em secrets, versionamento, deep links e distribuição são tarefas posteriores. Nenhuma credencial deve entrar em `app_url`, BuildConfig, APK ou repositório.

### Limites e segurança do shell

- URL HTTPS validada no build quando informada e sempre ao configurar no app; sem HTTP cleartext, bypass de erro TLS, acesso `file://` ou bridge `addJavascriptInterface`.
- Navegação principal permanece na origem configurada. Links externos com gesto são confirmados e abertos fora do WebView. Schemes aceitos: HTTPS, mailto e tel; não executar URLs `javascript:`, `intent:` ou comandos arbitrários.
- WebView pode não implementar SpeechRecognition. Usar texto ou o botão de abrir no navegador; permissão de áudio não cria reconhecimento de voz. O backend STT/TTS ainda precisa ser conectado.
- Só pede RECORD_AUDIO se a origem confiável solicitar áudio; há permissão Android e confirmação por sessão. Câmera, geolocalização, acessibilidade e serviço em background não estão habilitados.
- Seletor de documentos concede acesso apenas ao arquivo escolhido; não há permissão de armazenamento geral.
- Captura nativa contínua exigirá MediaProjection, consentimento e política de ciclo de vida. Não está implementada.
- OAuth com redirecionamento entre origens pode precisar do navegador do sistema e callback/deep link no futuro. Não relaxar a allowlist para “consertar” login.

### Compilação local em um PC de desenvolvimento

Com Android SDK 35, JDK 17 e Gradle 8.13 instalados:

```bash
cd android
gradle '-PappUrl=https://SUA-URL-JAX/' assembleDebug lintDebug
```

A URL é um argumento público de build, não uma variável secreta. APK em `android/app/build/outputs/apk/debug/app-debug.apk`. Não há Gradle wrapper versionado nesta base; o workflow fornece a versão explicitamente. Android Studio pode importar `android/`, desde que a propriedade Gradle `appUrl` seja definida antes do sync.

## 3. Servir no Termux e abrir pelo computador

Isso significa rodar um servidor no celular e acessar pelo navegador do PC na mesma rede. Não significa executar o APK dentro do Termux, acessar o terminal pelo frontend ou controlar o PC. Esta configuração física ainda não foi testada neste projeto.

### Caminho recomendado

O backend local atual usa `node:sqlite` e requer Node.js 24. O SWC e dependências nativas não têm suporte garantido no Android/Termux direto. Use uma máquina Linux remota ou uma distribuição Linux ARM64 via `proot-distro` no Termux, com Node Linux e pnpm. Não presumir que instalar `nodejs` diretamente no Android basta.

No Termux, um caminho inicial é instalar `git` e `proot-distro`, instalar Ubuntu pelo proot-distro e entrar nele. Dentro do Ubuntu, instalar Node 22 LTS para Linux ARM64 e pnpm 10 compatível com o lockfile. Esses passos dependem da distribuição e arquitetura e devem seguir a documentação oficial do Termux/proot-distro. O Codex pode preparar um bootstrap específico após validar no POCO.

Dentro desse Linux com ferramentas prontas:

```bash
git clone --branch v0/jax-conversation-first https://github.com/garcelloksnsns/JAX.git
cd JAX
  pnpm install --frozen-lockfile
pnpm dev:lan
```

No Chrome do celular: `http://127.0.0.1:3000`. No PC conectado à mesma rede Wi-Fi: `http://IP-LOCAL-DO-CELULAR:3000`. Obtenha o endereço IPv4 nos detalhes da rede Wi-Fi do Android; não use `localhost` no PC, pois ele apontaria para o próprio computador. Redes de convidados e isolamento de clientes podem bloquear a comunicação.

O script `dev:lan` vincula o servidor a `0.0.0.0`. Qualquer dispositivo com acesso à porta nessa rede pode alcançar a interface; isso não implementa autenticação. Use apenas rede confiável e nunca faça port forwarding do servidor de desenvolvimento.

Para um servidor em produção local, no ambiente Linux compatível:

```bash
pnpm build
pnpm start:lan
```

O build pode ser pesado no celular. Manter o terminal ativo e evitar otimizações agressivas de bateria pode ser necessário; não há wake lock automático, serviço persistente ou garantia de execução em segundo plano. Ajustes do sistema são escolha do usuário.

### HTTPS, voz e acesso remoto

HTTP em IP privado geralmente não é secure context: microfone, reconhecimento/captura e outras APIs podem estar indisponíveis. `localhost` pode ser tratado de modo diferente, mas isso não transfere a confiança ao acesso pelo PC. Não desabilitar segurança do navegador.

Para uso fora da LAN, preferir frontend hospedado HTTPS e backend autenticado, ou VPN/reverse proxy TLS com autenticação e origens autorizadas. Não expor `.env`, servidor Next dev, shell, banco ou WebSocket sem autenticação. Nenhum túnel público ou serviço de terminal remoto é criado por este projeto.

Abrir a mesma URL em dois dispositivos **não sincroniza** a conversa transitória. Essa função requer conta, backend e banco por usuário; ver `JAX_PROJECT_PLAN.md`.

## 4. Checklist físico no POCO e no PC

- Chrome atualizado, Android System WebView atualizado e modo retrato/paisagem.
- Digitar com teclado real/IME, abrir/fechar teclado, usar zoom e voltar do sistema.
- Abrir projetos, GitHub, Codex, WhatsApp e e-mail; confirmar que nenhuma mensagem foi enviada automaticamente.
- Dock com várias janelas, fullscreen, fechar/restaurar, arraste e resize por toque; sidebar rolável e foco correto.
- Voz: permitir/negar/revogar microfone e alternar para outro app. A escuta não deve recomeçar em background.
- Selecionar imagem/PDF/Word e remover; verificar que não há upload automático.
- APK: testar link externo, voltar, suspensão, falta de rede, rejeição de HTTPS inválido e limite de origem.
- PC acessando servidor do celular: testar LAN, bloqueio de firewall, bateria e perda de conexão.

## Fontes

- https://nextjs.org/docs/app/getting-started/installation
- https://nextjs.org/docs/app/guides/self-hosting
- https://github.com/termux/proot-distro
- https://developer.android.com/develop/ui/views/layout/webapps/managing-webview
- https://developer.android.com/reference/android/webkit/PermissionRequest
- https://developer.android.com/media/grow/media-projection
