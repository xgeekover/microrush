import { useRef, useState } from 'react';
import { useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';
import { Stars } from '../scenery';
import { Hint, Instruction } from '../ui';

/*
 * 연타해! — Space 나 화면을 N 번 연타해 파워 게이지를 100% 채우면 로켓이 발사된다.
 * N 은 기본 8회, 템포가 오르면 늘어난다(6 + 2×배율 → ×1.0 에서 8, ×2.2 에서 10).
 * 제한 시간(3.5s ÷ 배율) 안에 못 채우면 실패(부모).
 */

export function RocketMash({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const needed = Math.round(6 + 2 * speedMultiplier);
  const [presses, setPresses] = useState(0);
  const pressesRef = useRef(0);
  const [bump, setBump] = useState(0);

  const mash = () => {
    if (isDone()) return;
    pressesRef.current += 1;
    setPresses(pressesRef.current);
    setBump((b) => b + 1);
    if (pressesRef.current >= needed) finish(true);
  };
  usePressKey(mash);

  const power = Math.min(100, (presses / needed) * 100);
  const launched = done === 'success';

  const flame = 0.35 + (power / 100) * 1.1; // 화염 크기 배율
  const SEGMENTS = 10;

  return (
    <div
      data-testid="game-rocket-mash"
      data-presses={presses}
      data-needed={needed}
      data-power={power.toFixed(0)}
      data-done={done ?? ''}
      onPointerDown={mash}
      className="rocket-sky relative h-full w-full cursor-pointer select-none overflow-hidden"
    >
      <Instruction>연타! 연타!</Instruction>
      <Stars className="h-[60%]" />

      {/* 발사장: 콘크리트 패드 · 갠트리 타워 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect x="0" y="352" width="800" height="48" fill="#2b2734" />
        <rect x="250" y="340" width="300" height="16" rx="3" fill="#6b6478" />
        <rect x="270" y="336" width="260" height="6" fill="#9a93a8" />
        <g stroke="#c0392b" strokeWidth="6" fill="none">
          <path d="M270 340 V60 M330 340 V60 M270 60 H330" />
          {[80, 130, 180, 230, 280].map((y) => <path key={y} d={`M270 ${y} L330 ${y + 50} M330 ${y} L270 ${y + 50}`} strokeWidth="3" />)}
          <path d="M330 120 H392" />
        </g>
        {[100, 200, 300].map((y) => <circle key={y} cx="300" cy={y} r="4" fill="#ff4d67" className="animate-blink" />)}
      </svg>

      {/* 로켓 + 화염 + 연기 */}
      <div className="absolute inset-x-0 bottom-[14%] flex justify-center">
        <div key={bump} className={`relative w-[min(30vw,150px)] ${launched ? 'animate-[fx-launch_0.9s_ease-in_forwards]' : 'animate-[fx-bump_0.12s_ease-out]'}`}>
          <svg viewBox="0 0 100 260" className="w-full overflow-visible drop-shadow-[0_16px_20px_rgba(0,0,0,0.6)]" aria-hidden>
            <defs>
              <linearGradient id="rm-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9ca3af" /><stop offset="0.3" stopColor="#ffffff" /><stop offset="0.7" stopColor="#e5e7eb" /><stop offset="1" stopColor="#6b7280" /></linearGradient>
              <linearGradient id="rm-nose" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#991b1b" /><stop offset="0.4" stopColor="#ef4444" /><stop offset="1" stopColor="#7f1d1d" /></linearGradient>
              <radialGradient id="rm-flame" cx="0.5" cy="0.1" r="0.9"><stop offset="0" stopColor="#fff7c2" /><stop offset="0.4" stopColor="#fbbf24" /><stop offset="1" stopColor="rgba(249,115,22,0)" /></radialGradient>
            </defs>
            {/* 화염 — 파워에 비례해 커진다 (아래로 늘어남) */}
            <g transform={`translate(50 200) scale(${flame})`} className="rm-flame">
              <path d="M-22 0 Q0 90 22 0 Z" fill="url(#rm-flame)" />
              <path d="M-11 0 Q0 52 11 0 Z" fill="#fff1a8" opacity="0.9" />
            </g>
            <path d="M22 60 L22 190 L78 190 L78 60 Q50 -10 22 60 Z" fill="url(#rm-body)" stroke="#374151" strokeWidth="1.5" />
            <path d="M22 60 Q50 -10 78 60 Z" fill="url(#rm-nose)" />
            <rect x="22" y="120" width="56" height="16" fill="#ef4444" opacity="0.9" />
            <circle cx="50" cy="90" r="12" fill="#0ea5e9" stroke="#374151" strokeWidth="3" />
            <circle cx="46" cy="86" r="4" fill="rgba(255,255,255,0.7)" />
            <path d="M22 150 L2 200 L22 190 Z M78 150 L98 200 L78 190 Z" fill="url(#rm-nose)" stroke="#7f1d1d" strokeWidth="1" />
            <path d="M34 190 L30 208 L70 208 L66 190 Z" fill="#374151" />
          </svg>
          {power > 35 && !launched && (
            <div aria-hidden className="absolute inset-x-0 -bottom-4 flex justify-center">
              {[-60, -25, 15, 50].map((dx, i) => (
                <span key={dx} className="absolute bottom-0 left-1/2 size-10 rounded-full bg-white/70 blur-[2px]" style={{ '--fx-dx': `${dx}px`, animation: `fx-smoke ${0.9 + (i % 2) * 0.3}s ease-out ${i * 0.15}s infinite` } as React.CSSProperties} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 연료 게이지 패널 */}
      <div className="absolute bottom-[4%] left-1/2 w-72 -translate-x-1/2 rounded-2xl border border-white/15 bg-black/45 px-4 py-2.5 backdrop-blur-sm">
        <div className="mb-1.5 flex justify-between text-[10px] font-black tracking-widest text-white/60">
          <span>FUEL</span>
          <span className="tabular-nums">{presses}/{needed}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={`h-3 flex-1 rounded-sm transition-colors duration-75 ${i < Math.round((power / 100) * SEGMENTS) ? (power >= 100 ? 'bg-rush-green shadow-[0_0_8px_rgba(52,226,154,0.8)]' : i >= 7 ? 'bg-rush-red' : i >= 4 ? 'bg-rush-yellow' : 'bg-rush-cyan') : 'bg-white/10'}`} />
          ))}
        </div>
      </div>
      <Hint>Space · 클릭 · 탭을 연타</Hint>

      {launched && (
        <p className="animate-pop absolute inset-x-0 top-[28%] text-center font-display text-7xl text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.3)]">
          발사!
        </p>
      )}
    </div>
  );
}
