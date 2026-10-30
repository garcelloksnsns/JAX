"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUp, AudioLines, Mic, PanelLeft, Settings2, Square } from "lucide-react"
import { useJaxLayout } from "@/hooks/use-jax-layout"
import { fitWindow, resizeWindow } from "@/lib/jax-layout"
import { JaxSidebar, type JaxResource as Resource } from "@/components/jax-sidebar"
import { JaxResourcePanel } from "@/components/jax-resource-panels"
import { JaxFloatingReply } from "@/components/jax-floating-reply"
import { ParticleOrb } from "@/components/particle-orb"
import { JaxWindow, type JaxWindowState, type WindowPatch } from "@/components/jax-window"
import { useJaxVoice } from "@/hooks/use-jax-voice"
import { capabilities, JaxCapabilityContent } from "@/components/jax-capabilities"
import { JaxSettings, type ModelProvider, type RememberedPreference } from "@/components/jax-settings"
import { JaxSearchPanel } from "@/components/jax-search-panel"
import { JaxVideoPanel } from "@/components/jax-video-panel"
import { JaxImagePanel } from "@/components/jax-image-panel"

type Message = { id: string; role: "user" | "jax"; text: string }
type AgentAction = { type: "open"; kind: "search" | "image" | "video"; query: string; image?: { title: string; imageUrl: string; sourceUrl: string }; video?: { id: string; title: string; url: string; embedUrl: string } } | { type: "window"; id: string; operation: "resize" | "minimize" | "maximize" | "restore" | "close"; width?: number; height?: number }
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return url.protocol === "https:" ? url.href : undefined } catch { return undefined } }

export function JaxWorkspace() {
  const [sidebar, setSidebar] = useState(false)
  const [windows, setWindows] = useState<JaxWindowState[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [processing, setProcessing] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(false)
  const [backendConfigured, setBackendConfigured] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [providers, setProviders] = useState<ModelProvider[]>([])
  const [provider, setProvider] = useState("")
  const [model, setModel] = useState("")
  const [backendError, setBackendError] = useState("")
  const [preferences, setPreferences] = useState<RememberedPreference[]>([])
  const root = useRef<HTMLElement>(null)
  const desktop = useRef<HTMLDivElement>(null)
  const layout = useJaxLayout(root, desktop)
  const layoutRef = useRef(layout)
  useLayoutEffect(() => { layoutRef.current = layout }, [layout])
  const previousArea = useRef(layout.normal)
  const transcript = useRef<HTMLDivElement>(null)
  const z = useRef(2)
  const windowVersion = useRef(0)
  const closeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const full = windows.some((item) => item.maximized && !item.minimized)
  const latest = messages.filter((message) => message.role === "jax").at(-1)
  useLayoutEffect(() => { windowVersion.current += 1 }, [windows])

  const refreshBackend = useCallback(async () => {
    try {
      const sessionResponse = await fetch("/api/jax/session", { cache: "no-store" })
      const session = await sessionResponse.json() as { configured: boolean; authenticated: boolean }
      setBackendConfigured(session.configured)
      setAuthenticated(session.authenticated)
      if (!session.authenticated) return
      const [providersResponse, chatResponse, memoryResponse] = await Promise.all([fetch("/api/jax/providers", { cache: "no-store" }), fetch("/api/jax/chat", { cache: "no-store" }), fetch("/api/jax/memory", { cache: "no-store" })])
      if (!providersResponse.ok || !chatResponse.ok || !memoryResponse.ok) throw new Error("Não foi possível carregar a sessão.")
      const available = (await providersResponse.json() as { providers: ModelProvider[] }).providers
      const history = (await chatResponse.json() as { messages: { id: string; role: "user" | "assistant"; text: string }[] }).messages
      setPreferences((await memoryResponse.json() as { preferences: RememberedPreference[] }).preferences)
      setProviders(available)
      setProvider((previous) => available.find((item) => item.id === previous && item.configured)?.id || available.find((item) => item.configured)?.id || "")
      setMessages(history.map((item) => ({ id: item.id, role: item.role === "assistant" ? "jax" : "user", text: item.text })))
      setBackendError("")
    } catch { setBackendError("Não foi possível conectar ao backend.") }
  }, [])

  useEffect(() => { void refreshBackend() }, [refreshBackend])

  async function login(password: string) {
    try {
      const response = await fetch("/api/jax/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
      if (!response.ok) { setBackendError((await response.json() as { error: string }).error); return }
      await refreshBackend()
    } catch { setBackendError("Não foi possível entrar.") }
  }

  async function logout() {
    try { await fetch("/api/jax/logout", { method: "POST" }) } catch { /* A interface ainda encerra a sessão local. */ }
    setAuthenticated(false)
    setProviders([])
    setProvider("")
    setModel("")
    setBackendError("")
    setMessages([])
    setPreferences([])
  }

  async function forget(id: string) {
    try {
      const response = await fetch("/api/jax/memory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (response.ok) setPreferences((items) => items.filter((item) => item.id !== id))
      else setBackendError("Não foi possível remover a preferência.")
    } catch { setBackendError("Não foi possível remover a preferência.") }
  }

  async function askBackend(text: string) {
    if (!authenticated || !provider) { respond("Abra Configurações para entrar e escolher um provedor de IA com chave configurada."); return }
    if (model === "custom") { respond("Informe o identificador do modelo em Configurações."); return }
    const version = windowVersion.current
    const area = layoutRef.current.normal
    const screen = { viewport: { width: window.innerWidth, height: window.innerHeight }, activeWindowId: [...windows].filter((item) => !item.minimized && !item.closing).sort((a, b) => b.z - a.z)[0]?.id || null, windows: windows.map((item) => ({ id: item.id, title: item.title, x: area.x + item.x, y: area.y + item.y, width: item.width, height: item.height, minimized: item.minimized, maximized: item.maximized, z: item.z, videoId: item.embedUrl?.match(/\/embed\/([\w-]{11})/)?.[1] })) }
    try {
      const response = await fetch("/api/jax/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, provider, screen, ...(model.trim() ? { model: model.trim() } : {}) }) })
      const data = await response.json() as { messages?: { text: string; role: string }[]; actions?: AgentAction[]; remembered?: RememberedPreference | null; error?: string }
      if (!response.ok) { respond(data.error || "Não foi possível obter resposta do modelo."); return }
      if (data.remembered) setPreferences((items) => [data.remembered!, ...items])
      let stale = false
      if (windowVersion.current !== version) stale = true
      else for (const action of data.actions || []) applyAgentAction(action)
      respond((data.messages?.find((item) => item.role === "assistant")?.text || "O modelo retornou uma resposta vazia.") + (stale && data.actions?.length ? "\nAs janelas mudaram enquanto eu respondia. Mantive seus ajustes; peça novamente se quiser aplicar as ações." : ""))
    } catch { respond("Não foi possível conectar ao modelo.") }
  }

  const respond = useCallback((text: string) => {
    setProcessing(false)
    setMessages((items) => [...items.slice(-49), { id: crypto.randomUUID(), role: "jax", text }])
    setNoticeVisible(true)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNoticeVisible(false), 10000)
  }, [])

  const open = useCallback((resource: Resource, maximized = false) => {
    const pendingClose = closeTimers.current.get(resource.id)
    if (pendingClose) { clearTimeout(pendingClose); closeTimers.current.delete(resource.id) }
    const area = layoutRef.current.normal
    const width = Math.min(660, area.width)
    const height = Math.min(410, area.height)
    const nextZ = ++z.current
    setWindows((items) => [
      ...items.filter((item) => item.id !== resource.id).map((item) => ({ ...item, minimized: true, maximized: false })),
      { ...resource, x: area.x + (area.width - width) / 2, y: area.y + (area.height - height) / 2, width, height, z: nextZ, minimized: false, maximized },
    ])
  }, [])

  const openAlongside = useCallback((resource: Resource) => {
    const area = layoutRef.current.normal
    setWindows((items) => {
      const visible = items.filter((item) => !item.minimized && !item.closing && item.id !== resource.id)
      const width = Math.min(600, visible.length ? Math.max(260, area.width * 0.52) : area.width)
      const height = Math.min(410, area.height)
      const x = visible.length ? area.x + Math.max(0, area.width - width) : area.x + (area.width - width) / 2
      const y = area.y + Math.max(0, (area.height - height) / 2)
      return [...items.filter((item) => item.id !== resource.id), { ...resource, x, y, width, height, z: ++z.current, minimized: false, maximized: false }]
    })
  }, [])

  function applyAgentAction(action: AgentAction) {
    if (action.type === "open") {
      if (action.kind === "video" && action.video && /^[\w-]{11}$/.test(action.video.id)) openAlongside({ id: "youtube", title: "YouTube", query: action.video.title.slice(0, 120), url: `https://www.youtube.com/watch?v=${action.video.id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${action.video.id}` })
      if (action.kind === "search" && typeof action.query === "string") openAlongside({ id: "search-agent", title: "Pesquisa", query: action.query.slice(0, 200), url: `https://www.google.com/search?q=${encodeURIComponent(action.query.slice(0, 200))}` })
      if (action.kind === "image" && action.image) { try { const image = new URL(action.image.imageUrl); const source = new URL(action.image.sourceUrl); if (image.protocol === "https:" && source.protocol === "https:") openAlongside({ id: "image-agent", title: "Imagem", query: action.image.title.slice(0, 200), imageUrl: image.href, sourceUrl: source.href }) } catch { /* URL inválida é ignorada. */ } }
      return
    }
    if (action.type !== "window" || typeof action.id !== "string" || !windows.some((item) => item.id === action.id)) return
    const intent = action.operation
    if (intent === "close") closeWindow(action.id)
    else if (intent === "minimize") patch(action.id, { minimized: true, maximized: false })
    else if (intent === "maximize") patch(action.id, { minimized: false, maximized: true })
    else if (intent === "restore") patch(action.id, { minimized: false, maximized: false })
    else if (intent === "resize" && typeof action.width === "number" && typeof action.height === "number") {
      const item = windows.find((candidate) => candidate.id === action.id)
      if (item && !item.maximized) patch(action.id, resizeWindow(item, action.width, action.height, layoutRef.current.normal))
    }
  }

  const patch = useCallback((id: string, update: WindowPatch) => {
    setWindows((items) => items.map((item) => item.id === id ? { ...item, ...update, ...(update.minimized === false ? { closing: false } : {}) } : update.maximized || (layoutRef.current.mobile && update.minimized === false) ? { ...item, minimized: true, maximized: false } : item))
  }, [])

  const closeWindow = useCallback((id: string) => {
    if (closeTimers.current.has(id)) return
    setWindows((items) => items.map((item) => item.id === id ? { ...item, closing: true } : item))
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 270
    closeTimers.current.set(id, setTimeout(() => {
      setWindows((items) => items.filter((item) => item.id !== id))
      closeTimers.current.delete(id)
    }, duration))
  }, [])

  const voice = useJaxVoice(execute, respond)

  function execute(raw: string) {
    const text = raw.trim()
    if (!text) return
    window.dispatchEvent(new CustomEvent("jax:user-command", { detail: { text, timestamp: Date.now() } }))
    setDraft("")
    setMessages((items) => [...items.slice(-49), { id: crypto.randomUUID(), role: "user", text }])
    setProcessing(true)
    const command = normalize(text)
    const target = [...windows].reverse().find((item) => command.includes(normalize(item.title)) || command.includes(item.id)) ?? [...windows].reverse().find((item) => !item.minimized)
    const finish = (message: string) => { if (responseTimer.current) clearTimeout(responseTimer.current); responseTimer.current = setTimeout(() => respond(message), 200) }
    if (/^(pare|parar|cancele|cancelar)(\b|$)/.test(command)) { voice.stop(); setProcessing(false); finish("Escuta interrompida. Nenhuma ação externa está em execução."); return }
    if (/todas|tudo/.test(command) && /fech|minimiz|restaur|organiz/.test(command)) {
      if (/fech/.test(command)) windows.forEach((item) => closeWindow(item.id))
      else if (/minimiz/.test(command)) setWindows((items) => items.map((item) => ({ ...item, minimized: true, maximized: false })))
      else {
        const area = layoutRef.current.normal
        const reservedLeft = area.x
        const width = area.width
        const height = area.height
        const count = windows.length
        const columns = Math.max(1, Math.min(count, Math.floor(width / 240)))
        const rows = Math.max(1, Math.ceil(count / columns))
        if (layoutRef.current.mobile || width / columns < 220 || height / rows < 160) {
          setWindows((items) => items.map((item, index) => ({ ...item, minimized: index !== items.length - 1, maximized: false })))
          finish("Não há espaço para todas sem sobreposição. Deixei a última visível e as demais no dock.")
          return
        }
        setWindows((items) => items.map((item, index) => ({ ...item, minimized: false, maximized: false, x: reservedLeft + (index % columns) * width / columns, y: 12 + Math.floor(index / columns) * height / rows, width: width / columns - 8, height: height / rows - 8 })))
      }
      finish(/fech/.test(command) ? "Fechei todas as janelas do JAX." : /minimiz/.test(command) ? "Minimizei todas as janelas do JAX. Elas continuam no dock." : "Organizei as janelas do JAX dentro da área disponível.")
      return
    }
    if (/fech(e|ar|a)|minimiz|tela cheia|maximiz|restaur/.test(command) && target && !/https:|youtube|video/.test(command)) {
      if (/fech(e|ar|a)/.test(command)) closeWindow(target.id)
      else patch(target.id, { minimized: command.includes("minimiz"), maximized: /tela cheia|maximiz/.test(command) })
      finish(`Janela ${target.title} ${/fech/.test(command) ? "fechada" : /minimiz/.test(command) ? "minimizada" : /restaur/.test(command) ? "restaurada" : "em tela cheia"}.`)
      return
    }
    const urlMatch = text.match(/https:\/\/[^\s]+/)
    let videoId: string | null = null
    if (urlMatch) { try { const url = new URL(urlMatch[0]); if (["www.youtube.com", "youtube.com", "m.youtube.com"].includes(url.hostname)) videoId = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1] ?? null; if (url.hostname === "youtu.be") videoId = url.pathname.slice(1) } catch { /* URLs inválidas não são incorporadas. */ } }
    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      open({ id: "youtube", title: "YouTube", query: "Vídeo", url: `https://www.youtube.com/watch?v=${videoId}`, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` }, command.includes("tela cheia"))
      finish("Abri o vídeo. Você pode reproduzir, redimensionar e fechar a janela; a reprodução depende da permissão de incorporação do YouTube.")
    } else if (authenticated && provider && /youtube|video|musica|pesquis|busc|google|notici|foto|imagem|clima/.test(command)) {
      void askBackend(text)
    } else if (/terminal|exclu|apagar|pastas?|arquivos?|documentos?|pdf|word|clicar|minha tela|ver.*tela|compartilh.*tela|navegador.*control/.test(command)) {
      const id = /minha tela|ver.*tela|compartilh.*tela/.test(command) ? "screen" : /terminal/.test(command) ? "terminal" : /pdf|word/.test(command) ? "documents" : /exclu|apagar/.test(command) ? "delete" : /clicar|navegador/.test(command) ? "browser-control" : "files"
      const capability = capabilities.find((item) => item.id === id)!
      open({ id, title: capability.title, query: text })
      finish(id === "screen" ? "Abri o compartilhamento de tela. Clique em escolher tela ou janela para conceder acesso; não há análise por IA ou controle remoto conectado." : "Abri o painel solicitado. Você pode preparar a ação, mas o serviço local ainda não está conectado: não executei comandos nem alterei arquivos.")
    } else if (/whats(app)?|zap\b/.test(command)) {
      open({ id: "whatsapp", title: "WhatsApp", query: text })
      finish("Abri a preparação de mensagem. Você escolhe o contato e confirma o envio no WhatsApp; não enviei nada.")
    } else if (/projetos?|repositorio/.test(command) && !/github|codex|chatgpt/.test(command)) {
      open({ id: "projects", title: "Projetos", query: text })
      finish("Abri seus projetos. Informe organização/repositório para abrir no GitHub; leitura e alterações exigem conexão autenticada.")
    } else if (/instalar|android|apk|termux/.test(command)) {
      open({ id: "install", title: "Android, APK e PC", query: text })
      finish("Abri as orientações de Android, APK e PC. O backend e as permissões são compartilhados pela arquitetura, não concedidos automaticamente.")
    } else if (/e-mail|email|enviar mensagem/.test(command)) {
      open({ id: "email", title: "E-mail", query: text, url: "https://mail.google.com/mail/u/0/#inbox" })
      finish("Abri o acesso ao e-mail. Não enviei nenhuma mensagem: envio exige autenticação no backend e sua confirmação do destinatário e conteúdo.")
    } else if (/youtube|video/.test(command)) {
      const query = text.replace(/^(ei\s+)?jax[,\s]*/i, "").replace(/^(abre|abra|abrir|busque|pesquise)\s+/i, "")
      open({ id: "youtube", title: "YouTube", query, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` }, command.includes("tela cheia"))
      finish("Preparei a pesquisa no YouTube. Abra o resultado pelo botão da janela; cole um link de vídeo aqui para reproduzi-lo no JAX.")
    } else if (/github|codex|chatgpt|chat de apt/.test(command)) {
      if (command.includes("github")) open({ id: "github", title: "GitHub", query: text, url: "https://github.com/" })
      if (command.includes("codex")) open({ id: "codex", title: "Codex", query: text, url: "https://chatgpt.com/codex" })
      if (/chatgpt|chat de apt/.test(command)) open({ id: "chatgpt", title: "ChatGPT", query: text, url: "https://chatgpt.com/" })
      finish("Preparei os acessos solicitados. As janelas anteriores estão minimizadas. Ler seu projeto ou operar esses serviços depende da integração autenticada do backend; não fiz uma análise do repositório.")
    } else if (/clima|noticia|pesquis|busc|google/.test(command)) {
      const news = command.includes("noticia")
      open({ id: news ? "news" : "search", title: news ? "Notícias" : "Pesquisa", query: text, url: news ? `https://news.google.com/search?q=${encodeURIComponent(text)}&hl=pt-BR&gl=BR&ceid=BR:pt-419` : `https://www.google.com/search?q=${encodeURIComponent(text)}` })
      finish("Preparei sua pesquisa. Use o botão da janela para abrir os resultados reais no navegador. Ainda não posso ler ou resumir esses resultados sem o backend de busca.")
    } else void askBackend(text)
  }

  const state = voice.mode !== "off" ? "listening" : processing ? "thinking" : "idle"

  useLayoutEffect(() => {
    const previous = previousArea.current
    const area = layout.normal
    previousArea.current = area
    setWindows((items) => {
      const active = [...items].filter((item) => !item.minimized).sort((a, b) => b.z - a.z)[0]?.id
      let changed = false
      const next = items.map((item) => {
        const rect = fitWindow({
          x: area.x + (item.x - previous.x) * area.width / previous.width,
          y: area.y + (item.y - previous.y) * area.height / previous.height,
          width: Math.min(660, item.width * area.width / previous.width),
          height: Math.min(410, item.height * area.height / previous.height),
        }, area)
        const minimized = item.minimized || (layout.mobile && item.id !== active)
        if (rect.x === item.x && rect.y === item.y && rect.width === item.width && rect.height === item.height && minimized === item.minimized) return item
        changed = true
        return { ...item, ...rect, minimized }
      })
      return changed ? next : items
    })
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event("jax:request-ui-snapshot")))
    return () => cancelAnimationFrame(frame)
  }, [layout])
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "instant" : "smooth" }) }, [messages])
  useEffect(() => () => { if (responseTimer.current) clearTimeout(responseTimer.current); if (noticeTimer.current) clearTimeout(noticeTimer.current); closeTimers.current.forEach(clearTimeout) }, [])
  useEffect(() => {
    function snapshot() {
      const rect = (element: Element | null | undefined) => {
        if (!element) return null
        const { x, y, width, height } = element.getBoundingClientRect()
        return { x, y, width, height }
      }
      window.dispatchEvent(new CustomEvent("jax:ui-snapshot", { detail: {
        coordinateSpace: "viewport-css-pixels",
        viewport: { width: window.innerWidth, height: window.innerHeight },
        visualViewport: layoutRef.current.viewport,
        layoutMode: layoutRef.current.mobile ? "mobile" : "desktop",
        compact: layoutRef.current.compact,
        safeArea: layoutRef.current.safeArea,
        windowArea: layoutRef.current.normal,
        fullscreenArea: layoutRef.current.fullscreen,
        activeWindowId: [...windows].filter((item) => !item.minimized && !item.closing).sort((a, b) => b.z - a.z)[0]?.id ?? null,
        workspace: rect(desktop.current),
        orb: rect(desktop.current?.querySelector('[data-jax-element="orb"] .jax-orb')),
        composer: rect(desktop.current?.querySelector('.jax-minimal-composer')),
        dock: rect(desktop.current?.querySelector('.jax-window-dock')),
        windows: windows.map(({ id, title, x, y, width, height, minimized, maximized, z }) => ({ id, title, target: maximized ? { ...layoutRef.current.fullscreen, coordinateSpace: "viewport-css-pixels" } : { x, y, width, height, coordinateSpace: "workspace-css-pixels" }, visual: rect(Array.from(desktop.current?.querySelectorAll('[data-jax-window]') ?? []).find((element) => element.getAttribute('data-jax-window') === id)), minimized, maximized, z })),
        motion: { durationMs: 440, manualDrag: "direct", reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches },
        elements: ["sidebar.toggle", "composer.input", "voice.single", "voice.continuous", "voice.stop", "dialog.dismiss", "window.open", "window.close", "window.minimize", "window.maximize", "window.restore", "window.move", "window.resize", "windows.arrange"],
        capabilities: capabilities.map(({ id, title }) => ({ id, title, status: id === "screen" ? "permission-required" : "backend-required" })),
        sidebarOpen: sidebar,
        permissions: { localComputer: false, terminal: false, filesystem: false, browserAutomation: false },
      } }))
    }
    function apply(event: Event) {
      const detail = (event as CustomEvent).detail
      if (!detail || typeof detail !== "object") return
      const id = String(detail.id ?? "")
      if (detail.action === "close") closeWindow(id)
      if (detail.action === "minimize") patch(id, { minimized: true, maximized: false })
      if (detail.action === "maximize") patch(id, { maximized: true, minimized: false })
      if (detail.action === "restore") patch(id, { maximized: false, minimized: false })
      if (detail.action === "sidebar" && typeof detail.open === "boolean") setSidebar(detail.open)
      if (detail.action === "move" || detail.action === "resize") {
        const item = windows.find((candidate) => candidate.id === id)
        if (!item || item.maximized) return
        const area = layoutRef.current.normal
        if (detail.action === "move" && Number.isFinite(detail.x) && Number.isFinite(detail.y)) patch(id, fitWindow({ ...item, x: detail.x, y: detail.y }, area))
        if (detail.action === "resize" && Number.isFinite(detail.width) && Number.isFinite(detail.height)) patch(id, resizeWindow(item, detail.width, detail.height, area))
      }
      if (detail.action === "reply" && typeof detail.text === "string") respond(detail.text.slice(0, 10000))
      if (detail.action === "open" && id && typeof detail.title === "string") open({ id: id.slice(0, 100), title: detail.title.slice(0, 120), query: String(detail.query ?? ""), url: safeUrl(detail.url) })
    }
    window.addEventListener("jax:request-ui-snapshot", snapshot)
    window.addEventListener("jax:ui-action", apply)
    return () => { window.removeEventListener("jax:request-ui-snapshot", snapshot); window.removeEventListener("jax:ui-action", apply) }
  }, [windows, patch, respond, open, sidebar, closeWindow])

  function submit(event: FormEvent) { event.preventDefault(); execute(draft) }

  return <main ref={root} className={`jax-minimal ${layout.mobile ? "is-mobile" : ""} ${layout.compact ? "is-compact" : ""} ${sidebar ? "sidebar-open" : ""} ${windows.some((item) => !item.minimized && !item.closing) ? "has-windows" : ""}`}>
    <header className="jax-minimal-header"><button aria-label={sidebar ? "Fechar barra lateral" : "Abrir barra lateral"} aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><PanelLeft size={18} /></button><span className="jax-wordmark">JAX<span> / LUIZ</span></span><button aria-label="Abrir configurações" title="Configurações" onClick={() => open({ id: "settings", title: "Configurações", query: "Backend e modelos" })}><Settings2 size={18} /></button><span className="jax-session-status"><i />{voice.mode === "continuous" ? "ESCUTA CONTÍNUA" : voice.mode === "single" ? "OUVINDO" : "SEU ESPAÇO"}</span></header>
    <JaxSidebar open={sidebar} onClose={() => setSidebar(false)} windows={windows} onRestore={(id) => patch(id, { minimized: false, maximized: false, z: ++z.current })} onOpen={open} />
    <div className="jax-minimal-desktop" data-jax-desktop ref={desktop}>
      <section className="jax-presence" aria-label="Assistente JAX"><div className="jax-minimal-orb" data-jax-element="orb"><ParticleOrb state={state} /></div><div className="jax-presence-status">{voice.mode !== "off" ? "Estou ouvindo" : processing ? "Processando comando" : messages.length ? "Com você, Luiz" : "O que vamos fazer, Luiz?"}</div></section>
      <section className="jax-minimal-conversation" aria-label="Conversa com JAX"><div ref={transcript} className="jax-minimal-transcript" aria-live="polite">{messages.map((message) => <div key={message.id} className={`jax-minimal-message ${message.role}`}><span>{message.role === "jax" ? "JAX" : "VOCÊ"}</span><p>{message.text}</p></div>)}</div>{voice.partial && <p className="jax-partial" aria-live="polite">{voice.partial}</p>}<form className="jax-minimal-composer" onSubmit={submit}><textarea rows={1} aria-label="Comando para JAX" placeholder="Mande qualquer coisa…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); execute(draft) } }} /><div className="jax-input-actions"><button type="button" aria-label={voice.mode === "single" ? "Parar comando por voz" : "Dar um comando por voz"} aria-pressed={voice.mode === "single"} title="Um comando por voz" onClick={() => voice.toggle("single")}>{voice.mode === "single" ? <Square size={16} /> : <Mic size={18} />}</button><button type="button" aria-label={voice.mode === "continuous" ? "Parar conversação contínua" : "Iniciar conversação contínua"} aria-pressed={voice.mode === "continuous"} title="Escuta contínua até você parar" onClick={() => voice.toggle("continuous")}>{voice.mode === "continuous" ? <Square size={16} /> : <AudioLines size={19} />}</button><button type="submit" className="jax-submit" aria-label="Enviar comando" disabled={!draft.trim()}><ArrowUp size={18} /></button></div></form>{voice.mode === "continuous" && <button className="jax-stop-listening" onClick={voice.stop}>Microfone ativo · toque para parar</button>}</section>
      {windows.map((item) => <JaxWindow key={item.id} item={item} layout={layout} patch={(update) => patch(item.id, update)} close={() => closeWindow(item.id)} focus={() => patch(item.id, { z: ++z.current })}>{item.id === "settings" ? <JaxSettings configured={backendConfigured} authenticated={authenticated} providers={providers} provider={provider} model={model} preferences={preferences} onProvider={(id) => { setProvider(id); setModel("") }} onModel={setModel} onLogin={login} onLogout={logout} onForget={forget} error={backendError} /> : item.id === "youtube" ? <JaxVideoPanel query={item.query} url={item.url} embedUrl={item.embedUrl} onSelect={(video) => patch(item.id, { title: video.title, query: video.title, url: video.url, embedUrl: video.embedUrl })} /> : item.id === "search" || item.id === "search-agent" || item.id === "news" ? <JaxSearchPanel query={item.query} news={item.id === "news"} url={item.url} /> : item.id === "image-agent" ? <JaxImagePanel title={item.query} imageUrl={item.imageUrl} sourceUrl={item.sourceUrl} /> : capabilities.some((capability) => capability.id === item.id) ? <JaxCapabilityContent id={item.id} onReply={respond} /> : ["projects", "whatsapp", "install"].includes(item.id) ? <JaxResourcePanel id={item.id} /> : undefined}</JaxWindow>)}
      {windows.some((item) => item.minimized) && <nav className="jax-window-dock" aria-label="Janelas minimizadas">{windows.filter((item) => item.minimized).map((item) => <button key={item.id} onClick={() => patch(item.id, { minimized: false, z: ++z.current })}>{item.title}</button>)}</nav>}
    </div>
    {full && latest && noticeVisible && <JaxFloatingReply text={latest.text} area={layout.fullscreen} onDismiss={() => setNoticeVisible(false)} />}
  </main>
}
