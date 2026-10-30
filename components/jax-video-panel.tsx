"use client"

import { useEffect, useState } from "react"

type Video = { id: string; title: string; channel: string; url: string; embedUrl: string }

export function JaxVideoPanel({ query, url, embedUrl, onSelect }: { query: string; url?: string; embedUrl?: string; onSelect: (video: Video) => void }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [error, setError] = useState("")
  useEffect(() => {
    if (embedUrl || !query) return
    const controller = new AbortController()
    fetch(`/api/jax/videos?q=${encodeURIComponent(query)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Busca indisponível."); return data })
      .then((data) => { setVideos(data.videos); setError("") })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [query, embedUrl])
  return <div className="jax-capability-content"><div className="jax-capability-status">YOUTUBE</div>{embedUrl && <iframe className="jax-video-frame" title="Vídeo do YouTube" src={embedUrl} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}{error && <p role="status">{error}</p>}{!embedUrl && <h2>{query}</h2>}{videos.length > 0 && !embedUrl && <ul className="jax-result-list">{videos.map((video) => <li key={video.id}><button className="jax-video-choice" onClick={() => onSelect(video)}>{video.title}<small>{video.channel}</small></button></li>)}</ul>}{url && <a className="jax-resource-link" href={url} target="_blank" rel="noopener noreferrer">Abrir no YouTube</a>}</div>
}
