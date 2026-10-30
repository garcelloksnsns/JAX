"use client"

import { useEffect, useState, type RefObject } from "react"
import { initialLayout, type JaxLayout } from "@/lib/jax-layout"

export function useJaxLayout(root: RefObject<HTMLElement | null>, desktop: RefObject<HTMLDivElement | null>) {
  const [layout, setLayout] = useState<JaxLayout>(initialLayout)
  useEffect(() => {
    const main = root.current
    const workspace = desktop.current
    if (!main || !workspace) return
    let frame = 0
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    let lastWidth = 0
    let lastHeight = 0
    const viewport = window.visualViewport
    const measure = () => {
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      if (width !== lastWidth || height !== lastHeight) {
        main.setAttribute("data-reflowing", "true")
        clearTimeout(settleTimer)
        settleTimer = setTimeout(() => main.removeAttribute("data-reflowing"), 180)
        lastWidth = width
        lastHeight = height
      }
      const x = viewport?.offsetLeft ?? 0
      const y = viewport?.offsetTop ?? 0
      main.style.setProperty("--jax-vh", `${height}px`)
      main.style.setProperty("--jax-vw", `${width}px`)
      main.style.setProperty("--jax-vx", `${x}px`)
      main.style.setProperty("--jax-vy", `${y}px`)
      const mobile = width < 720
      const compact = height < 480
      main.classList.toggle("is-mobile", mobile)
      main.classList.toggle("is-compact", compact)
      const bounds = workspace.getBoundingClientRect()
      const conversation = workspace.querySelector(".jax-minimal-conversation")?.getBoundingClientRect()
      const dock = workspace.querySelector(".jax-window-dock")?.getBoundingClientRect()
      const styles = getComputedStyle(main)
      const safeArea = { top: parseFloat(styles.paddingTop) || 0, right: parseFloat(styles.paddingRight) || 0, bottom: parseFloat(styles.paddingBottom) || 0, left: parseFloat(styles.paddingLeft) || 0 }
      const left = mobile ? 12 : 156
      const bottom = conversation ? conversation.top - bounds.top - (mobile && !compact ? 66 : 8) : bounds.height * .55
      const next: JaxLayout = {
        mobile, compact, viewport: { x, y, width, height, scale: viewport?.scale ?? 1 },
        workspace: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        normal: { x: Math.min(left, bounds.width / 3), y: 8, width: Math.max(1, bounds.width - Math.min(left, bounds.width / 3) - 12), height: Math.max(48, bottom - 8) },
        fullscreen: { x: bounds.x, y: bounds.y, width: bounds.width, height: Math.max(48, (dock ? dock.top : bounds.bottom) - bounds.top - (dock ? 8 : 0)) },
        safeArea,
      }
      setLayout((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(workspace)
    const conversation = workspace.querySelector(".jax-minimal-conversation")
    if (conversation) observer.observe(conversation)
    const mutation = new MutationObserver(schedule)
    mutation.observe(workspace, { childList: true })
    viewport?.addEventListener("resize", schedule)
    viewport?.addEventListener("scroll", schedule)
    window.addEventListener("resize", schedule)
    measure()
    return () => { cancelAnimationFrame(frame); clearTimeout(settleTimer); main.removeAttribute("data-reflowing"); observer.disconnect(); mutation.disconnect(); viewport?.removeEventListener("resize", schedule); viewport?.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule) }
  }, [root, desktop])
  return layout
}
