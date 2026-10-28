"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import type * as THREE from "three"

export type OrbState = "idle" | "listening" | "thinking" | "speaking"

const stateColors = {
  idle: "#63e6ff",
  listening: "#a7f3d0",
  thinking: "#c4b5fd",
  speaking: "#67e8f9",
}

function DottedSphere({ state }: { state: OrbState }) {
  const groupRef = useRef<THREE.Group>(null)
  const color = stateColors[state]
  const dots = useMemo(() => {
    const positions: [number, number, number][] = []
    const phi = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 900; i++) {
      const y = 1 - (i / 899) * 2
      const radiusAtY = Math.sqrt(1 - y * y)
      const theta = phi * i
      positions.push([Math.cos(theta) * radiusAtY * 1.22, y * 1.22, Math.sin(theta) * radiusAtY * 1.22])
    }
    return positions
  }, [])

  useFrame((frame) => {
    if (!groupRef.current) return
    const speed = state === "thinking" ? 0.28 : state === "listening" ? 0.16 : 0.09
    groupRef.current.rotation.y = frame.clock.elapsedTime * speed
    groupRef.current.rotation.x = Math.sin(frame.clock.elapsedTime * 0.45) * 0.08
    const pulse = 1 + Math.sin(frame.clock.elapsedTime * (state === "speaking" ? 3.8 : 1.5)) * (state === "idle" ? 0.02 : 0.06)
    groupRef.current.scale.setScalar(pulse)
  })

  return <group ref={groupRef}>{dots.map((position, index) => <mesh key={index} position={position}><sphereGeometry args={[state === "thinking" ? 0.028 : 0.022, 6, 6]} /><meshBasicMaterial color={color} transparent opacity={0.72 + (index % 5) * 0.05} /></mesh>)}</group>
}

function Core({ state }: { state: OrbState }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((frame) => { if (ref.current) ref.current.scale.setScalar(1 + Math.sin(frame.clock.elapsedTime * 2.5) * 0.08) })
  return <mesh ref={ref}><sphereGeometry args={[0.15, 32, 32]} /><meshBasicMaterial color={stateColors[state]} /></mesh>
}

export function ParticleOrb({ state = "idle" }: { state?: OrbState }) {
  const color = stateColors[state]
  return <div className={`jax-orb orb-${state}`} style={{ "--orb-color": color } as React.CSSProperties}>
    <div className="jax-orb-halo" /><div className="jax-orb-ring ring-one" /><div className="jax-orb-ring ring-two" />
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} style={{ background: "transparent" }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.8} /><pointLight position={[3, 3, 4]} intensity={2} color={color} /><Core state={state} /><DottedSphere state={state} />
    </Canvas>
  </div>
}
