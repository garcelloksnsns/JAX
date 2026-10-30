"use client"

import { useEffect, useRef } from "react"
import { Code2, FolderGit2, Github, Globe, Mail, MessageCircle, Search, Smartphone, Video, X } from "lucide-react"
import { capabilities } from "@/components/jax-capabilities"
import type { JaxWindowState } from "@/components/jax-window"

export type JaxResource = { id: string; title: string; query: string; url?: string; embedUrl?: string; imageUrl?: string; sourceUrl?: string }
export const shortcuts = [
  { id: "projects", title: "Projetos", icon: FolderGit2, query: "Seu projeto, de qualquer tela" },
  { id: "github", title: "GitHub", icon: Github, query: "Acesso ao GitHub", url: "https://github.com/" },
  { id: "codex", title: "Codex", icon: Code2, query: "Continuar o desenvolvimento no Codex", url: "https://chatgpt.com/codex" },
  { id: "chatgpt", title: "ChatGPT", icon: MessageCircle, query: "Acesso ao ChatGPT", url: "https://chatgpt.com/" },
  { id: "whatsapp", title: "WhatsApp", icon: MessageCircle, query: "Preparar mensagem no WhatsApp" },
  { id: "email", title: "E-mail", icon: Mail, query: "Acesso ao e-mail · nenhum envio automático", url: "https://mail.google.com/mail/u/0/#inbox" },
  { id: "search", title: "Pesquisa e clima", icon: Search, query: "Pesquisar na web", url: "https://www.google.com/" },
  { id: "news", title: "Notícias", icon: Globe, query: "Notícias com fontes externas", url: "https://news.google.com/?hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { id: "youtube", title: "YouTube", icon: Video, query: "Cole um link de vídeo na conversa", url: "https://www.youtube.com/" },
  { id: "install", title: "Android, APK e PC", icon: Smartphone, query: "Um workspace em todas as telas" },
]

export function JaxSidebar({ open, onClose, windows, onRestore, onOpen }: { open: boolean; onClose: () => void; windows: JaxWindowState[]; onRestore: (id: string) => void; onOpen: (resource: JaxResource) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current?.close()
  }, [open])
  function choose(resource: JaxResource) { onOpen(resource); onClose() }
  return <dialog ref={dialog} className="jax-sidebar-dialog" aria-labelledby="jax-sidebar-title" onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="jax-minimal-sidebar">
      <div className="jax-sidebar-heading"><strong id="jax-sidebar-title">Seu espaço</strong><button autoFocus aria-label="Recolher barra lateral" onClick={onClose}><X size={20} /></button></div>
      <p>Janelas</p>{windows.length === 0 && <small>Nenhuma janela aberta.</small>}
      {windows.map((item) => <button className="jax-saved-window" key={item.id} onClick={() => { onRestore(item.id); onClose() }}>{item.title}<span>{item.minimized ? "Restaurar" : "Aberta"}</span></button>)}
      <p>Atalhos</p><nav className="jax-capability-nav" aria-label="Atalhos do JAX">{shortcuts.map(({ icon: Icon, ...resource }) => <button key={resource.id} onClick={() => choose(resource)}><Icon size={18} /><span>{resource.title}</span></button>)}</nav>
      <p>Ferramentas</p><nav className="jax-capability-nav" aria-label="Capacidades do JAX">{capabilities.map(({ id, title, icon: Icon, description }) => <button key={id} title={description} onClick={() => choose({ id, title, query: description })}><Icon size={18} /><span>{title}</span></button>)}</nav>
      <div className="jax-sidebar-bottom"><strong>Você no controle</strong><small>O layout funciona no celular e no PC. Integrações e companion ainda precisam de conexão e autorização.</small></div>
    </aside>
  </dialog>
}
