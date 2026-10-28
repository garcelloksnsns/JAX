"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, FolderOpen, Monitor, MousePointer2, Terminal, Trash2 } from "lucide-react"

export const capabilities = [
  { id: "screen", title: "Compartilhar tela", icon: Monitor, description: "Escolher uma tela, janela ou aba com permissão." },
  { id: "browser-control", title: "Controle do navegador", icon: MousePointer2, description: "Inspecionar abas, localizar elementos e clicar via companion." },
  { id: "terminal", title: "Terminal", icon: Terminal, description: "Preparar comandos e confirmar antes de executar." },
  { id: "files", title: "Arquivos e pastas", icon: FolderOpen, description: "Criar pastas, mover e ler arquivos com escopo autorizado." },
  { id: "documents", title: "Ler PDF e Word", icon: FileText, description: "Selecionar documentos para extração pelo backend." },
  { id: "delete", title: "Excluir documentos", icon: Trash2, description: "Revisar caminhos e confirmar envio à lixeira." },
] as const

export function JaxCapabilityContent({ id, onReply }: { id: string; onReply: (text: string) => void }) {
  if (id === "screen") return <ScreenCapture onReply={onReply} />
  if (id === "documents") return <DocumentPicker />
  return <LocalAction id={id} />
}

function ScreenCapture({ onReply }: { onReply: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState("")
  function stop() { stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; if (video.current) video.current.srcObject = null; setActive(false) }
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()) }, [])
  async function start() {
    if (!navigator.mediaDevices?.getDisplayMedia) { setError("Compartilhamento indisponível neste navegador ou contexto. Abra o app fora do preview e tente novamente."); return }
    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = captured
      captured.getVideoTracks()[0].addEventListener("ended", stop, { once: true })
      if (video.current) { video.current.srcObject = captured; await video.current.play() }
      setActive(true)
      setError("")
      onReply("Compartilhamento iniciado com sua permissão. A imagem fica somente nesta prévia: análise por IA e cliques ainda não estão conectados.")
    } catch { setError("Compartilhamento cancelado, bloqueado ou indisponível. Nenhuma captura foi iniciada.") }
  }
  return <div className="jax-capability-content"><div className="jax-capability-status">{active ? "CAPTURA LOCAL ATIVA" : "REQUER SUA PERMISSÃO"}</div><p>Você escolhe o que compartilhar. Não capturo outras telas automaticamente, não envio imagens a um backend e não clico em elementos externos.</p><video ref={video} muted playsInline className={`jax-screen-preview ${active ? "is-active" : ""}`} aria-label="Prévia da tela compartilhada" /><button className="jax-resource-link" onClick={active ? stop : start}>{active ? "Parar compartilhamento" : "Escolher tela ou janela"}</button>{error && <p role="alert">{error}</p>}</div>
}

function DocumentPicker() {
  const [files, setFiles] = useState<File[]>([])
  return <div className="jax-capability-content"><div className="jax-capability-status">EXTRAÇÃO NÃO CONECTADA</div><p>Selecione PDF, Word ou texto. Os arquivos ficam apenas nesta sessão; nenhum upload ou leitura por IA acontece antes da conexão do backend.</p><label className="jax-file-picker">Selecionar documentos<input type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label><ul>{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={14} /><span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB</small></li>)}</ul>{files.length > 0 && <button className="jax-resource-link" onClick={() => setFiles([])}>Limpar seleção</button>}</div>
}

function LocalAction({ id }: { id: string }) {
  const [value, setValue] = useState("")
  const [destination, setDestination] = useState("")
  const [action, setAction] = useState("read")
  const [prepared, setPrepared] = useState(false)
  const destructive = id === "delete" || id === "terminal"
  const label = id === "terminal" ? "Comando solicitado" : id === "browser-control" ? "Página e ação desejada" : "Caminho do arquivo ou pasta"
  return <form className="jax-capability-content" onSubmit={(event) => { event.preventDefault(); setPrepared(true) }}><div className="jax-capability-status">COMPANION LOCAL DESCONECTADO</div><p>{id === "browser-control" ? "Abas fora do JAX só poderão ser inspecionadas e controladas por uma extensão ou serviço local autorizado. Este formulário não controla seu navegador." : "Prepare o pedido para o futuro serviço local. O navegador não pode executar shell nem alterar arquivos do seu computador por conta própria."}</p>{id === "files" && <label>Ação<select value={action} onChange={(event) => { setAction(event.target.value); setPrepared(false) }}><option value="read">Ler arquivo</option><option value="mkdir">Criar pasta</option><option value="move">Mover arquivo</option></select></label>}<label>{label}<textarea aria-label={label} value={value} rows={2} onChange={(event) => { setValue(event.target.value); setPrepared(false) }} placeholder={id === "terminal" ? "Descreva ou digite o comando…" : "Descreva o alvo…"} /></label>{id === "files" && action === "move" && <label>Destino<input value={destination} onChange={(event) => { setDestination(event.target.value); setPrepared(false) }} /></label>}<button type="submit" className="jax-resource-link" disabled={!value.trim() || (id === "files" && action === "move" && !destination.trim())}>Revisar solicitação</button>{prepared && <div className="jax-prepared-request" role="status"><strong>Solicitação preparada · não executada</strong><pre>{JSON.stringify({ capability: id, action: id === "files" ? action : id, input: value, ...(destination ? { destination } : {}), status: "unavailable", requiresApproval: destructive || action !== "read" }, null, 2)}</pre><small>{destructive ? "O backend deverá pedir confirmação explícita do comando ou dos arquivos antes de agir. Exclusão deve preferir a lixeira." : "O Codex conectará esta solicitação ao adaptador autorizado. Nenhuma alteração foi feita."}</small></div>}</form>
}
