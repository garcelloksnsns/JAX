"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

export function JaxResourcePanel({ id }: { id: string }) {
  const [repository, setRepository] = useState("")
  const [message, setMessage] = useState("")
  if (id === "projects") {
    const valid = /^[a-z\d](?:[a-z\d-]*[a-z\d])?\/[a-z\d_.-]+$/i.test(repository.trim()) && !repository.includes("..")
    return <div className="jax-capability-content"><span className="jax-capability-status">REPOSITÓRIO AINDA NÃO CONECTADO</span><h2>Seu projeto, em qualquer tela.</h2><p>Abra um repositório no GitHub. Listar projetos, ler código e pedir alterações ao Codex depende da integração autenticada; esta janela não acessa sua conta.</p><label>Repositório<input placeholder="organização/repositório" autoCapitalize="none" autoCorrect="off" value={repository} onChange={(event) => setRepository(event.target.value)} /></label>{valid && <a className="jax-resource-link" href={`https://github.com/${repository.trim().split("/").map(encodeURIComponent).join("/")}`} target="_blank" rel="noopener noreferrer">Abrir repositório <ExternalLink size={16} /></a>}<small>O contexto digitado fica somente nesta sessão. O plano e o contrato para o Codex acompanham o código no GitHub.</small></div>
  }
  if (id === "whatsapp") return <div className="jax-capability-content"><span className="jax-capability-status">PREPARAÇÃO · SEM ENVIO AUTOMÁTICO</span><h2>Você revisa e envia.</h2><p>Prepare o texto e escolha o contato dentro do WhatsApp. O link abre o aplicativo ou o site, conforme o dispositivo. Nenhuma conversa é lida pelo JAX.</p><label>Mensagem<textarea rows={3} maxLength={4000} placeholder="Escreva sua mensagem…" value={message} onChange={(event) => setMessage(event.target.value)} /></label><a className="jax-resource-link" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Continuar no WhatsApp <ExternalLink size={16} /></a><small>O texto é incluído no link enviado ao WhatsApp apenas quando você o abre. Confirme o destinatário e toque em enviar lá.</small></div>
  if (id === "install") return <div className="jax-capability-content"><span className="jax-capability-status">ANDROID + PC · MESMO WORKSPACE</span><h2>Leve o JAX com você.</h2><p>No Chrome Android, abra a versão HTTPS e use o menu do navegador → Adicionar à tela inicial ou Instalar app, quando disponível. A interface continua funcionando no PC.</p><p>APK: o repositório contém uma base Android e um workflow manual para gerar um APK de teste. Ele abre a URL HTTPS do seu JAX; não inclui um servidor nem promete todas as APIs do Chrome.</p><p>Termux: o guia no GitHub explica como servir o workspace na rede local e abrir pelo PC. Microfone e outras APIs podem exigir HTTPS. Não exponha o servidor de desenvolvimento à internet.</p><small>Sem modo offline, sem escuta em segundo plano e sem controle irrestrito de outros aplicativos. Voz no APK depende do suporte do Android WebView.</small></div>
  return null
}
