"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  ArrowUp,
  BrainCircuit,
  Command,
  Cpu,
  Eye,
  FolderKanban,
  Grid2X2,
  Headphones,
  LayoutPanelTop,
  Maximize2,
  Mic2,
  Minus,
  MoreHorizontal,
  Move,
  PanelLeft,
  PlugZap,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  TerminalSquare,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParticleOrb, type OrbState } from "@/components/particle-orb"

const quickActions = [
  { label: "Planejar meu dia", detail: "Agenda, tarefas e prioridades", icon: Activity },
  { label: "Abrir workspace", detail: "Projetos e arquivos recentes", icon: FolderKanban },
  { label: "Revisar automações", detail: "Rotinas aguardando aprovação", icon: Zap },
]

const integrations = [
  { name: "Codex", detail: "Código e execução", icon: TerminalSquare, status: "Conectado", tone: "cyan" },
  { name: "Google Calendar", detail: "Agenda e compromissos", icon: Activity, status: "Conectar", tone: "amber" },
  { name: "Notion", detail: "Notas e documentação", icon: BrainCircuit, status: "Conectar", tone: "purple" },
]

const activityItems = [
  ["09:42", "Mapeando prioridades do projeto JAX", "em execução"],
  ["09:39", "Memória de contexto sincronizada", "concluído"],
  ["09:31", "Conexão com Codex aguardando endpoint", "aguardando"],
]

export function JaxWorkspace() {
  const [orbState, setOrbState] = useState<OrbState>("idle")
  const [activePanel, setActivePanel] = useState("Comando")
  const [isListening, setIsListening] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(true)

  const statusCopy = useMemo(
    () => ({
      idle: "Pronto para agir",
      listening: "Ouvindo você",
      thinking: "Processando intenção",
      speaking: "Respondendo em voz",
    })[orbState],
    [orbState],
  )

  function runAction() {
    setOrbState("thinking")
    window.setTimeout(() => setOrbState("speaking"), 900)
    window.setTimeout(() => setOrbState("idle"), 2600)
  }

  function startListening() {
    setIsListening(true)
    setOrbState("listening")
    window.setTimeout(() => setIsListening(false), 3200)
  }

  return (
    <main className="jax-app">
      <div className="jax-noise" />
      <header className="jax-topbar">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="jax-icon-button lg:hidden" onClick={() => setIsSidebarOpen((value) => !value)} aria-label="Abrir navegação">
            <PanelLeft className="size-4" />
          </Button>
          <div className="jax-brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="jax-brand-name">JAX <span>/</span> COGNITIVE OS</div>
            <div className="jax-brand-subtitle">Painel de trabalho pessoal</div>
          </div>
        </div>
        <div className="jax-topbar-status">
          <span className="jax-live-dot" />
          <span>JAX ONLINE</span>
          <span className="jax-divider" />
          <span className="hidden sm:inline">LATÊNCIA 24ms</span>
          <Button variant="ghost" size="icon" className="jax-icon-button ml-2" aria-label="Abrir configurações"><Settings2 className="size-4" /></Button>
        </div>
      </header>

      <div className="jax-layout">
        <aside className={`jax-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
          <div className="jax-side-section">
            <div className="jax-section-label">Navegação</div>
            <nav className="space-y-1" aria-label="Navegação principal">
              {[
                [Command, "Comando"],
                [Grid2X2, "Workspaces"],
                [BrainCircuit, "Memória"],
                [PlugZap, "Integrações"],
                [TerminalSquare, "Automações"],
              ].map(([Icon, label]) => (
                <button key={label as string} className={`jax-nav-item ${activePanel === label ? "is-active" : ""}`} onClick={() => setActivePanel(label as string)}>
                  <Icon className="size-4" /> <span>{label as string}</span>
                  {label === "Memória" && <span className="jax-nav-count">12</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="jax-side-section">
            <div className="flex items-center justify-between px-3 mb-2"><div className="jax-section-label mb-0">Telas ativas</div><Plus className="size-3 text-white/35" /></div>
            <div className="space-y-1">
              {["Command Center", "Codex Bridge", "Mission Control"].map((screen, index) => (
                <button key={screen} className="jax-screen-item"><span className={`jax-screen-dot dot-${index + 1}`} />{screen}<MoreHorizontal className="ml-auto size-3.5 text-white/25" /></button>
              ))}
            </div>
          </div>
          <div className="mt-auto jax-side-footer">
            <div className="jax-memory-meter"><div className="flex items-center justify-between"><span>Memória de sessão</span><span>68%</span></div><div className="jax-meter-track"><div /></div></div>
            <button className="jax-user-card"><span className="jax-avatar">LS</span><span className="text-left"><strong>Luiz Souto</strong><small>Responsável pelo workspace</small></span><MoreHorizontal className="ml-auto size-4 text-white/35" /></button>
          </div>
        </aside>

        <section className="jax-main-column">
          <div className="jax-command-strip">
            <div className="flex items-center gap-2"><span className="jax-kicker">MODO ATUAL</span><span className="jax-mode-pill"><Sparkles className="size-3" /> Sessão de trabalho</span></div>
            <div className="flex items-center gap-2"><span className="jax-kicker hidden md:inline">TELA 01 / 03</span><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Gerenciar telas"><LayoutPanelTop className="size-4" /></Button><Button variant="ghost" size="icon" className="jax-icon-button" aria-label="Expandir"><Maximize2 className="size-4" /></Button></div>
          </div>

          <div className="jax-orb-stage">
            <div className="jax-orb-crosshair crosshair-left" /><div className="jax-orb-crosshair crosshair-right" />
            <ParticleOrb state={orbState} />
            <div className="jax-orb-caption"><span className="jax-status-pulse" />{statusCopy}</div>
            <div className="jax-orb-readout"><span>ATIVIDADE</span><strong>JAX</strong><span>ATIVO AGORA</span></div>
          </div>

          <div className="jax-dashboard-heading">
            <div><div className="jax-eyebrow"><Zap className="size-3" /> TUDO PRONTO</div><h1>Painel de <em>comando</em></h1><p>Escolha um foco e deixe o JAX cuidar da próxima etapa.</p></div>
            <Button className={`jax-listen-button ${isListening ? "is-active" : ""}`} onClick={startListening}><Mic2 className="size-4" /> {isListening ? "Ouvindo" : "Falar com JAX"}</Button>
          </div>

          <div className="jax-dashboard-grid">
            <section className="jax-function-card jax-function-card-wide"><div className="jax-card-heading"><div><span className="jax-card-overline">Ações rápidas</span><h2>Comece por aqui</h2></div><Command className="size-4 text-cyan-200" /></div><div className="jax-action-list">{quickActions.map(({ label, detail, icon: Icon }) => <button key={label} className="jax-action-row" onClick={runAction}><span className="jax-action-icon"><Icon className="size-4" /></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowUp className="ml-auto size-4 rotate-45 text-white/30" /></button>)}</div></section>
            <section className="jax-function-card"><div className="jax-card-heading"><div><span className="jax-card-overline">Integrações</span><h2>Ferramentas</h2></div><Plus className="size-4 text-cyan-200" /></div><div className="jax-integration-list">{integrations.map(({ name, detail, icon: Icon, status, tone }) => <button key={name} className="jax-integration-row" onClick={runAction}><span className={`jax-integration-icon ${tone}`}><Icon className="size-4" /></span><span><strong>{name}</strong><small>{detail}</small></span><span className={`jax-connection-status ${status === "Conectado" ? "connected" : ""}`}>{status}</span></button>)}</div></section>
            <section className="jax-function-card"><div className="jax-card-heading"><div><span className="jax-card-overline">Rotinas</span><h2>Próximas execuções</h2></div><Activity className="size-4 text-cyan-200" /></div><div className="jax-routine-list"><div><span className="jax-routine-time">10:00</span><span><strong>Resumo diário</strong><small>Hoje · calendário + tarefas</small></span><span className="jax-routine-dot" /></div><div><span className="jax-routine-time">14:30</span><span><strong>Revisar pull requests</strong><small>Hoje · Codex</small></span><span className="jax-routine-dot purple" /></div><div><span className="jax-routine-time">18:00</span><span><strong>Fechamento do dia</strong><small>Hoje · memória</small></span><span className="jax-routine-dot amber" /></div></div></section>
            <section className="jax-function-card"><div className="jax-card-heading"><div><span className="jax-card-overline">Memória</span><h2>Contexto recente</h2></div><BrainCircuit className="size-4 text-cyan-200" /></div><div className="jax-memory-list"><div><span className="jax-memory-type">PROJETO</span><strong>JAX / interface</strong><small>12 itens atualizados hoje</small></div><div><span className="jax-memory-type">PREFERÊNCIA</span><strong>Respostas objetivas</strong><small>Salvo por Luiz</small></div></div></section>
          </div>
        </section>

        <aside className={`jax-inspector ${isActivityOpen ? "is-open" : ""}`}>
          <div className="jax-inspector-head"><div><div className="jax-section-label">Visão geral</div><h2>Seu painel</h2></div><Button variant="ghost" size="icon" className="jax-icon-button" onClick={() => setIsActivityOpen((value) => !value)} aria-label="Recolher telemetria"><Minus className="size-4" /></Button></div>
          <div className="jax-health-card"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-cyan-300" /><span>Sistema saudável</span></div><strong>98.7<span>%</span></strong><div className="jax-health-line"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><small>Performance cognitiva</small></div>
          <div className="jax-inspector-section"><div className="jax-section-label">Estado do agente</div><div className="jax-agent-state"><div className="jax-agent-icon"><Headphones className="size-4" /></div><div><strong>JAX pronto</strong><small>{statusCopy}</small></div><span className="jax-live-dot ml-auto" /></div></div>
          <div className="jax-inspector-section"><div className="flex items-center justify-between"><div className="jax-section-label mb-0">Atividade recente</div><button className="jax-text-button">Ver tudo</button></div><div className="mt-3 space-y-4">{activityItems.map(([time, label, status]) => <div key={label} className="jax-activity-row"><span className="jax-activity-time">{time}</span><span className="jax-activity-line" /><div><p>{label}</p><small className={status === "concluído" ? "is-done" : ""}>{status}</small></div></div>)}</div></div>
          <div className="jax-inspector-section mt-auto"><div className="jax-section-label">Pontes</div><div className="jax-bridge-card"><div className="flex items-center gap-2"><div className="jax-bridge-icon"><Cpu className="size-4" /></div><div><strong>Codex / backend</strong><small>Contrato pronto para conectar</small></div></div><span className="jax-bridge-status">READY</span></div><div className="jax-bridge-card"><div className="flex items-center gap-2"><div className="jax-bridge-icon purple"><Waves className="size-4" /></div><div><strong>Realtime voice</strong><small>Canal de áudio preparado</small></div></div><span className="jax-bridge-status muted">LINK</span></div></div>
        </aside>
      </div>
      <footer className="jax-footer"><span>JAX COGNITIVE OS · PREVIEW BUILD 0.1</span><span className="hidden sm:inline">ARRASTE JANELAS · REDIMENSIONE · COMANDE</span><span className="flex items-center gap-2"><Volume2 className="size-3" /> ÁUDIO ATIVO</span></footer>
    </main>
  )
}
