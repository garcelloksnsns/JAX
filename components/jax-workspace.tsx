"use client"

import { useState, type FormEvent, type PointerEvent } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Command,
  ExternalLink,
  FolderGit2,
  Grid2X2,
  Mail,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Minus,
  MoreHorizontal,
  Newspaper,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  TerminalSquare,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParticleOrb, type OrbState } from "@/components/particle-orb"

type WindowId = "weather" | "news" | "youtube" | "codex" | "email"
type AppWindowState = { id: WindowId; x: number; y: number; width: number; height: number; minimized: boolean; maximized: boolean; z: number }
type Message = { role: "user" | "jax"; text: string; time: string }

const initialWindows: AppWindowState[] = [
  { id: "weather", x: 30, y: 26, width: 270, height: 196, minimized: false, maximized: false, z: 5 },
  { id: "news", x: 320, y: 52, width: 330, height: 270, minimized: false, maximized: false, z: 4 },
  { id: "codex", x: 160, y: 340, width: 390, height: 220, minimized: true, maximized: false, z: 3 },
]

const windowMeta = {
  weather: { title: "Clima de hoje", subtitle: "Pesquisa contextual", icon: CloudSun, color: "amber" },
  news: { title: "Notícias", subtitle: "Busca personalizada", icon: Newspaper, color: "cyan" },
  youtube: { title: "YouTube", subtitle: "Mídia aberta por comando", icon: Play, color: "red" },
  codex: { title: "Codex + GitHub", subtitle: "Projeto em análise", icon: TerminalSquare, color: "violet" },
  email: { title: "Novo e-mail", subtitle: "Rascunho preparado", icon: Mail, color: "green" },
} as const

const navItems = [[Command, "Conversa"], [Grid2X2, "Janelas"], [FolderGit2, "GitHub"], [CalendarDays, "Agenda"]] as const
const starterMessages: Message[] = [{ role: "jax", text: "Estou pronto. Diga o que você quer abrir, pesquisar ou executar.", time: "agora" }]

export function JaxWorkspace() {
  const [orbState, setOrbState] = useState<OrbState>("idle")
  const [activePanel, setActivePanel] = useState("Conversa")
  const [isListening, setIsListening] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [windows, setWindows] = useState(initialWindows)
  const [messages, setMessages] = useState(starterMessages)
  const [draft, setDraft] = useState("")
  const [dragging, setDragging] = useState<{ id: WindowId; dx: number; dy: number } | null>(null)
  const [maxZ, setMaxZ] = useState(5)

  const statusCopy = { idle: "Pronto para agir", listening: "Ouvindo você", thinking: "Entendendo o pedido", speaking: "Respondendo" }[orbState]
  const visibleWindows = windows.filter((item) => !item.minimized)

  function animateResponse() {
    setOrbState("thinking")
    window.setTimeout(() => setOrbState("speaking"), 700)
    window.setTimeout(() => setOrbState("idle"), 2200)
  }

  function focusWindow(id: WindowId) {
    const nextZ = maxZ + 1
    setMaxZ(nextZ)
    setWindows((items) => items.map((item) => item.id === id ? { ...item, z: nextZ } : item))
  }

  function openWindow(id: WindowId, maximize = false) {
    const nextZ = maxZ + 1
    setMaxZ(nextZ)
    setWindows((items) => {
      const existing = items.find((item) => item.id === id)
      if (existing) return items.map((item) => item.id === id ? { ...item, minimized: false, maximized: maximize, z: nextZ } : item)
      const index = items.length
      return [...items, { id, x: 30 + (index * 28) % 210, y: 24 + (index * 24) % 170, width: id === "codex" ? 390 : 320, height: id === "weather" ? 196 : 245, minimized: false, maximized: maximize, z: nextZ }]
    })
  }

  function minimizeWindow(id: WindowId) { setWindows((items) => items.map((item) => item.id === id ? { ...item, minimized: true, maximized: false } : item)) }
  function closeWindow(id: WindowId) { setWindows((items) => items.filter((item) => item.id !== id)) }

  function submitCommand(event?: FormEvent) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text) return
    const lower = text.toLowerCase()
    let response = "Entendi. Vou preparar essa ação para a ponte do Codex."
    let windowId: WindowId | null = null
    let maximize = false
    if (lower.includes("clima") || lower.includes("tempo")) { windowId = "weather"; response = "Abri o clima de hoje no centro. A janela pode ser movida ou minimizada." }
    else if (lower.includes("notícia") || lower.includes("noticias") || lower.includes("pesquisa") || lower.includes("pesquisar")) { windowId = "news"; response = "Abri uma busca de notícias. O backend poderá aplicar suas preferências e atualizar os resultados." }
    else if (lower.includes("youtube") || lower.includes("vídeo") || lower.includes("video")) { windowId = "youtube"; response = "Abri uma janela de mídia para o vídeo solicitado. O Codex poderá resolver a URL real." }
    else if (lower.includes("github") || lower.includes("projeto") || lower.includes("codex")) { windowId = "codex"; response = "Abri o Codex com a ponte do GitHub. O backend poderá ler o repositório autorizado e trazer um resumo." }
    else if (lower.includes("e-mail") || lower.includes("email")) { windowId = "email"; response = "Preparei a janela de e-mail. O envio só acontece depois que o backend validar destinatário e conteúdo." }
    if (lower.includes("tela cheia") || lower.includes("tela cheia")) maximize = true
    setMessages((items) => [...items, { role: "user", text, time: "agora" }, { role: "jax", text: response, time: "agora" }])
    setDraft("")
    animateResponse()
    if (windowId) openWindow(windowId, maximize)
  }

  function startListening() {
    setIsListening(true)
    setOrbState("listening")
    window.setTimeout(() => { setIsListening(false); setOrbState("idle") }, 3600)
  }

  function onWindowPointerDown(event: PointerEvent, id: WindowId) {
    const target = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!target) return
    focusWindow(id)
    setDragging({ id, dx: event.clientX - target.left, dy: event.clientY - target.top })
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function onWindowPointerMove(event: PointerEvent) {
    if (!dragging) return
    const workspace = event.currentTarget.getBoundingClientRect()
    setWindows((items) => items.map((item) => item.id === dragging.id ? { ...item, x: Math.max(8, event.clientX - workspace.left - dragging.dx), y: Math.max(8, event.clientY - workspace.top - dragging.dy) } : item))
  }

  return <main className="jax-app">
    <div className="jax-noise" />
    <header className="jax-topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="jax-icon-button lg:hidden" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Abrir navegação"><Menu /></Button><div className="jax-brand-mark" aria-hidden="true"><span /></div><div><div className="jax-brand-name">JAX <span>/</span> PERSONAL OS</div><div className="jax-brand-subtitle">A camada de trabalho de Luiz</div></div></div><div className="jax-topbar-status"><span className="jax-live-dot" /><span>ONLINE</span><span className="jax-divider" /><span className="hidden sm:inline">{visibleWindows.length} JANELAS</span><Button variant="ghost" size="icon" className="jax-icon-button ml-2" aria-label="Abrir configurações"><Settings2 /></Button></div></header>
    <div className={`jax-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`jax-sidebar ${isSidebarCollapsed ? "is-collapsed" : ""} ${isMobileSidebarOpen ? "mobile-open" : ""}`}><div className="jax-sidebar-collapse"><Button variant="ghost" size="icon" className="jax-icon-button" onClick={() => setIsSidebarCollapsed((value) => !value)} aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Reduzir barra lateral"}>{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</Button></div><div className="jax-side-section"><div className="jax-section-label">Navegar</div><nav className="flex flex-col gap-1" aria-label="Navegação principal">{navItems.map(([Icon, label]) => <button key={label} className={`jax-nav-item ${activePanel === label ? "is-active" : ""}`} onClick={() => { setActivePanel(label); setIsMobileSidebarOpen(false) }} title={label}><Icon /><span>{label}</span></button>)}</nav></div><div className="jax-side-section"><div className="flex items-center justify-between px-3 mb-2"><div className="jax-section-label mb-0">Janelas</div><Plus /></div><div className="flex flex-col gap-1">{windows.map((item) => { const meta = windowMeta[item.id]; const Icon = meta.icon; return <button key={item.id} className="jax-screen-item" onClick={() => openWindow(item.id)}><span className={`jax-screen-dot ${meta.color}`} /><Icon /><span>{meta.title}</span><MoreHorizontal className="ml-auto" /></button> })}</div></div><div className="mt-auto jax-side-footer"><div className="jax-memory-meter"><div className="flex items-center justify-between"><span>Contexto local</span><span>ativo</span></div><div className="jax-meter-track"><div /></div></div><button className="jax-user-card"><span className="jax-avatar">LS</span><span className="text-left"><strong>Luiz Souto</strong><small>Workspace pessoal</small></span></button></div></aside>
      <section className="jax-main-column"><div className="jax-command-strip"><div className="flex items-center gap-2"><span className="jax-kicker">MODO</span><span className="jax-mode-pill"><Sparkles /> {activePanel}</span></div><div className="flex items-center gap-2"><span className="jax-kicker hidden md:inline">DESKTOP / LIVRE</span><Button variant="ghost" size="icon" className="jax-icon-button" onClick={() => openWindow("codex")} aria-label="Abrir Codex"><TerminalSquare /></Button><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Tela cheia"><Maximize2 /></Button></div></div><div className="jax-orb-stage"><div className="jax-orb-crosshair crosshair-left" /><div className="jax-orb-crosshair crosshair-right" /><ParticleOrb state={orbState} /><div className="jax-orb-caption"><span className="jax-status-pulse" />{statusCopy}</div><div className="jax-orb-readout"><span>ESTADO</span><strong>{orbState.toUpperCase()}</strong><span>HOVER / TOQUE</span></div></div><div className="jax-conversation"><div className="jax-conversation-head"><div><div className="jax-eyebrow"><Zap /> CONVERSA</div><h1>Fale com o JAX.</h1><p>Peça uma ação. Ele abre, move e organiza as telas por você.</p></div><Button className={`jax-listen-button ${isListening ? "is-active" : ""}`} onClick={startListening}><Waves /> {isListening ? "Ouvindo" : "Voz em breve"}</Button></div><div className="jax-transcript" aria-live="polite">{messages.slice(-4).map((message, index) => <div className={`jax-chat-line ${message.role}`} key={`${message.time}-${index}`}><span className="jax-chat-label">{message.role === "user" ? "VOCÊ" : "JAX"}</span><p>{message.text}</p><small>{message.time}</small></div>)}</div><form className="jax-composer" onSubmit={submitCommand}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ex.: Jax, abre as 5 melhores notícias sobre IA" aria-label="Comando para JAX" rows={2} /><div className="jax-composer-footer"><span className="jax-composer-hint">ENTER para executar · o backend entra pela ponte do Codex</span><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" className="jax-mic-button" onClick={startListening} aria-label="Preparar entrada de voz"><Volume2 /></Button><Button type="submit" size="icon" className="jax-send-button" aria-label="Executar comando"><ChevronRight /></Button></div></div></form><div className="jax-command-examples"><button onClick={() => setDraft("Jax, qual o clima de hoje?")}><CloudSun /> clima</button><button onClick={() => setDraft("Jax, abre as notícias sobre IA")}><Newspaper /> notícias</button><button onClick={() => setDraft("Jax, olha meu projeto no GitHub pelo Codex")}><FolderGit2 /> GitHub</button><button onClick={() => setDraft("Jax, abre um vídeo no YouTube")}><Play /> YouTube</button></div></div><section className="jax-workspace-panel"><div className="jax-workspace-toolbar"><div><span className="jax-card-overline">Espaço controlado pelo JAX</span><strong>Janelas abertas</strong></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="jax-icon-button" onClick={() => openWindow("weather")} aria-label="Adicionar janela"><Plus /></Button><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Organizar janelas"><Grid2X2 /></Button></div></div><div className="jax-window-canvas" onPointerMove={onWindowPointerMove} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>{visibleWindows.length === 0 ? <div className="jax-canvas-empty"><PanelLeft /><strong>Nenhuma janela aberta</strong><small>Peça ao JAX para abrir uma informação.</small></div> : visibleWindows.map((item) => <JaxWindow key={item.id} item={item} onFocus={focusWindow} onMinimize={minimizeWindow} onClose={closeWindow} onMaximize={(id) => setWindows((items) => items.map((window) => window.id === id ? { ...window, maximized: !window.maximized } : window))} onPointerDown={onWindowPointerDown} />)}</div></section></section>
      <aside className="jax-inspector"><div className="jax-inspector-head"><div><div className="jax-section-label">Estado</div><h2>JAX está no controle</h2></div><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Mais opções"><MoreHorizontal /></Button></div><div className="jax-health-card"><div className="flex items-center gap-2"><MessageSquareText /><span>Modo conversa</span></div><strong>{visibleWindows.length}<span> telas</span></strong><small>O JAX decide o que merece aparecer.</small></div><div className="jax-inspector-section"><div className="jax-section-label">Pontes prontas para o backend</div><div className="jax-bridge-list"><div><TerminalSquare /><span><strong>Codex</strong><small>Orquestração e execução</small></span><b>READY</b></div><div><FolderGit2 /><span><strong>GitHub</strong><small>Repositórios autorizados</small></span><b>LINK</b></div><div><Waves /><span><strong>Voz</strong><small>API preparada</small></span><b>FUTURO</b></div></div></div><div className="jax-inspector-section mt-auto"><div className="jax-next-step"><span>01</span><div><strong>Você conversa. JAX organiza.</strong><small>Janelas secundárias ficam menores e a nova tarefa ganha o foco.</small></div></div></div></aside>
    </div><footer className="jax-footer"><span>JAX PERSONAL OS · CONVERSATION FIRST</span><span className="hidden sm:inline">MOVA · MINIMIZE · ORGANIZE</span><span className="flex items-center gap-2"><Volume2 /> VOZ PREPARADA</span></footer>
  </main>
}

function JaxWindow({ item, onFocus, onMinimize, onClose, onMaximize, onPointerDown }: { item: AppWindowState; onFocus: (id: WindowId) => void; onMinimize: (id: WindowId) => void; onClose: (id: WindowId) => void; onMaximize: (id: WindowId) => void; onPointerDown: (event: PointerEvent, id: WindowId) => void }) {
  const meta = windowMeta[item.id]
  const Icon = meta.icon
  return <article className={`jax-window-card window-${item.id} ${item.maximized ? "is-maximized" : ""}`} style={{ left: item.maximized ? 8 : item.x, top: item.maximized ? 8 : item.y, width: item.maximized ? "calc(100% - 16px)" : item.width, height: item.maximized ? "calc(100% - 16px)" : item.height, zIndex: item.z }} onPointerDown={() => onFocus(item.id)}><header className="jax-window-titlebar" onPointerDown={(event) => onPointerDown(event, item.id)}><div className="flex items-center gap-2"><span className={`jax-window-icon ${meta.color}`}><Icon /></span><span><strong>{meta.title}</strong><small>{meta.subtitle}</small></span></div><div className="flex items-center gap-1"><button onClick={() => onMaximize(item.id)} aria-label={`${item.maximized ? "Restaurar" : "Abrir em tela cheia"} ${meta.title}`}>{item.maximized ? <Minimize2 /> : <Maximize2 />}</button><button onClick={() => onMinimize(item.id)} aria-label={`Minimizar ${meta.title}`}><Minus /></button><button onClick={() => onClose(item.id)} aria-label={`Fechar ${meta.title}`}><X /></button></div></header><WindowContent id={item.id} /></article>
}

function WindowContent({ id }: { id: WindowId }) {
  if (id === "weather") return <div className="jax-window-content weather-content"><CloudSun /><strong>22° · Parcialmente nublado</strong><small>São Paulo · sensação de 23°</small><div className="weather-meta"><span>Umidade 68%</span><span>Vento 12 km/h</span></div></div>
  if (id === "news") return <div className="jax-window-content news-content"><div className="news-filter"><Search /><span>IA + tecnologia</span><span className="news-location">personalizado</span></div>{["Agentes começam a operar como sistemas completos", "Novos modelos ampliam voz, visão e contexto", "O que muda na próxima geração de ferramentas"].map((title, index) => <button className="news-row" key={title}><span>0{index + 1}</span><div><strong>{title}</strong><small>Fonte selecionada · agora</small></div><ExternalLink /></button>)}</div>
  if (id === "youtube") return <div className="jax-window-content video-content"><div className="video-preview"><div className="video-grid" /><button aria-label="Reproduzir vídeo"><Play /></button><span>youtube.com · pronto para abrir</span></div><div className="video-meta"><strong>Vídeo solicitado pelo Luiz</strong><small>A URL real será resolvida pelo backend.</small></div></div>
  if (id === "email") return <div className="jax-window-content email-content"><div className="email-field"><small>PARA</small><strong>destinatario@exemplo.com</strong></div><div className="email-field"><small>ASSUNTO</small><strong>Rascunho preparado pelo JAX</strong></div><div className="email-actions"><Button size="sm">Enviar pelo backend</Button><span>aguardando validação</span></div></div>
  return <div className="jax-window-content codex-content"><div className="code-line"><span>01</span><code>const repo = await github.authorize()</code></div><div className="code-line"><span>02</span><code>const review = await codex.inspect(repo)</code></div><div className="code-line active"><span>03</span><code>return jax.present(review, "focused")</code></div><div className="codex-status"><span /> <span>Pronto para o backend do Codex</span></div></div>
}
