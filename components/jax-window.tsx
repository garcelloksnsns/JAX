"use client"

import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import { fitWindow, resizeWindow, type JaxLayout } from "@/lib/jax-layout"
import { ExternalLink, Maximize2, Minimize2, Minus, MoveDiagonal2, X } from "lucide-react"

export type JaxWindowState = {
  id: string; title: string; query: string; url?: string; embedUrl?: string; imageUrl?: string; sourceUrl?: string
  x: number; y: number; width: number; height: number
  minimized: boolean; maximized: boolean; z: number; closing?: boolean
}
export type WindowPatch = Partial<Omit<JaxWindowState, "id">>

export function JaxWindow({ item, layout, patch, close, focus, children }: {
  item: JaxWindowState; layout: JaxLayout; patch: (patch: WindowPatch) => void; close: () => void; focus: () => void; children?: ReactNode
}) {
  const element = useRef<HTMLElement>(null)
  const [dragging, setDragging] = useState(false)
  const { viewport, workspace, normal, fullscreen } = layout
  const gesture = useRef<{ kind: "move" | "resize"; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null)
  function start(event: PointerEvent<HTMLElement>, kind: "move" | "resize") {
    if (event.button !== 0 || item.maximized || (event.target as HTMLElement).closest("button,a,input,textarea")) return
    event.preventDefault()
    setDragging(true)
    focus()
    gesture.current = { kind, x: event.clientX, y: event.clientY, left: item.x, top: item.y, width: item.width, height: item.height }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = gesture.current
    if (!current) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    const rect = { x: current.left, y: current.top, width: current.width, height: current.height }
    if (current.kind === "move") patch(fitWindow({ ...rect, x: current.left + dx, y: current.top + dy }, normal))
    else patch(resizeWindow(rect, current.width + dx, current.height + dy, normal))
  }
  function end() { gesture.current = null; setDragging(false); requestAnimationFrame(() => window.dispatchEvent(new Event('jax:request-ui-snapshot'))) }

  const x = item.minimized ? viewport.x + viewport.width / 2 - 30 : item.maximized ? fullscreen.x : workspace.x + item.x
  const y = item.minimized ? viewport.y + viewport.height - 32 : item.maximized ? fullscreen.y : workspace.y + item.y
  return <section ref={element} data-jax-window={item.id} role="region" aria-label={item.title} tabIndex={item.minimized ? -1 : 0} inert={item.minimized || item.closing}
    className={`jax-floating-window ${item.maximized ? "is-fullscreen" : ""} ${item.minimized ? "is-minimized" : ""} ${dragging ? "is-dragging" : ""} ${item.closing ? "is-closing" : ""}`}
    style={{ transform: `translate3d(${x}px, ${y}px, 0) scale(${item.minimized ? 0.08 : item.closing ? 0.96 : 1})`, width: item.maximized ? fullscreen.width : item.width, height: item.maximized ? fullscreen.height : item.height, zIndex: item.maximized ? 120 : item.z }}
    onTransitionEnd={(event) => { if (event.target === event.currentTarget && event.propertyName === 'transform') window.dispatchEvent(new Event('jax:request-ui-snapshot')) }}
    onPointerDown={focus} onKeyDown={(event) => { if (event.key === "Escape") { if (item.maximized) patch({ maximized: false }); else close() } }}>
    <header className="jax-floating-title" onPointerDown={(event) => start(event, "move")} onPointerMove={move} onPointerUp={end} onLostPointerCapture={end}>
      <strong>{item.title}</strong><div className="jax-window-actions" onPointerDown={(event) => event.stopPropagation()}>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.title} no navegador`}><ExternalLink size={14} /></a>}
        <button aria-label={`Minimizar ${item.title}`} onClick={() => patch({ minimized: true, maximized: false })}><Minus size={14} /></button>
        <button aria-label={`${item.maximized ? "Restaurar" : "Maximizar"} ${item.title}`} onClick={() => patch({ maximized: !item.maximized })}>{item.maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        <button aria-label={`Fechar ${item.title}`} onClick={close}><X size={14} /></button>
      </div>
    </header>
    <div className="jax-floating-body">{children ?? (item.embedUrl
      ? <iframe title={item.title} src={item.embedUrl} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      : <div className="jax-resource"><span className="jax-resource-label">{item.id === "youtube" ? "YOUTUBE" : "RECURSO EXTERNO"}</span><h2>{item.query}</h2><p>{item.id === "youtube" ? "Abra a pesquisa e envie o link do vídeo para reproduzi-lo aqui." : "Este serviço abre em uma nova aba: o site pode impedir a incorporação. Não tenho acesso à sua conta ou ao conteúdo dessa aba."}</p>{item.url && <a className="jax-resource-link" href={item.url} target="_blank" rel="noopener noreferrer">Abrir no navegador <ExternalLink size={14} /></a>}</div>)}</div>
    {!item.maximized && item.height >= 120 && item.width >= 240 && <div role="slider" tabIndex={0} aria-label={`Redimensionar ${item.title}`} aria-valuemin={Math.min(220, normal.width)} aria-valuemax={Math.floor(normal.width)} aria-valuenow={Math.round(item.width)} className="jax-window-resize"
      onPointerDown={(event) => start(event, "resize")} onPointerMove={move} onPointerUp={end} onLostPointerCapture={end}
      onKeyDown={(event) => { if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); patch(resizeWindow(item, item.width + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0), item.height + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0), normal)) } }}><MoveDiagonal2 size={15} /></div>}
  </section>
}
