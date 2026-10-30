"use client"

export function JaxImagePanel({ title, imageUrl, sourceUrl }: { title: string; imageUrl?: string; sourceUrl?: string }) {
  return <div className="jax-capability-content"><div className="jax-capability-status">IMAGEM DE FONTE EXTERNA</div><h2>{title}</h2>{imageUrl ? <img className="jax-found-image" src={imageUrl} alt={title} referrerPolicy="no-referrer" /> : <p>Não foi encontrada uma imagem verificável.</p>}{sourceUrl && <a className="jax-resource-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Ver fonte da imagem</a>}</div>
}
