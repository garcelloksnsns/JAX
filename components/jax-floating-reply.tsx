"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { fitWindow, type JaxRect } from "@/lib/jax-layout"

export function JaxFloatingReply({ text, area, onDismiss }: { text: string; area: JaxRect; onDismiss: () => void }) {
  const element = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: area.x + 12, y: area.y + 12 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const bounds = element.current?.getBoundingClientRect()
    if (bounds) setPosition((old) => { const next = fitWindow({ ...old, width: bounds.width, height: bounds.height }, area); return next.x === old.x && next.y === old.y ? old : { x: next.x, y: next.y } })
  }, [area, text])
  return <div ref={element} className="jax-floating-dialog" role="status" style={{ left: position.x, top: position.y, maxHeight: area.height, width: Math.min(310, area.width - 16) }}><header
    onPointerDown={(event) => { if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return; drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }; event.currentTarget.setPointerCapture(event.pointerId) }}
    onPointerMove={(event) => { const bounds = element.current?.getBoundingClientRect(); if (!drag.current || !bounds) return; const next = fitWindow({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y, width: bounds.width, height: bounds.height }, area); setPosition({ x: next.x, y: next.y }) }}
    onPointerUp={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}><span>JAX</span><button aria-label="Dispensar resposta" onClick={onDismiss}><X size={18} /></button></header><p>{text}</p></div>
}
