"use client";

import type { CSSProperties } from "react";

const ONDA_CYAN = "#00D2FF";
const ONDA_VIOLETA = "#7000FF";
const ONDA_ROSA = "#FF007A";

/** Marco tipo smartphone con "rostro" fragmentado estilizado (formas abstractas: ojos, boca, óvalo). */
function PhoneFrame({
  top,
  left,
  width,
  height,
  rotation,
  delay,
  gradient,
}: {
  top: string;
  left: string;
  width: number;
  height: number;
  rotation: number;
  delay: number;
  gradient: string;
}) {
  const frameStyle: CSSProperties = {
    position: "absolute",
    top,
    left,
    width,
    height,
    transform: `rotate(${rotation}deg)`,
    // --r usado en @keyframes float
    ["--r" as string]: `${rotation}deg`,
    borderRadius: width * 0.12,
    background: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)`,
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: `float 8s ease-in-out ${delay}s infinite`,
    overflow: "hidden",
  };

  return (
    <div style={frameStyle} aria-hidden>
      {/* Fragmentos de rostro estilizado: óvalo + dos círculos (ojos) + arco (boca) */}
      <svg
        width="70%"
        height="70%"
        viewBox="0 0 100 120"
        fill="none"
        style={{ opacity: 0.5 }}
      >
        <defs>
          <linearGradient id={`face-${gradient}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ONDA_CYAN} stopOpacity={0.6} />
            <stop offset="50%" stopColor={ONDA_VIOLETA} stopOpacity={0.5} />
            <stop offset="100%" stopColor={ONDA_ROSA} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        {/* Óvalo cara */}
        <ellipse cx="50" cy="58" rx="32" ry="38" fill={`url(#face-${gradient})`} opacity={0.9} />
        {/* Ojos fragmentados (formas geométricas) */}
        <circle cx="38" cy="50" r="6" fill="rgba(255,255,255,0.7)" />
        <circle cx="62" cy="50" r="6" fill="rgba(255,255,255,0.7)" />
        {/* Boca suave */}
        <path
          d="M 35 72 Q 50 82 65 72"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** Variante con rostro más fragmentado (trozos tipo máscara). */
function PhoneFrameFragment({
  top,
  left,
  width,
  height,
  rotation,
  delay,
  id,
}: {
  top: string;
  left: string;
  width: number;
  height: number;
  rotation: number;
  delay: number;
  id: string;
}) {
  const frameStyle: CSSProperties = {
    position: "absolute",
    top,
    left,
    width,
    height,
    transform: `rotate(${rotation}deg)`,
    borderRadius: width * 0.14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ["--r" as string]: `${rotation}deg`,
    animation: `float 10s ease-in-out ${delay}s infinite`,
    overflow: "hidden",
  };

  return (
    <div style={frameStyle} aria-hidden>
      <svg width="80%" height="80%" viewBox="0 0 80 100" fill="none" style={{ opacity: 0.45 }}>
        {/* Fragmentos: media cara + ojo */}
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ONDA_CYAN} stopOpacity={0.5} />
            <stop offset="100%" stopColor={ONDA_ROSA} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <path
          d="M 10 50 Q 10 20 40 15 Q 70 20 70 50 Q 70 85 40 95 Q 10 85 10 50"
          fill={`url(#${id})`}
          opacity={0.8}
        />
        <circle cx="55" cy="38" r="10" fill={ONDA_VIOLETA} opacity={0.5} />
      </svg>
    </div>
  );
}

/** Fondo con ilustración estilizada: rostros diversos fragmentados en marcos smartphone flotando. */
export function FacesHero() {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50% { transform: translateY(-12px) rotate(var(--r, 0deg)); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      >
        <PhoneFrame
          top="8%"
          left="5%"
          width={100}
          height={160}
          rotation={-6}
          delay={0}
          gradient="a"
        />
        <PhoneFrame
          top="60%"
          left="3%"
          width={88}
          height={140}
          rotation={4}
          delay={1.5}
          gradient="b"
        />
        <PhoneFrameFragment
          top="25%"
          left="78%"
          width={90}
          height={130}
          rotation={8}
          delay={0.8}
          id="frag-1"
        />
        <PhoneFrame
          top="70%"
          left="72%"
          width={95}
          height={152}
          rotation={-5}
          delay={2}
          gradient="c"
        />
        <PhoneFrameFragment
          top="12%"
          left="55%"
          width={72}
          height={110}
          rotation={3}
          delay={2.5}
          id="frag-2"
        />
        <PhoneFrame
          top="38%"
          left="82%"
          width={82}
          height={128}
          rotation={-4}
          delay={1}
          gradient="d"
        />
        {/* Luz difusa suave */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "30%",
            width: "50%",
            height: "50%",
            background: `radial-gradient(ellipse, ${ONDA_CYAN}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "10%",
            width: "45%",
            height: "45%",
            background: `radial-gradient(ellipse, ${ONDA_VIOLETA}15 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
