"use client"

import { useState, type FormEvent } from "react"

export type ModelProvider = { id: string; label: string; configured: boolean; defaultModel: string; models: string[] }
export type RememberedPreference = { id: string; text: string; createdAt: number }

export function JaxSettings({ configured, authenticated, providers, provider, model, preferences, onProvider, onModel, onLogin, onLogout, onForget, error }: {
  configured: boolean; authenticated: boolean; providers: ModelProvider[]; provider: string; model: string
  preferences: RememberedPreference[]; onProvider: (id: string) => void; onModel: (model: string) => void
  onLogin: (password: string) => Promise<void>; onLogout: () => Promise<void>; onForget: (id: string) => Promise<void>; error: string
}) {
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const selected = providers.find((item) => item.id === provider)
  const models = selected ? Array.from(new Set([selected.defaultModel, ...selected.models])) : []
  const custom = Boolean(model && !models.includes(model))
  async function login(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try { await onLogin(password); setPassword("") } finally { setBusy(false) }
  }
  return <div className="jax-capability-content">
    <div className="jax-capability-status">CONFIGURAÇÕES DO BACKEND</div>
    {!configured && <p>Defina JAX_OWNER_PASSWORD no servidor para ativar o login. As chaves dos modelos também ficam no servidor.</p>}
    {configured && !authenticated && <form onSubmit={login}><p>Entre para sincronizar a conversa neste servidor.</p><label>Senha do proprietário<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="jax-resource-link" disabled={busy}>Entrar</button></form>}
    {authenticated && <><p>Conversa autenticada. As chaves de API nunca aparecem nesta página.</p><label>Provedor<select value={provider} onChange={(event) => onProvider(event.target.value)}>{providers.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}{item.configured ? "" : " · sem chave"}</option>)}</select></label><label>Modelo<select value={custom ? "custom" : model} onChange={(event) => onModel(event.target.value === "custom" ? "custom" : event.target.value)}><option value="">Padrão: {selected?.defaultModel || "configure um provedor"}</option>{models.map((name) => <option key={name} value={name}>{name}</option>)}<option value="custom">Outro modelo…</option></select></label>{custom && <label>Identificador do modelo<input value={model === "custom" ? "" : model} onChange={(event) => onModel(event.target.value || "custom")} maxLength={120} placeholder="nome exato do provedor" /></label>}<small>A lista oferece opções comuns. A disponibilidade depende da sua chave e do provedor.</small><div><strong>Memória de preferências</strong>{preferences.length === 0 ? <p>Nenhuma preferência salva. Diga “eu gosto de…” ou “lembre que…”.</p> : <ul className="jax-memory-list">{preferences.map((item) => <li key={item.id}><span>{item.text}</span><button aria-label={`Esquecer ${item.text}`} onClick={() => void onForget(item.id)}>Esquecer</button></li>)}</ul>}</div><button className="jax-resource-link" onClick={() => void onLogout()}>Sair</button></>}
    {error && <p role="alert">{error}</p>}
  </div>
}
