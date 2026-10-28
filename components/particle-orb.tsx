"use client"

import { useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import type * as THREE from "three"

export type OrbState = "idle" | "listening" | "thinking" | "speaking"

const stateColors = { idle: "#69d6d0", listening: "#f5c36f", thinking: "#9b8af4", speaking: "#78c8ff" }

function DottedSphere({ state, engaged }: { state: OrbState; engaged: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const color = stateColors[state]
  const dots = useMemo(() => {
    const positions: [number, number, number][] = []
    const phi = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 1150; i++) {
      const y = 1 - (i / 1149) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = phi * i
      positions.push([Math.cos(theta) * radiusAtY * 1.22, y * 1.22, Math.sin(theta) * radiusAtY * 1.22])
    }
    return positions
  }, [])

  useFrame((frame) => {
    if (!groupRef.current) return
    const speeds = { idle: 0.08, listening: 0.15, thinking: 0.38, speaking: 0.2 }
    groupRef.current.rotation.y = frame.clock.elapsedTime * (engaged ? 0.32 : speeds[state])
    groupRef.current.rotation.x = Math.sin(frame.clock.elapsedTime * 0.45) * (state === "thinking" ? 0.16 : 0.08)
    const pulse = 1 + Math.sin(frame.clock.elapsedTime * (state === "speaking" ? 6 : state === "listening" ? 3 : 1.5)) * (engaged ? 0.1 : state === "idle" ? 0.02 : 0.06)
    groupRef.current.scale.setScalar(pulse)
  })

  return <group ref={groupRef}>{dots.map((position, index) => <mesh key={index} position={position}><sphereGeometry args={[state === "thinking" ? 0.025 : engaged ? 0.03 : 0.021, 6, 6]} /><meshBasicMaterial color={color} transparent opacity={0.62 + (index % 6) * 0.055} /></mesh>)}</group>
}

function Core({ state, engaged }: { state: OrbState; engaged: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((frame) => { if (ref.current) ref.current.scale.setScalar(1 + Math.sin(frame.clock.elapsedTime * (engaged ? 5 : 2.5)) * (engaged ? 0.14 : 0.08)) })
  return <mesh ref={ref}><sphereGeometry args={[engaged ? 0.18 : 0.15, 32, 32]} /><meshBasicMaterial color={stateColors[state]} /></mesh>
}

export function ParticleOrb({ state = "idle" }: { state?: OrbState }) {
  const [engaged, setEngaged] = useState(false)
  const color = stateColors[state]
  return <div className={`jax-orb orb-${state} ${engaged ? "is-engaged" : ""}`} style={{ "--orb-color": color } as React.CSSProperties} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onPointerDown={() => setEngaged(true)} onPointerUp={() => setEngaged(false)} role="img" aria-label={`Esfera JAX: ${state}`}>
    <div className="jax-orb-halo" /><div className="jax-orb-ring ring-one" /><div className="jax-orb-ring ring-two" /><div className="jax-orb-scan" />
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} style={{ background: "transparent" }} gl={{ alpha: true, antialias: true }}><ambientLight intensity={0.8} /><pointLight position={[3, 3, 4]} intensity={2} color={color} /><Core state={state} engaged={engaged} /><DottedSphere state={state} engaged={engaged} /></Canvas>
  </div>
}
