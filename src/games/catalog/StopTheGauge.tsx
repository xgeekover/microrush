import { useEffect, useRef, useState } from 'react';
import type { MicrogameProps, Outcome } from '../types';
import { Hint, Instruction } from '../ui';

/**
 * 멈춰! — 다이얼 위를 오가는 바늘이 초록 영역 안에 있을 때 누른다.
 * 그림: 계기판(브러시드 메탈) 위의 반원 다이얼. 바늘 위치 pos(0~1) 를 -90°~+90° 로 옮겨 그린다.
 * 바늘 속도와 영역 폭이 speedMultiplier 를 따른다. 시간 초과는 실패(부모가 판정).
 */
export function StopTheGauge({ onSuccess, onFail, timeRemainingRatio, speedMultiplier }: MicrogameProps) {
  // 초록 영역: 폭은 템포가 오를수록 좁아지고, 위치는 매번 무작위
  const [zone] = useState(() => {
    const width = Math.max(0.1, 0.2 - (speedMultiplier - 1) * 0.06);
    const start = 0.12 + Math.random() * (0.88 - width - 0.12);
    return { start, end: start + width };
  });
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState<Outcome | null>(null);
  const doneRef = useRef(false);
  const posRef = useRef(0);

  // 바늘: 삼각파로 왕복. 한 번 건너가는 데 1 / (0.9 × 배율) 초.
  useEffect(() => {
    if (done) return;
    const sweepsPerSec = 0.9 * speedMultiplier;
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const p = (((now - t0) / 1000) * sweepsPerSec) % 2;
      const x = p < 1 ? p : 2 - p;
      posRef.current = x;
      setPos(x);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done, speedMultiplier]);

  const press = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const x = posRef.current;
    const hit = x >= zone.start && x <= zone.end;
    setDone(hit ? 'success' : 'fail');
    if (hit) onSuccess();
    else onFail();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // press 는 ref 만 읽으므로 매 렌더 새로 등록할 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inZone = pos >= zone.start && pos <= zone.end;
  const deg = (v: number) => -90 + v * 180;
  const needleDeg = deg(pos);
  const zonePath = arc(160, 150, 112, deg(zone.start), deg(zone.end));

  return (
    <div
      data-testid="game-stop-the-gauge"
      data-needle={pos.toFixed(3)}
      data-zone-start={zone.start.toFixed(3)}
      data-zone-end={zone.end.toFixed(3)}
      data-done={done ?? ''}
      onPointerDown={press}
      className="dial-panel relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
    >
      <Instruction>초록에서 멈춰!</Instruction>

      <div className="relative w-[min(88vw,520px)]">
        <svg viewBox="0 0 320 190" className="block w-full overflow-visible drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)]">
          <defs>
            <linearGradient id="sg-bezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d1dc" />
              <stop offset="0.5" stopColor="#6b7684" />
              <stop offset="1" stopColor="#2b323d" />
            </linearGradient>
            <radialGradient id="sg-face" cx="0.5" cy="0.9" r="0.9">
              <stop offset="0" stopColor="#f7f8fa" />
              <stop offset="1" stopColor="#c9d0da" />
            </radialGradient>
            <linearGradient id="sg-needle" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ff8a8a" />
              <stop offset="1" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          {/* 베젤 · 다이얼 판 */}
          <path d="M20 150 A140 140 0 0 1 300 150 L300 172 a8 8 0 0 1 -8 8 H28 a8 8 0 0 1 -8 -8 Z" fill="url(#sg-bezel)" />
          <path d="M34 150 A126 126 0 0 1 286 150 Z" fill="url(#sg-face)" />
          {/* 트랙 · 초록 영역 */}
          <path d={arc(160, 150, 112, -90, 90)} fill="none" stroke="#353c48" strokeWidth="14" strokeLinecap="butt" />
          <path d={zonePath} fill="none" stroke={done === 'fail' ? '#ff4d67' : '#34e29a'} strokeWidth="14" className={inZone && !done ? 'drop-shadow-[0_0_10px_rgba(52,226,154,0.9)]' : ''} />
          {/* 눈금 */}
          {Array.from({ length: 21 }, (_, i) => i * 9 - 90).map((a) => (
            <line key={a} x1="160" y1="42" x2="160" y2={a % 45 === 0 ? 56 : 50} stroke="#2b323d" strokeWidth={a % 45 === 0 ? 3 : 1.5} transform={`rotate(${a} 160 150)`} />
          ))}
          <text x="160" y="118" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4b5563" letterSpacing="3">STOP</text>
          {/* 바늘 — 회전만 프레임마다 바뀐다 */}
          <g transform={`rotate(${needleDeg} 160 150)`}>
            <path d="M156 150 L160 34 L164 150 Z" fill="url(#sg-needle)" />
            <path d="M160 150 L160 34" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
          </g>
          <circle cx="160" cy="150" r="13" fill="#1f2937" stroke="#6b7684" strokeWidth="3" />
          <circle cx="160" cy="150" r="4" fill="#9ca3af" />
          {/* 판정 램프 */}
          <circle cx="60" cy="166" r="6" fill={done === 'fail' ? '#ff4d67' : '#3b1d24'} stroke="#111" strokeWidth="1.5" className={done === 'fail' ? 'drop-shadow-[0_0_8px_rgba(255,77,103,0.9)]' : ''} />
          <circle cx="260" cy="166" r="6" fill={done === 'success' || (inZone && !done) ? '#34e29a' : '#163a2c'} stroke="#111" strokeWidth="1.5" className={done === 'success' ? 'drop-shadow-[0_0_8px_rgba(52,226,154,0.9)]' : ''} />
        </svg>
        {done && (
          <div className={`animate-pop absolute inset-x-0 -top-6 text-center font-display text-4xl ${done === 'success' ? 'text-rush-green' : 'text-rush-red'}`}>
            {done === 'success' ? 'OK!' : 'MISS'}
          </div>
        )}
      </div>

      <Hint>Space · 클릭 · 탭</Hint>
      {/* 시간이 촉박하면 계기판이 붉어진다 */}
      <div
        className="pointer-events-none absolute inset-0 bg-rush-red transition-opacity"
        style={{ opacity: timeRemainingRatio < 0.3 && !done ? (0.3 - timeRemainingRatio) * 0.8 : 0 }}
      />
    </div>
  );
}

/** 중심 (cx, cy) · 반지름 r 의 원에서 각도 a0 → a1 (도, 0 = 위, 시계 방향) 호 */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const pt = (a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
