export type JaxAgentState = "idle" | "listening" | "thinking" | "speaking"

export type JaxScreen = {
  id: string
  title: string
  kind: "command" | "codex" | "mission" | "memory"
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  visible: boolean
}

export type JaxTool = "google.search" | "google.news" | "youtube.open" | "calendar.list" | "codex.execute" | "memory.query"

export type JaxEvent =
  | { type: "user.message"; payload: { text: string; timestamp: number; source: "voice" | "keyboard" | "shortcut" } }
  | { type: "agent.state"; payload: { state: JaxAgentState; label?: string } }
  | { type: "screen.patch"; payload: Partial<JaxScreen> & { id: string } }
  | { type: "screen.open"; payload: { id: string; kind: JaxScreen["kind"]; title: string; url?: string } }
  | { type: "screen.close"; payload: { id: string } }
  | { type: "tool.request"; payload: { tool: JaxTool; input: Record<string, unknown>; requestId: string } }
  | { type: "tool.result"; payload: { tool: JaxTool; requestId: string; status: "started" | "success" | "error"; data?: unknown; error?: string } }
  | { type: "memory.sync"; payload: { namespace: string; status: "queued" | "syncing" | "ready"; count?: number } }

/**
 * Contrato público entre o front-end JAX e o backend do Codex.
 * Substituir o transporte mock por WebSocket/SSE quando o endpoint existir.
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
