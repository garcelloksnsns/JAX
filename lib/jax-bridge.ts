export type JaxAgentState = "idle" | "listening" | "thinking" | "speaking"

export type JaxScreen = {
  id: string
  title: string
  kind: "command" | "codex" | "mission" | "memory" | "browser" | "video" | "document" | "terminal" | "dialog"
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  visible: boolean
}

export type JaxTool = "google.search" | "google.news" | "youtube.open" | "calendar.list" | "codex.execute" | "github.inspect" | "email.draft" | "email.send" | "memory.query" | "browser.open" | "browser.inspect" | "browser.click" | "screen.capture" | "terminal.execute" | "files.read" | "files.mkdir" | "files.move" | "files.delete" | "documents.extract"

export type JaxPermission = {
  capability: JaxTool
  status: "unavailable" | "needs-approval" | "granted" | "denied"
  scope: string[]
  expiresAt?: number
}

export type JaxToolResult = {
  requestId: string
  status: "unavailable" | "awaiting-approval" | "running" | "completed" | "failed" | "cancelled"
  verified: boolean
  output?: unknown
  error?: string
}

export type JaxVoiceMode = "push-to-talk" | "realtime"
export type JaxWindowIntent = "open" | "focus" | "minimize" | "maximize" | "restore" | "close" | "arrange"

export type JaxLayoutPolicy = {
  keepFocus: boolean
  avoidOverlap: boolean
  dockPreviousWindows: boolean
  allowFullscreen: boolean
}

export type JaxEvent =
  | { type: "user.message"; payload: { text: string; timestamp: number; source: "voice" | "keyboard" | "shortcut" } }
  | { type: "agent.state"; payload: { state: JaxAgentState; label?: string } }
  | { type: "screen.patch"; payload: Partial<JaxScreen> & { id: string } }
  | { type: "screen.open"; payload: { id: string; kind: JaxScreen["kind"]; title: string; url?: string } }
  | { type: "screen.close"; payload: { id: string } }
  | { type: "screen.intent"; payload: { intent: JaxWindowIntent; screenId: string; layout?: Partial<JaxLayoutPolicy> } }
  | { type: "tool.request"; payload: { tool: JaxTool; input: Record<string, unknown>; requestId: string; requiresApproval?: boolean } }
  | { type: "voice.configure"; payload: { mode: JaxVoiceMode; locale: string; enabled: boolean } }
  | { type: "tool.result"; payload: { tool: JaxTool; requestId: string; status: "started" | "success" | "error"; data?: unknown; error?: string } }
  | { type: "memory.sync"; payload: { namespace: string; status: "queued" | "syncing" | "ready"; count?: number } }

/**
 * Contrato público entre o front-end JAX e o backend do Codex.
 * Implementar transporte autenticado WebSocket/SSE quando o endpoint existir.
 * Este contrato não concede permissões nem executa ferramentas locais.
 */
export interface JaxBridge {
  send(event: JaxEvent): void
  subscribe(listener: (event: JaxEvent) => void): () => void
  request<T>(route: string, body?: unknown): Promise<T>
}

export const jaxBridgeRoutes = {
  chat: "/api/jax/chat",
  realtime: "/api/jax/realtime",
  memory: "/api/jax/memory",
  screens: "/api/jax/screens",
  tools: "/api/jax/tools",
} as const
