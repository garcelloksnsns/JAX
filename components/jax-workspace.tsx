"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUp, AudioLines, ChevronLeft, ExternalLink, Mic, PanelLeft, Square, X } from "lucide-react"
import { ParticleOrb } from "@/components/particle-orb"
import { JaxWindow, type JaxWindowState, type WindowPatch } from "@/components/jax-window"
import { useJaxVoice } from "@/hooks/use-jax-voice"
import { capabilities, JaxCapabilityContent } from "@/components/jax-capabilities"

type Message = { id: string; role: "user" | "jax"; text: string }
type Resource = { id: string; title: string; query: string; url?: string; embedUrl?: string }
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const safeUrl = (value: unknown) => { try { const url = new URL(String(value)); return url.protocol === "https:" ? url.href : undefined } catch { return undefined } }

export function JaxWorkspace() {
  const [sidebar, setSidebar] = useState(false)
  const [windows, setWindows] = useState<JaxWindowState[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [processing, setProcessing] = useState(false)
  const [noticeVisible, setNoticeVisible] = useState(false)
  const [dialogPosition, setDialogPosition] = useState({ x: 24, y: 78 })
  const desktop = useRef<HTMLDivElement>(null)
  const transcript = useRef<HTMLDivElement>(null)
  const z = useRef(2)
  const closeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const full = windows.some((item) => item.maximized && !item.minimized)
  const latest = messages.filter((message) => message.role === "jax").at(-1)

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
    const bounds = desktop.current?.getBoundingClientRect()
    const availableWidth = bounds?.width ?? 900
    const availableHeight = bounds?.height ?? 650
    const reservedLeft = availableWidth >= 720 ? 156 : 16
    const width = Math.min(660, availableWidth - reservedLeft - 16)
    const usableHeight = availableHeight * 0.55
    const height = Math.max(160, Math.min(410, usableHeight - 24))
    const nextZ = ++z.current
    setWindows((items) => [
      ...items.filter((item) => item.id !== resource.id).map((item) => ({ ...item, minimized: true, maximized: false })),
      { ...resource, x: Math.max(reservedLeft, reservedLeft + (availableWidth - reservedLeft - 16 - width) / 2), y: Math.max(8, (usableHeight - height) / 2), width, height, z: nextZ, minimized: false, maximized },
    ])
  }, [])

  const patch = useCallback((id: string, update: WindowPatch) => {
    setWindows((items) => items.map((item) => item.id === id ? { ...item, ...update } : update.maximized ? { ...item, minimized: true, maximized: false } : item))
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

  function execute(raw: string) {
    const text = raw.trim()
    if (!text) return
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
        const bounds = desktop.current?.getBoundingClientRect()
        const reservedLeft = (bounds?.width ?? 800) >= 720 ? 156 : 12
        const width = (bounds?.width ?? 800) - reservedLeft - 12
        const height = (bounds?.height ?? 500) * 0.55 - 24
        const count = windows.length
        const columns = Math.max(1, Math.min(count, Math.floor(width / 240)))
        const rows = Math.max(1, Math.ceil(count / columns))
        if (width / columns < 220 || height / rows < 160) {
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
    } else if (/terminal|exclu|apagar|pastas?|arquivos?|documentos?|pdf|word|clicar|minha tela|ver.*tela|compartilh.*tela|navegador.*control/.test(command)) {
      const id = /minha tela|ver.*tela|compartilh.*tela/.test(command) ? "screen" : /terminal/.test(command) ? "terminal" : /pdf|word/.test(command) ? "documents" : /exclu|apagar/.test(command) ? "delete" : /clicar|navegador/.test(command) ? "browser-control" : "files"
      const capability = capabilities.find((item) => item.id === id)!
      open({ id, title: capability.title, query: text })
      finish(id === "screen" ? "Abri o compartilhamento de tela. Clique em escolher tela ou janela para conceder acesso; não há análise por IA ou controle remoto conectado." : "Abri o painel solicitado. Você pode preparar a ação, mas o serviço local ainda não está conectado: não executei comandos nem alterei arquivos.")
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
    } else finish("Posso organizar as janelas, preparar pesquisas e incorporar um link do YouTube. Para entender pedidos livres e executar ferramentas, o backend do agente ainda precisa ser conectado. Não executei uma ação externa.")
    window.dispatchEvent(new CustomEvent("jax:user-command", { detail: { text, timestamp: Date.now() } }))
  }

  const voice = useJaxVoice(execute, respond)
  const state = voice.mode !== "off" ? "listening" : processing ? "thinking" : "idle"

  useEffect(() => {
    const node = desktop.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      const bounds = node.getBoundingClientRect()
      setWindows((items) => {
        let changed = false
        const next = items.map((item) => {
          const width = Math.max(220, Math.min(item.width, bounds.width - 16))
          const height = Math.max(160, Math.min(item.height, bounds.height - 16))
          const x = Math.max(8, Math.min(item.x, bounds.width - width - 8))
          const y = Math.max(8, Math.min(item.y, bounds.height - height - 8))
          if (width === item.width && height === item.height && x === item.x && y === item.y) return item
          changed = true
          return { ...item, width, height, x, y }
        })
        return changed ? next : items
      })
      requestAnimationFrame(() => window.dispatchEvent(new Event('jax:request-ui-snapshot')))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
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
        workspace: rect(desktop.current),
        orb: rect(desktop.current?.querySelector('[data-jax-element="orb"] .jax-orb')),
        composer: rect(desktop.current?.querySelector('.jax-minimal-composer')),
        dock: rect(desktop.current?.querySelector('.jax-window-dock')),
        windows: windows.map(({ id, title, x, y, width, height, minimized, maximized, z }) => ({ id, title, target: { x, y, width, height, coordinateSpace: "workspace-css-pixels" }, visual: rect(Array.from(desktop.current?.querySelectorAll('[data-jax-window]') ?? []).find((element) => element.getAttribute('data-jax-window') === id)), minimized, maximized, z })),
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
        const bounds = desktop.current?.getBoundingClientRect()
        const item = windows.find((candidate) => candidate.id === id)
        if (!bounds || !item || item.maximized) return
        if (detail.action === "move" && Number.isFinite(detail.x) && Number.isFinite(detail.y)) patch(id, { x: Math.max(8, Math.min(bounds.width - item.width - 8, detail.x)), y: Math.max(8, Math.min(bounds.height - item.height - 8, detail.y)) })
        if (detail.action === "resize" && Number.isFinite(detail.width) && Number.isFinite(detail.height)) patch(id, { width: Math.max(220, Math.min(bounds.width - item.x - 8, detail.width)), height: Math.max(160, Math.min(bounds.height - item.y - 8, detail.height)) })
      }
      if (detail.action === "reply" && typeof detail.text === "string") respond(detail.text.slice(0, 10000))
      if (detail.action === "open" && id && typeof detail.title === "string") open({ id: id.slice(0, 100), title: detail.title.slice(0, 120), query: String(detail.query ?? ""), url: safeUrl(detail.url) })
    }
    window.addEventListener("jax:request-ui-snapshot", snapshot)
    window.addEventListener("jax:ui-action", apply)
    return () => { window.removeEventListener("jax:request-ui-snapshot", snapshot); window.removeEventListener("jax:ui-action", apply) }
  }, [windows, patch, respond, open, sidebar, closeWindow])

  function submit(event: FormEvent) { event.preventDefault(); execute(draft) }

  return <main className={`jax-minimal ${sidebar ? "sidebar-open" : ""} ${windows.some((item) => !item.minimized && !item.closing) ? "has-windows" : ""}`}>
    <header className="jax-minimal-header"><button aria-label={sidebar ? "Fechar barra lateral" : "Abrir barra lateral"} aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><PanelLeft size={18} /></button><span className="jax-wordmark">JAX<span> / LUIZ</span></span><span className="jax-session-status"><i />{voice.mode === "continuous" ? "ESCUTA CONTÍNUA" : voice.mode === "single" ? "OUVINDO" : "SEU ESPAÇO"}</span></header>
    {sidebar && <aside className="jax-minimal-sidebar"><div className="jax-sidebar-heading"><strong>Seu espaço</strong><button aria-label="Recolher barra lateral" onClick={() => setSidebar(false)}><ChevronLeft size={18} /></button></div><p>Janelas</p>{windows.length === 0 && <small>Nenhuma janela aberta.</small>}{windows.map((item) => <button className="jax-saved-window" key={item.id} onClick={() => { patch(item.id, { minimized: false, z: ++z.current }); setSidebar(false) }}>{item.title}<span>{item.minimized ? "Restaurar" : "Aberta"}</span></button>)}<p>Capacidades</p><nav className="jax-capability-nav" aria-label="Capacidades do JAX">{capabilities.map(({ id, title, icon: Icon, description }) => <button key={id} title={description} onClick={() => { open({ id, title, query: description }); setSidebar(false) }}><Icon size={15} /><span>{title}</span></button>)}</nav><div className="jax-sidebar-bottom"><strong>Conexões</strong><a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={12} /></a><p>Computador local não conectado.</p><small>Terminal, arquivos, tela e envio de e-mail exigem o backend e permissões explícitas.</small></div></aside>}
    <div className="jax-minimal-desktop" data-jax-desktop ref={desktop}>
      <section className="jax-presence" aria-label="Assistente JAX"><div className="jax-minimal-orb" data-jax-element="orb"><ParticleOrb state={state} /></div><div className="jax-presence-status">{voice.mode !== "off" ? "Estou ouvindo" : processing ? "Processando comando" : messages.length ? "Com você, Luiz" : "O que vamos fazer, Luiz?"}</div></section>
      <section className="jax-minimal-conversation" aria-label="Conversa com JAX"><div ref={transcript} className="jax-minimal-transcript" aria-live="polite">{messages.map((message) => <div key={message.id} className={`jax-minimal-message ${message.role}`}><span>{message.role === "jax" ? "JAX" : "VOCÊ"}</span><p>{message.text}</p></div>)}</div>{voice.partial && <p className="jax-partial" aria-live="polite">{voice.partial}</p>}<form className="jax-minimal-composer" onSubmit={submit}><textarea rows={1} aria-label="Comando para JAX" placeholder="Mande qualquer coisa…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); execute(draft) } }} /><div className="jax-input-actions"><button type="button" aria-label={voice.mode === "single" ? "Parar comando por voz" : "Dar um comando por voz"} aria-pressed={voice.mode === "single"} title="Um comando por voz" onClick={() => voice.toggle("single")}>{voice.mode === "single" ? <Square size={16} /> : <Mic size={18} />}</button><button type="button" aria-label={voice.mode === "continuous" ? "Parar conversação contínua" : "Iniciar conversação contínua"} aria-pressed={voice.mode === "continuous"} title="Escuta contínua até você parar" onClick={() => voice.toggle("continuous")}>{voice.mode === "continuous" ? <Square size={16} /> : <AudioLines size={19} />}</button><button type="submit" className="jax-submit" aria-label="Enviar comando" disabled={!draft.trim()}><ArrowUp size={18} /></button></div></form>{voice.mode === "continuous" && <button className="jax-stop-listening" onClick={voice.stop}>Microfone ativo · clique para parar</button>}</section>
      {windows.map((item) => <JaxWindow key={item.id} item={item} patch={(update) => patch(item.id, update)} close={() => closeWindow(item.id)} focus={() => patch(item.id, { z: ++z.current })}>{capabilities.some((capability) => capability.id === item.id) ? <JaxCapabilityContent id={item.id} onReply={respond} /> : undefined}</JaxWindow>)}
      {windows.some((item) => item.minimized) && <nav className="jax-window-dock" aria-label="Janelas minimizadas">{windows.filter((item) => item.minimized).map((item) => <button key={item.id} onClick={() => patch(item.id, { minimized: false, z: ++z.current })}>{item.title}</button>)}</nav>}
    </div>
    {full && latest && noticeVisible && <div className="jax-floating-dialog" role="status" style={{ left: dialogPosition.x, top: dialogPosition.y }}><header onPointerDown={(event) => { if ((event.target as HTMLElement).closest("button")) return; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dx = String(event.clientX - dialogPosition.x); event.currentTarget.dataset.dy = String(event.clientY - dialogPosition.y) }} onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; setDialogPosition({ x: Math.max(8, Math.min(window.innerWidth - 320, event.clientX - Number(event.currentTarget.dataset.dx))), y: Math.max(8, Math.min(window.innerHeight - 150, event.clientY - Number(event.currentTarget.dataset.dy))) }) }}><span>JAX</span><button aria-label="Dispensar resposta" onClick={() => setNoticeVisible(false)}><X size={14} /></button></header><p>{latest.text}</p></div>}
  </main>
}
