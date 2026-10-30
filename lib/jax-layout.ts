export type JaxRect = { x: number; y: number; width: number; height: number }
export type JaxLayout = {
  mobile: boolean
  compact: boolean
  viewport: JaxRect & { scale: number }
  workspace: JaxRect
  normal: JaxRect
  fullscreen: JaxRect
  safeArea: { top: number; right: number; bottom: number; left: number }
}

export function fitWindow(rect: JaxRect, area: JaxRect): JaxRect {
  const width = Math.max(1, Math.min(rect.width, area.width))
  const height = Math.max(1, Math.min(rect.height, area.height))
  return {
    width, height,
    x: Math.max(area.x, Math.min(rect.x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(rect.y, area.y + area.height - height)),
  }
}

export function resizeWindow(rect: JaxRect, width: number, height: number, area: JaxRect): JaxRect {
  return fitWindow({ ...rect,
    width: Math.max(Math.min(220, area.width), Math.min(width, area.x + area.width - rect.x)),
    height: Math.max(Math.min(120, area.height), Math.min(height, area.y + area.height - rect.y)),
  }, area)
}

export const initialLayout: JaxLayout = {
  mobile: false, compact: false,
  viewport: { x: 0, y: 0, width: 900, height: 650, scale: 1 },
  workspace: { x: 0, y: 60, width: 900, height: 590 },
  normal: { x: 156, y: 8, width: 728, height: 300 },
  fullscreen: { x: 0, y: 60, width: 900, height: 590 },
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
}
