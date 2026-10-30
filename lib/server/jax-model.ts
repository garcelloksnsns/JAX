import "server-only"

import type { StoredMessage } from "./jax-store"

export const providers = {
  openai: { label: "OpenAI", key: "OPENAI_API_KEY", model: "gpt-4.1-mini", models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"], modelEnv: "JAX_OPENAI_MODEL", url: "https://api.openai.com/v1/chat/completions" },
  gemini: { label: "Google Gemini", key: "GEMINI_API_KEY", model: "gemini-2.5-flash", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"], modelEnv: "JAX_GEMINI_MODEL", url: "https://generativelanguage.googleapis.com/v1beta/models" },
  openrouter: { label: "OpenRouter", key: "OPENROUTER_API_KEY", model: "openai/gpt-4.1-mini", models: ["openai/gpt-4.1-mini", "google/gemini-2.5-flash", "anthropic/claude-sonnet-4.5"], modelEnv: "JAX_OPENROUTER_MODEL", url: "https://openrouter.ai/api/v1/chat/completions" },
  anthropic: { label: "Anthropic", key: "ANTHROPIC_API_KEY", model: "claude-sonnet-4-5", models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-1"], modelEnv: "JAX_ANTHROPIC_MODEL", url: "https://api.anthropic.com/v1/messages" },
  groq: { label: "Groq", key: "GROQ_API_KEY", model: "llama-3.3-70b-versatile", models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b"], modelEnv: "JAX_GROQ_MODEL", url: "https://api.groq.com/openai/v1/chat/completions" },
  deepseek: { label: "DeepSeek", key: "DEEPSEEK_API_KEY", model: "deepseek-chat", models: ["deepseek-chat", "deepseek-reasoner"], modelEnv: "JAX_DEEPSEEK_MODEL", url: "https://api.deepseek.com/chat/completions" },
} as const

export type ProviderId = keyof typeof providers
export const isProviderId = (value: unknown): value is ProviderId => typeof value === "string" && Object.hasOwn(providers, value)
export function availableProviders() {
  return (Object.keys(providers) as ProviderId[]).map((id) => ({ id, label: providers[id].label, configured: Boolean(process.env[providers[id].key]), defaultModel: process.env[providers[id].modelEnv] || providers[id].model, models: [...providers[id].models] }))
}

const system = "Você é JAX, um assistente pessoal em português. Responda com clareza. Você ainda não possui ferramentas, acesso a contas, arquivos, terminal ou tela. Nunca afirme ter executado ações externas."

export async function answerWithModel(history: StoredMessage[], text: string, providerId: ProviderId, requestedModel?: string, context = ""): Promise<string> {
  const provider = providers[providerId]
  const key = process.env[provider.key]
  if (!key) throw new Error("MODEL_NOT_CONFIGURED")
  const model = requestedModel || process.env[provider.modelEnv] || provider.model
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,119}$/.test(model)) throw new Error("INVALID_MODEL")
  const recent = history.slice(-20).map((message) => ({ role: message.role, content: message.text }))
  const instructions = context ? `${system}\n${context.slice(0, 12000)}` : system
  let url: string = provider.url
  let headers: Record<string, string> = { "Content-Type": "application/json" }
  let body: object
  if (providerId === "gemini") {
    url += `/${encodeURIComponent(model)}:generateContent`
    headers["x-goog-api-key"] = key
    body = { systemInstruction: { parts: [{ text: instructions }] }, contents: [...recent, { role: "user", content: text }].map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })) }
  } else if (providerId === "anthropic") {
    headers = { ...headers, "x-api-key": key, "anthropic-version": "2023-06-01" }
    body = { model, system: instructions, max_tokens: 1200, messages: [...recent, { role: "user", content: text }] }
  } else {
    headers.Authorization = `Bearer ${key}`
    if (providerId === "openrouter") headers["X-Title"] = "JAX Workspace"
    body = { model, messages: [{ role: "system", content: instructions }, ...recent, { role: "user", content: text }] }
  }
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000), cache: "no-store" })
  if (!response.ok) throw new Error(`MODEL_REQUEST_FAILED_${response.status}`)
  const data: unknown = await response.json()
  let content: unknown
  if (providerId === "gemini") content = (data as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter((part) => typeof part === "string").join("\n")
  else if (providerId === "anthropic") content = (data as { content?: { type?: string; text?: unknown }[] })?.content?.filter((part) => part.type === "text").map((part) => part.text).filter((part) => typeof part === "string").join("\n")
  else content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) throw new Error("MODEL_EMPTY_RESPONSE")
  return content.slice(0, 20000)
}
