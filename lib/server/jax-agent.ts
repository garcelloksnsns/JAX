import "server-only"

import { answerWithModel, type ProviderId } from "./jax-model"
import type { StoredMessage, Preference } from "./jax-store"

export type WindowContext = { id: string; title: string; x: number; y: number; width: number; height: number; minimized: boolean; maximized: boolean; z: number; videoId?: string }
export type ScreenContext = { viewport: { width: number; height: number }; windows: WindowContext[]; activeWindowId: string | null }
export type SearchIntent = { kind: "web" | "image" | "video"; query: string }
export type WindowIntent = { type: "resize" | "minimize" | "maximize" | "restore" | "close"; id: string; width?: number; height?: number }
export type AgentPlan = { searches: SearchIntent[]; windowActions: WindowIntent[] }

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 10000
export function parseScreen(value: unknown): ScreenContext | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const viewport = raw.viewport as Record<string, unknown> | undefined
  if (!viewport || !finite(viewport.width) || !finite(viewport.height) || !Array.isArray(raw.windows) || raw.windows.length > 30) return null
  const windows = raw.windows.flatMap((item): WindowContext[] => {
    if (!item || typeof item !== "object") return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== "string" || !/^[\w-]{1,100}$/.test(row.id) || typeof row.title !== "string" || ![row.x, row.y, row.width, row.height, row.z].every(finite)) return []
    return [{ id: row.id, title: row.title.slice(0, 120), x: row.x as number, y: row.y as number, width: row.width as number, height: row.height as number, z: row.z as number, minimized: row.minimized === true, maximized: row.maximized === true, ...(typeof row.videoId === "string" && /^[\w-]{11}$/.test(row.videoId) ? { videoId: row.videoId } : {}) }]
  })
  return { viewport: { width: viewport.width as number, height: viewport.height as number }, windows, activeWindowId: typeof raw.activeWindowId === "string" ? raw.activeWindowId.slice(0, 100) : null }
}

export function explicitPreference(text: string): string | null {
  const match = text.trim().match(/^(?:(?:ah|olha|jax)[,!\s]+)?(?:eu\s+)?(?:gosto\s+de|prefiro|minha\s+prefer[êe]ncia\s+[ée]|lembre(?:-se)?\s+(?:de\s+)?que)\s+(.{3,200})/i)
  return match ? match[1].split(/[,;.!?\n]/)[0].trim() : null
}

function fallbackSearches(text: string, preferences: Preference[]): SearchIntent[] {
  if (explicitPreference(text)) return []
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  const query = text.replace(/^(?:jax[,\s]*)?(?:pesquise?|busque?|abra?|abrir|mostre?|quero|sobre)\s+/i, "").trim().slice(0, 200)
  if (/foto|imagem/.test(normalized)) return [...(/pesquis|busc|resum|sobre/.test(normalized) ? [{ kind: "web" as const, query }] : []), { kind: "image", query }]
  if (/video|youtube|musica|clipe/.test(normalized)) {
    const preference = preferences.find((item) => /rap|geek|anime|m[uú]sica|rock|pop/i.test(item.text))?.text
    return [{ kind: "video", query: `${preference || ""} ${query}`.trim().slice(0, 200) }]
  }
  if (/pesquis|busc|notici/.test(normalized)) return [{ kind: "web", query }]
  return []
}

export async function planActions(history: StoredMessage[], text: string, provider: ProviderId, model: string | undefined, preferences: Preference[], screen: ScreenContext | null): Promise<AgentPlan> {
  const context = `Você é o planejador de ações do JAX. Responda SOMENTE JSON válido: {"searches":[{"kind":"web|image|video","query":"..."}],"windowActions":[{"type":"resize|minimize|maximize|restore|close","id":"...","width":n,"height":n}]}. Máximo 2 pesquisas e 2 ações. Planeje pesquisa real quando o usuário pedir vídeo, notícia, pessoa, foto, imagem ou pesquisa web. Para vídeo, use preferências relevantes para melhorar a consulta. Para foto use kind image; para resumo com foto, web e image. Ações de janela só quando pedidas explicitamente pelo usuário e apenas IDs observados. Não feche vídeos por conta própria. Se não houver pesquisa nem ação, use arrays vazios. Preferências confirmadas: ${JSON.stringify(preferences.map((item) => item.text))}. Estado das janelas, em pixels CSS: ${JSON.stringify(screen)}.`
  const raw = await answerWithModel(history, text, provider, model, context)
  try {
    const plan = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { searches?: unknown; windowActions?: unknown }
    const searches = Array.isArray(plan.searches) ? plan.searches.slice(0, 2).flatMap((item): SearchIntent[] => {
      if (!item || typeof item !== "object") return []
      const row = item as Record<string, unknown>
      return (row.kind === "web" || row.kind === "image" || row.kind === "video") && typeof row.query === "string" && row.query.trim().length > 1 && row.query.length <= 200 ? [{ kind: row.kind, query: row.query.trim() }] : []
    }) : []
    const ids = new Set(screen?.windows.map((item) => item.id) || [])
    const allowWindowActions = /fech|minimiz|maximiz|restaur|redimension|aument|diminua|reduz|tamanho|tela cheia/i.test(text)
    const windowActions = allowWindowActions && Array.isArray(plan.windowActions) ? plan.windowActions.slice(0, 2).flatMap((item): WindowIntent[] => {
      if (!item || typeof item !== "object") return []
      const row = item as Record<string, unknown>
      if (typeof row.id !== "string" || !ids.has(row.id) || !["resize", "minimize", "maximize", "restore", "close"].includes(String(row.type))) return []
      const requested = { close: /fech|encerr/i, minimize: /minimiz|diminua|reduz/i, maximize: /maximiz|aument|tela cheia/i, restore: /restaur/i, resize: /redimension|tamanho|aument|diminua|reduz/i } as const
      if (!requested[row.type as keyof typeof requested].test(text)) return []
      return [{ type: row.type as WindowIntent["type"], id: row.id, ...(finite(row.width) ? { width: row.width as number } : {}), ...(finite(row.height) ? { height: row.height as number } : {}) }]
    }) : []
    return { searches: searches.length ? searches : fallbackSearches(text, preferences), windowActions }
  } catch { return { searches: fallbackSearches(text, preferences), windowActions: [] } }
}
