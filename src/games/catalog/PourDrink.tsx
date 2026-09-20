import { useRef, useState } from 'react';
import { useFrameLoop, useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 채워! — 컵에 주스가 차오른다. 점선 타겟(70~90%) 안에서 멈추면 성공.
 * 타겟보다 낮으면 부족(실패), 100% 를 넘치면 그 즉시 실패. 시간 초과도 실패(부모).
 * 차오르는 속도는 템포 배율을 따른다 — 제한 시간(3.2s ÷ 배율) 안에 반드시 넘친다.
 */

const TARGET_MIN = 70;
const TARGET_MAX = 90;
/** 0 → 100% 까지 차는 시간(초). 배율로 나눈다 */
const FILL_SECONDS = 2.3;

export function PourDrink({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [level, setLevel] = useState(0);
  const levelRef = useRef(0);
  const [stopped, setStopped] = useState(false);

  useFrameLoop((dt) => {
    if (isDone()) return;
    const next = levelRef.current + (dt / (FILL_SECONDS / speedMultiplier)) * 100;
    levelRef.current = next;
    setLevel(Math.min(100, next));
    if (next >= 100) {
      setStopped(true);
      finish(false); // 넘쳤다
    }
  }, !done);

  const stop = () => {
    if (isDone()) return;
    setStopped(true);
    const l = levelRef.current;
    finish(l >= TARGET_MIN && l <= TARGET_MAX);
  };
  usePressKey(stop);

  const overflow = done === 'fail' && level >= 100;
  const short = done === 'fail' && level < TARGET_MIN;

  // 유리잔 안쪽: SVG y 70(테두리) → 330(바닥), 260 높이. level% → 주스 윗면 y
  const topY = 330 - 2.6 * Math.min(100, level);
  const lineY = (pct: number) => 330 - 2.6 * pct;
  const BUBBLES = [72, 88, 104, 120, 132];

  return (
    <div
      data-testid="game-pour-drink"
      data-level={level.toFixed(1)}
      data-target-min={TARGET_MIN}
      data-target-max={TARGET_MAX}
      data-done={done ?? ''}
      onPointerDown={stop}
      className="kitchen relative flex h-full w-full cursor-pointer flex-col items-center justify-end overflow-hidden"
    >
      <Instruction>MAX 와 MIN 사이에서 멈춰!</Instruction>
      {/* 조리대 */}
      <div aria-hidden className="counter-top absolute inset-x-0 bottom-0 h-[14%]" />

      <svg viewBox="0 0 200 360" className="relative mb-[6%] h-[80%] max-h-[560px] overflow-visible drop-shadow-[0_18px_22px_rgba(0,0,0,0.3)]" aria-hidden>
        <defs>
          <linearGradient id="pd-chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3f4f6" /><stop offset="0.5" stopColor="#9ca3af" /><stop offset="1" stopColor="#4b5563" /></linearGradient>
          <linearGradient id="pd-juice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb547" /><stop offset="1" stopColor="#f97316" /></linearGradient>
          <linearGradient id="pd-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(255,255,255,0.55)" /><stop offset="0.25" stopColor="rgba(255,255,255,0.05)" /><stop offset="0.8" stopColor="rgba(255,255,255,0.05)" /><stop offset="1" stopColor="rgba(255,255,255,0.45)" /></linearGradient>
          <clipPath id="pd-inner"><path d="M46 70 L154 70 L146 322 Q100 338 54 322 Z" /></clipPath>
        </defs>

        {/* 디스펜서 꼭지 */}
        <rect x="60" y="0" width="80" height="18" rx="6" fill="url(#pd-chrome)" />
        <rect x="90" y="16" width="20" height="26" rx="4" fill="url(#pd-chrome)" stroke="#374151" strokeWidth="1" />
        <rect x="84" y="40" width="32" height="8" rx="3" fill="#374151" />

        {/* 주스 줄기 (멈추면 사라진다) */}
        {!stopped && (
          <g>
            <rect x="93" y="48" width="14" height={Math.max(0, topY - 48)} rx="7" fill="url(#pd-juice)" opacity="0.95" />
            <ellipse cx="100" cy={topY} rx="22" ry="5" fill="#ffd29a" opacity="0.8" />
          </g>
        )}

        {/* 유리잔 뒤판 (투명 유리) */}
        <path d="M46 70 L154 70 L146 322 Q100 338 54 322 Z" fill="rgba(255,255,255,0.18)" />
        {/* 주스 */}
        <g clipPath="url(#pd-inner)">
          <rect x="40" y={topY} width="120" height={360 - topY} fill="url(#pd-juice)" className={done === 'success' ? 'drop-shadow-[0_0_16px_rgba(251,146,60,0.9)]' : ''} />
          <ellipse cx="100" cy={topY} rx="58" ry="6" fill="#ffd29a" className={stopped ? '' : 'animate-[fx-wave_0.5s_ease-in-out_infinite_alternate]'} />
          {!stopped && BUBBLES.map((x, i) => <circle key={x} cx={x} cy="320" r={2 + (i % 3)} fill="rgba(255,255,255,0.7)" className="pd-bubble" style={{ animationDelay: `${i * 0.3}s` }} />)}
        </g>
        {/* 목표선 — 유리에 새긴 눈금 */}
        {[TARGET_MIN, TARGET_MAX].map((pct, i) => (
          <g key={pct}>
            <line x1="52" y1={lineY(pct)} x2="150" y2={lineY(pct)} stroke={done === 'fail' ? '#ff4d67' : '#ffd60a'} strokeWidth="3" strokeDasharray="8 5" />
            <text x="158" y={lineY(pct) + 4} fontSize="11" fontWeight="800" fill="#374151">{i ? 'MAX' : 'MIN'}</text>
          </g>
        ))}
        <rect x="52" y={lineY(TARGET_MAX)} width="98" height={lineY(TARGET_MIN) - lineY(TARGET_MAX)} fill="rgba(255,214,10,0.12)" />
        {/* 유리 앞판 · 테두리 · 하이라이트 · 두꺼운 바닥 */}
        <path d="M46 70 L154 70 L146 322 Q100 338 54 322 Z" fill="url(#pd-glass)" stroke="rgba(255,255,255,0.85)" strokeWidth="3" />
        <path d="M54 322 Q100 338 146 322 L148 334 Q100 352 52 334 Z" fill="rgba(255,255,255,0.6)" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
        <ellipse cx="100" cy="70" rx="54" ry="6" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="3" />
        <path d="M60 90 L57 300" stroke="rgba(255,255,255,0.7)" strokeWidth="5" strokeLinecap="round" />

        {/* 넘침 — 테두리 밖으로 흘러 조리대에 고인다 */}
        {overflow && (
          <g className="animate-pop">
            <path d="M46 70 Q30 80 34 120 Q38 160 30 200 L44 200 L46 70 Z" fill="url(#pd-juice)" opacity="0.9" />
            <path d="M154 70 Q170 80 166 130 Q162 170 172 200 L156 200 Z" fill="url(#pd-juice)" opacity="0.9" />
            <ellipse cx="100" cy="350" rx="90" ry="9" fill="#f97316" opacity="0.8" />
          </g>
        )}
      </svg>

      <Hint>{done === 'success' ? '완벽한 한 잔!' : overflow ? '넘쳤어!' : short ? '너무 적어…' : 'Space · 클릭 · 탭'}</Hint>
    </div>
  );
}
