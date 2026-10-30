"use client"

import { useState, type FormEvent } from "react"
import type { ModelProvider, RememberedPreference } from "./jax-settings"

export type LocalKeyStatus = { id: string; label: string; configured: boolean }

export function JaxStandaloneSettings({ providers, provider, model, preferences, keyStatuses, onProvider, onModel, onSaveKey, onForget, error }: {
  providers: ModelProvider[]; provider: string; model: string; preferences: RememberedPreference[]; keyStatuses: LocalKeyStatus[]
  onProvider: (id: string) => void; onModel: (value: string) => void; onSaveKey: (id: string, key: string) => Promise<void>; onForget: (id: string) => Promise<void>; error: string
}) {
  const [keyId, setKeyId] = useState("gemini")
  const [key, setKey] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const selected = providers.find((item) => item.id === provider)
  const models = selected ? Array.from(new Set([selected.defaultModel, ...selected.models])) : []
  const custom = Boolean(model && !models.includes(model))
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try { await onSaveKey(keyId, key); setKey(""); setNotice(key ? "Chave salva neste aparelho." : "Chave removida.") }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Falha ao salvar.") }
    finally { setBusy(false) }
  }
  return <div className="jax-capability-content">
    <div className="jax-capability-status">CONFIGURAÇÕES LOCAIS</div>
    <p>Este APK guarda chaves, conversa e preferências neste aparelho. As chaves são enviadas apenas às APIs que você usar.</p>
    <form onSubmit={save}><label>Serviço<select value={keyId} onChange={(event) => setKeyId(event.target.value)}>{keyStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}{item.configured ? " · configurado" : ""}</option>)}</select></label><label>Chave ou identificador<input type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Cole aqui; deixe vazio para remover" /></label><button className="jax-resource-link" disabled={busy}>Salvar neste aparelho</button></form>
    {notice && <p role="status">{notice}</p>}
    <label>Provedor da conversa<select value={provider} onChange={(event) => onProvider(event.target.value)}>{providers.map((item) => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}{item.configured ? "" : " · sem chave"}</option>)}</select></label>
    <label>Modelo<select value={custom ? "custom" : model} onChange={(event) => onModel(event.target.value)}><option value="">Padrão: {selected?.defaultModel || "adicione uma chave"}</option>{models.map((name) => <option key={name} value={name}>{name}</option>)}<option value="custom">Outro modelo…</option></select></label>
    {custom && <label>Identificador do modelo<input value={model === "custom" ? "" : model} onChange={(event) => onModel(event.target.value || "custom")} maxLength={120} /></label>}
    <div><strong>Memória de preferências</strong>{preferences.length ? <ul className="jax-memory-list">{preferences.map((item) => <li key={item.id}>{item.text}<button onClick={() => void onForget(item.id)}>Esquecer</button></li>)}</ul> : <p>Diga “eu gosto de…” para guardar uma preferência.</p>}</div>
    {error && <p role="alert">{error}</p>}
  </div>
}
