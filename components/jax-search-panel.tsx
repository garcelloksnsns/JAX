"use client"

import { useEffect, useState } from "react"

type Result = { title: string; url: string; snippet: string; source: string }

export function JaxSearchPanel({ query, news, url }: { query: string; news: boolean; url?: string }) {
  const [results, setResults] = useState<Result[]>([])
  const [provider, setProvider] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/jax/search?q=${encodeURIComponent(query)}${news ? "&type=news" : ""}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Busca indisponível."); return data })
      .then((data) => { setResults(data.results); setProvider(data.provider); setError("") })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [query, news])
  return <div className="jax-capability-content"><div className="jax-capability-status">{news ? "NOTÍCIAS" : "PESQUISA WEB"} {provider && `· ${provider}`}</div><h2>{query}</h2>{error && <p role="status">{error}</p>}{results.length > 0 && <ul className="jax-result-list">{results.map((item) => <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a><small>{item.source}</small><p>{item.snippet}</p></li>)}</ul>}{url && <a className="jax-resource-link" href={url} target="_blank" rel="noopener noreferrer">Abrir pesquisa no navegador</a>}</div>
}
