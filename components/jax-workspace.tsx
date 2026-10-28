"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  AppWindow,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Command,
  ExternalLink,
  FolderKanban,
  Grid2X2,
  LayoutPanelTop,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Minus,
  MoreHorizontal,
  Move,
  Newspaper,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParticleOrb, type OrbState } from "@/components/particle-orb"

type WindowId = "news" | "youtube" | "codex"
type AppWindowState = { id: WindowId; x: number; y: number; width: number; height: number; minimized: boolean; z: number }

const initialWindows: AppWindowState[] = [
  { id: "news", x: 18, y: 18, width: 330, height: 270, minimized: false, z: 3 },
  { id: "youtube", x: 372, y: 42, width: 330, height: 250, minimized: false, z: 2 },
  { id: "codex", x: 130, y: 330, width: 360, height: 210, minimized: false, z: 1 },
]

const windowMeta = {
  news: { title: "Notícias do dia", subtitle: "Google News · filtro: tecnologia", icon: Newspaper, color: "amber" },
  youtube: { title: "YouTube", subtitle: "Vídeo aberto por comando", icon: Play, color: "red" },
  codex: { title: "Codex Bridge", subtitle: "Terminal e tarefas do projeto", icon: TerminalSquare, color: "violet" },
} as const

const navItems = [
  [Command, "Comando"], [Grid2X2, "Workspaces"], [Newspaper, "Notícias"], [FolderKanban, "Projetos"], [CalendarDays, "Agenda"], [BrainCircuit, "Memória"], [Zap, "Automações"],
] as const

const news = [
  ["01", "A próxima geração de agentes está virando sistema operacional", "The Verge · 18 min"],
  ["02", "Novos modelos multimodais avançam em voz e visão", "TechCrunch · 32 min"],
  ["03", "O futuro do trabalho com interfaces de IA locais", "Wired · 1 h"],
]

export function JaxWorkspace() {
  const [orbState, setOrbState] = useState<OrbState>("idle")
  const [activePanel, setActivePanel] = useState("Comando")
  const [isListening, setIsListening] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [windows, setWindows] = useState(initialWindows)
  const [dragging, setDragging] = useState<{ id: WindowId; dx: number; dy: number } | null>(null)
  const [maxZ, setMaxZ] = useState(3)

  const statusCopy = useMemo(() => ({ idle: "Pronto para agir", listening: "Ouvindo você", thinking: "Entendendo o pedido", speaking: "Falando com você" })[orbState], [orbState])
  const visibleWindows = windows.filter((item) => !item.minimized)

  function runAction() {
    setOrbState("thinking")
    window.setTimeout(() => setOrbState("speaking"), 950)
    window.setTimeout(() => setOrbState("idle"), 2800)
  }

  function startListening() {
    setIsListening(true)
    setOrbState("listening")
    window.setTimeout(() => { setIsListening(false); setOrbState("idle") }, 3600)
  }

  function focusWindow(id: WindowId) {
    setMaxZ((value) => value + 1)
    setWindows((items) => items.map((item) => item.id === id ? { ...item, z: maxZ + 1 } : item))
  }

  function toggleWindow(id: WindowId) {
    setWindows((items) => items.map((item) => item.id === id ? { ...item, minimized: !item.minimized, z: maxZ + 1 } : item))
    setMaxZ((value) => value + 1)
  }

  function closeWindow(id: WindowId) { setWindows((items) => items.filter((item) => item.id !== id)) }

  function onWindowPointerDown(event: React.PointerEvent, id: WindowId) {
    const target = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!target) return
    focusWindow(id)
    setDragging({ id, dx: event.clientX - target.left, dy: event.clientY - target.top })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onWindowPointerMove(event: React.PointerEvent) {
    if (!dragging) return
    const workspace = event.currentTarget.getBoundingClientRect()
    setWindows((items) => items.map((item) => item.id === dragging.id ? { ...item, x: Math.max(8, event.clientX - workspace.left - dragging.dx), y: Math.max(8, event.clientY - workspace.top - dragging.dy) } : item))
  }

  function stopDragging() { setDragging(null) }

  return (
    <main className="jax-app">
      <div className="jax-noise" />
      <header className="jax-topbar">
        <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="jax-icon-button lg:hidden" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Abrir navegação"><Menu /></Button><div className="jax-brand-mark" aria-hidden="true"><span /></div><div><div className="jax-brand-name">JAX <span>/</span> PERSONAL OS</div><div className="jax-brand-subtitle">Uma camada de trabalho para Luiz</div></div></div>
        <div className="jax-topbar-status"><span className="jax-live-dot" /><span>JAX ONLINE</span><span className="jax-divider" /><span className="hidden sm:inline">3 JANELAS ATIVAS</span><Button variant="ghost" size="icon" className="jax-icon-button ml-2" aria-label="Abrir configurações"><Settings2 /></Button></div>
      </header>

      <div className={`jax-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <aside className={`jax-sidebar ${isSidebarCollapsed ? "is-collapsed" : ""} ${isMobileSidebarOpen ? "mobile-open" : ""}`}>
          <div className="jax-sidebar-collapse"><Button variant="ghost" size="icon" className="jax-icon-button" onClick={() => setIsSidebarCollapsed((value) => !value)} aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Reduzir barra lateral"}>{isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}</Button></div>
          <div className="jax-side-section"><div className="jax-section-label">Navegar</div><nav className="flex flex-col gap-1" aria-label="Navegação principal">{navItems.map(([Icon, label]) => <button key={label} className={`jax-nav-item ${activePanel === label ? "is-active" : ""}`} onClick={() => setActivePanel(label)} title={label}><Icon /><span>{label}</span>{label === "Memória" && <span className="jax-nav-count">12</span>}</button>)}</nav></div>
          <div className="jax-side-section"><div className="flex items-center justify-between px-3 mb-2"><div className="jax-section-label mb-0">Telas abertas</div><Plus /></div><div className="flex flex-col gap-1">{windows.map((item) => { const meta = windowMeta[item.id]; const Icon = meta.icon; return <button key={item.id} className="jax-screen-item" onClick={() => toggleWindow(item.id)}><span className={`jax-screen-dot ${meta.color}`} /><Icon /><span>{meta.title}</span><MoreHorizontal className="ml-auto" /></button> })}</div></div>
          <div className="mt-auto jax-side-footer"><div className="jax-memory-meter"><div className="flex items-center justify-between"><span>Memória local</span><span>68%</span></div><div className="jax-meter-track"><div /></div></div><button className="jax-user-card"><span className="jax-avatar">LS</span><span className="text-left"><strong>Luiz Souto</strong><small>Workspace pessoal</small></span><MoreHorizontal className="ml-auto" /></button></div>
        </aside>

        <section className="jax-main-column">
          <div className="jax-command-strip"><div className="flex items-center gap-2"><span className="jax-kicker">FOCO ATUAL</span><span className="jax-mode-pill"><Sparkles /> {activePanel}</span></div><div className="flex items-center gap-2"><span className="jax-kicker hidden md:inline">DESKTOP / 01</span><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Gerenciar janelas"><LayoutPanelTop /></Button><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Tela cheia"><Maximize2 /></Button></div></div>
          <div className="jax-orb-stage"><div className="jax-orb-crosshair crosshair-left" /><div className="jax-orb-crosshair crosshair-right" /><ParticleOrb state={orbState} /><div className="jax-orb-caption"><span className="jax-status-pulse" />{statusCopy}</div><div className="jax-orb-readout"><span>ESTADO</span><strong>{orbState.toUpperCase()}</strong><span>HOVER / TOQUE</span></div></div>
          <div className="jax-control-row"><div><div className="jax-eyebrow"><Zap /> CENTRAL DE COMANDO</div><h1>O que precisa acontecer?</h1><p>Use a voz, abra uma ferramenta ou mova as janelas para montar seu espaço.</p></div><Button className={`jax-listen-button ${isListening ? "is-active" : ""}`} onClick={startListening}><Waves /> {isListening ? "Ouvindo" : "Ativar voz"}</Button></div>
          <div className="jax-shortcuts"><button onClick={runAction}><Search /><span><strong>Pesquisar</strong><small>Google, notícias e referências</small></span><ChevronRight /></button><button onClick={runAction}><AppWindow /><span><strong>Abrir uma tela</strong><small>YouTube, Google ou Codex</small></span><ChevronRight /></button><button onClick={runAction}><MessageSquareText /><span><strong>Executar automação</strong><small>Rotinas e integrações</small></span><ChevronRight /></button></div>
          <section className="jax-workspace-panel"><div className="jax-workspace-toolbar"><div><span className="jax-card-overline">Área de trabalho</span><strong>Janelas do JAX</strong></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="jax-icon-button" onClick={runAction} aria-label="Adicionar janela"><Plus /></Button><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Organizar janelas"><Grid2X2 /></Button></div></div><div className="jax-window-canvas" onPointerMove={onWindowPointerMove} onPointerUp={stopDragging} onPointerLeave={stopDragging}>{visibleWindows.length === 0 ? <div className="jax-canvas-empty"><LayoutPanelTop /><strong>Seu espaço está limpo</strong><small>Abra uma tela pelo central de comando.</small></div> : visibleWindows.map((item) => { const meta = windowMeta[item.id]; const Icon = meta.icon; return <article key={item.id} className={`jax-window-card window-${item.id}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.z }} onPointerDown={() => focusWindow(item.id)}><header className="jax-window-titlebar" onPointerDown={(event) => onWindowPointerDown(event, item.id)}><div className="flex items-center gap-2"><span className={`jax-window-icon ${meta.color}`}><Icon /></span><span><strong>{meta.title}</strong><small>{meta.subtitle}</small></span></div><div className="flex items-center gap-1"><button onClick={() => toggleWindow(item.id)} aria-label={`Minimizar ${meta.title}`}><Minus /></button><button onClick={() => closeWindow(item.id)} aria-label={`Fechar ${meta.title}`}><X /></button></div></header><WindowContent id={item.id} onAction={runAction} /></article> })}</div></section>
        </section>

        <aside className="jax-inspector"><div className="jax-inspector-head"><div><div className="jax-section-label">Sistema</div><h2>Controle rápido</h2></div><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Mais opções"><MoreHorizontal /></Button></div><div className="jax-health-card"><div className="flex items-center gap-2"><ShieldCheck /><span>Sistema saudável</span></div><strong>98.7<span>%</span></strong><div className="jax-health-line">{Array.from({ length: 10 }).map((_, index) => <span key={index} style={{ height: `${35 + ((index * 17) % 60)}%` }} />)}</div><small>Pronto para executar</small></div><div className="jax-inspector-section"><div className="jax-section-label">Estado do agente</div><div className="jax-agent-state"><div className="jax-agent-icon"><Volume2 /></div><div><strong>JAX pronto</strong><small>{statusCopy}</small></div><span className="jax-live-dot ml-auto" /></div></div><div className="jax-inspector-section"><div className="flex items-center justify-between"><div className="jax-section-label mb-0">Pontes disponíveis</div><button className="jax-text-button">Configurar</button></div><div className="jax-bridge-list"><div><TerminalSquare /><span><strong>Codex</strong><small>Backend e execução</small></span><b>READY</b></div><div><BrainCircuit /><span><strong>Memória</strong><small>Arquivos locais</small></span><b>READY</b></div><div><Waves /><span><strong>Voz</strong><small>Realtime preparado</small></span><b>LINK</b></div></div></div><div className="jax-inspector-section mt-auto"><div className="jax-section-label">Próximo passo</div><div className="jax-next-step"><span>01</span><div><strong>Conectar ferramentas</strong><small>Google, YouTube e agenda ficam nesta camada.</small></div></div></div></aside>
      </div>
      <footer className="jax-footer"><span>JAX PERSONAL OS · PREVIEW 0.2</span><span className="hidden sm:inline">MOVA · MINIMIZE · ORGANIZE</span><span className="flex items-center gap-2"><Volume2 /> ÁUDIO ATIVO</span></footer>
    </main>
  )
}

function WindowContent({ id, onAction }: { id: WindowId; onAction: () => void }) {
  if (id === "news") return <div className="jax-window-content news-content"><div className="news-filter"><Search /><span>tecnologia + IA</span><span className="news-location">São Paulo · agora</span></div>{news.map(([number, title, source]) => <button className="news-row" key={number} onClick={onAction}><span>{number}</span><div><strong>{title}</strong><small>{source}</small></div><ExternalLink /></button>)}</div>
  if (id === "youtube") return <div className="jax-window-content video-content"><div className="video-preview"><div className="video-grid" /><button onClick={onAction} aria-label="Reproduzir vídeo"><Play /></button><span>youtube.com</span></div><div className="video-meta"><strong>Vídeo aberto pelo JAX</strong><small>Pronto para reproduzir em uma janela</small></div></div>
  return <div className="jax-window-content codex-content"><div className="code-line"><span>01</span><code>const workspace = await jax.connect()</code></div><div className="code-line"><span>02</span><code>workspace.open("google-news")</code></div><div className="code-line active"><span>03</span><code>await codex.execute(nextAction)</code></div><div className="codex-status"><span /><span>Codex aguardando comando do backend</span></div></div>
}
