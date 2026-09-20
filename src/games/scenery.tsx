/**
 * 여러 장면이 같이 쓰는 배경 조각. 전부 CSS · SVG 이고 위치는 호출자가 className 으로 준다.
 */

/** 해 — 부드러운 후광이 있는 원 */
export function Sun({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full bg-[radial-gradient(circle,#fffbe0_0%,#ffe27a_45%,rgba(255,226,122,0)_72%)] ${className}`}
    />
  );
}

/** 뭉게구름 — 둥근 덩어리 셋 */
export function Cloud({ className }: { className: string }) {
  return (
    <div aria-hidden className={`absolute ${className}`}>
      <div className="relative h-10">
        <span className="absolute bottom-0 left-0 h-7 w-[45%] rounded-full bg-white/95" />
        <span className="absolute bottom-0 left-[22%] h-10 w-[46%] rounded-full bg-white" />
        <span className="absolute bottom-0 right-0 h-6 w-[40%] rounded-full bg-white/95" />
        <span className="absolute inset-x-[6%] bottom-0 h-3 rounded-full bg-white" />
      </div>
    </div>
  );
}

/** 밤하늘 별 — 고정 배열이라 매 렌더 같은 자리 */
const STARS = [
  [6, 12, 2], [14, 30, 1.5], [22, 8, 2], [31, 22, 1.5], [40, 15, 1], [48, 34, 2], [57, 9, 1.5], [63, 26, 1],
  [71, 18, 2], [79, 6, 1.5], [86, 31, 1], [93, 14, 2], [97, 40, 1.5], [36, 44, 1], [66, 42, 1.5], [10, 46, 1],
] as const;
export function Stars({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {STARS.map(([x, y, s], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%`, width: s * 1.5, height: s * 1.5, opacity: 0.5 + (i % 3) * 0.2, animation: `fx-twinkle ${1.8 + (i % 4) * 0.5}s ease-in-out ${(i % 5) * 0.3}s infinite alternate` }}
        />
      ))}
    </div>
  );
}

/** 지평선을 따라 늘어선 풀잎 — bottom 은 호출자가 준다 */
export function Grass({ className, color = '#4e9d3c', count = 26 }: { className: string; color?: string; count?: number }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 flex justify-between px-1 ${className}`} style={{ color }}>
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 22" className="h-5 w-6" style={{ transform: `scaleX(${i % 2 ? -1 : 1}) translateY(${i % 3}px)` }}>
          <path d="M3 22 C5 15 5 9 3 2 C9 8 9 15 9 22 M10 22 C10 12 13 6 16 0 C15 8 14 15 13 22 M15 22 C16 16 19 12 23 9 C20 14 19 18 18 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}

/** 단순한 사람 — 머리 · 몸 · 팔 · 다리. pose 로 팔다리 모양을 바꾼다 (SVG 60×100) */
export function Person({
  className = '',
  pose = 'stand',
  shirt = '#3b82f6',
  skin = '#f5c9a6',
  hair = '#3a2a1a',
  hat,
}: {
  className?: string;
  pose?: 'stand' | 'jump' | 'fall' | 'cheer' | 'crouch' | 'throw';
  shirt?: string;
  skin?: string;
  hair?: string;
  /** 안전모 등 머리 위 색 */
  hat?: string;
}) {
  const legs =
    pose === 'jump' ? 'M22 66 L16 82 L24 84 M38 66 L44 82 L36 84' : pose === 'crouch' ? 'M22 66 L12 78 L20 92 M38 66 L48 78 L40 92' : 'M23 66 L20 96 M37 66 L40 96';
  const arms =
    pose === 'cheer' || pose === 'jump'
      ? 'M18 44 L6 22 M42 44 L54 22'
      : pose === 'throw'
        ? 'M18 44 L8 56 M42 44 L56 30'
        : pose === 'fall'
          ? 'M18 44 L4 40 M42 44 L56 40'
          : 'M18 44 L10 62 M42 44 L50 62';
  return (
    <svg viewBox="0 0 60 100" className={className} aria-hidden>
      <path d={arms} fill="none" stroke={skin} strokeWidth="7" strokeLinecap="round" />
      <path d={legs} fill="none" stroke="#1f2937" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="17" y="36" width="26" height="34" rx="8" fill={shirt} />
      <circle cx="30" cy="22" r="13" fill={skin} />
      <path d="M17 20 C18 8 42 8 43 20 C40 14 20 14 17 20 Z" fill={hair} />
      {hat && <path d="M14 20 C14 8 46 8 46 20 Z M12 20 h36 v4 h-36 z" fill={hat} />}
      <circle cx="25" cy="23" r="1.6" fill="#1f2937" />
      <circle cx="35" cy="23" r="1.6" fill="#1f2937" />
      <path d={pose === 'fall' ? 'M26 30 q4 -3 8 0' : 'M26 28 q4 4 8 0'} fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
