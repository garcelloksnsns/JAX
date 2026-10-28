"use client"

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { ExternalLink, Maximize2, Minimize2, Minus, MoveDiagonal2, X } from "lucide-react"

export type JaxWindowState = {
  id: string; title: string; query: string; url?: string; embedUrl?: string
  x: number; y: number; width: number; height: number
  minimized: boolean; maximized: boolean; z: number; closing?: boolean
}
export type WindowPatch = Partial<Omit<JaxWindowState, "id">>

export function JaxWindow({ item, patch, close, focus, children }: {
  item: JaxWindowState; patch: (patch: WindowPatch) => void; close: () => void; focus: () => void; children?: ReactNode
}) {
  const element = useRef<HTMLElement>(null)
  const [dragging, setDragging] = useState(false)
  const [viewport, setViewport] = useState({ x: 0, y: 60, width: 0, height: 0 })
  useEffect(() => {
    const desktop = element.current?.closest("[data-jax-desktop]")
    function measure() {
      const bounds = desktop?.getBoundingClientRect()
      setViewport({ x: bounds?.left ?? 0, y: bounds?.top ?? 60, width: window.innerWidth, height: window.innerHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (desktop) observer.observe(desktop)
    window.addEventListener("resize", measure)
    return () => { observer.disconnect(); window.removeEventListener("resize", measure) }
  }, [])
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
    const bounds = event.currentTarget.closest("[data-jax-desktop]")?.getBoundingClientRect()
    if (!bounds) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (current.kind === "move") patch({
      x: Math.max(8, Math.min(bounds.width - Math.min(current.width, bounds.width - 16) - 8, current.left + dx)),
      y: Math.max(8, Math.min(bounds.height - Math.min(current.height, bounds.height - 16) - 8, current.top + dy)),
    })
    else patch({ width: Math.max(220, Math.min(bounds.width - current.left - 8, current.width + dx)), height: Math.max(160, Math.min(bounds.height - current.top - 8, current.height + dy)) })
  }
  function end() { gesture.current = null; setDragging(false); requestAnimationFrame(() => window.dispatchEvent(new Event('jax:request-ui-snapshot'))) }

  const x = item.minimized ? Math.max(8, viewport.width / 2 - 30) : item.maximized ? 0 : viewport.x + item.x
  const y = item.minimized ? Math.max(8, viewport.height - 32) : item.maximized ? 0 : viewport.y + item.y
  return <section ref={element} data-jax-window={item.id} role="region" aria-label={item.title} tabIndex={item.minimized ? -1 : 0} inert={item.minimized || item.closing}
    className={`jax-floating-window ${item.maximized ? "is-fullscreen" : ""} ${item.minimized ? "is-minimized" : ""} ${dragging ? "is-dragging" : ""} ${item.closing ? "is-closing" : ""}`}
    style={{ transform: `translate3d(${x}px, ${y}px, 0) scale(${item.minimized ? 0.08 : item.closing ? 0.96 : 1})`, width: item.maximized ? viewport.width || "100vw" : item.width, height: item.maximized ? viewport.height || "100dvh" : item.height, zIndex: item.maximized ? 120 : item.z }}
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
    {!item.maximized && <div role="slider" tabIndex={0} aria-label={`Redimensionar ${item.title}`} aria-valuemin={220} aria-valuemax={1920} aria-valuenow={Math.round(item.width)} className="jax-window-resize"
      onPointerDown={(event) => start(event, "resize")} onPointerMove={move} onPointerUp={end} onLostPointerCapture={end}
      onKeyDown={(event) => { if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); const bounds = event.currentTarget.closest('[data-jax-desktop]')?.getBoundingClientRect(); if (!bounds) return; patch({ width: Math.max(220, Math.min(bounds.width - item.x - 8, item.width + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0))), height: Math.max(160, Math.min(bounds.height - item.y - 8, item.height + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0))) }) } }}><MoveDiagonal2 size={15} /></div>}
  </section>
}
