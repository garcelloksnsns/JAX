"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type VoiceMode = "off" | "single" | "continuous"
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; abort(): void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

export function useJaxVoice(onCommand: (text: string) => void, onError: (message: string) => void) {
  const [mode, setMode] = useState<VoiceMode>("off")
  const [partial, setPartial] = useState("")
  const recognition = useRef<Recognition | null>(null)
  const desiredMode = useRef<VoiceMode>("off")
  const restart = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbacks = useRef({ onCommand, onError })
  useEffect(() => { callbacks.current = { onCommand, onError } }, [onCommand, onError])

  const stop = useCallback(() => {
    desiredMode.current = "off"
    if (restart.current) clearTimeout(restart.current)
    recognition.current?.abort()
    recognition.current = null
    setMode("off")
    setPartial("")
  }, [])

  function toggle(next: Exclude<VoiceMode, "off">) {
    if (desiredMode.current === next) { stop(); return }
    stop()
    const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
    if (!Constructor) {
      callbacks.current.onError("Este navegador não oferece reconhecimento de voz. Use o teclado ou abra no Chrome/Edge. A API de voz do backend poderá substituir esta captura.")
      return
    }
    const engine = new Constructor()
    recognition.current = engine
    desiredMode.current = next
    engine.lang = "pt-BR"
    engine.continuous = next === "continuous"
    engine.interimResults = true
    engine.onresult = (event) => {
      let interim = ""
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]
        if (result.isFinal && desiredMode.current !== "off") {
          const text = result[0].transcript.trim()
          if (text) callbacks.current.onCommand(text)
          if (next === "single") stop()
        } else interim += result[0].transcript
      }
      setPartial(interim)
    }
    engine.onerror = ({ error }) => {
      if (error === "aborted" || error === "no-speech") return
      stop()
      callbacks.current.onError(error === "not-allowed" || error === "service-not-allowed"
        ? "O microfone não foi autorizado. Permita o acesso nas configurações do navegador; dentro do preview pode ser necessário abrir o app em outra aba."
        : `A captura de voz foi interrompida (${error}). Você pode continuar pelo teclado.`)
    }
    engine.onend = () => {
      if (desiredMode.current === "continuous" && recognition.current === engine) {
        restart.current = setTimeout(() => {
          if (desiredMode.current !== "continuous") return
          try { engine.start() } catch { stop(); callbacks.current.onError("Não foi possível retomar a escuta. Ative o microfone novamente.") }
        }, 300)
      } else if (recognition.current === engine) stop()
    }
    try { engine.start(); setMode(next) } catch { stop(); callbacks.current.onError("Não foi possível iniciar o microfone neste navegador.") }
  }

  useEffect(() => () => {
    desiredMode.current = "off"
    if (restart.current) clearTimeout(restart.current)
    recognition.current?.abort()
  }, [])

  return { mode, partial, toggle, stop }
}
