import { useEffect, useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 잡아! — 3×3 칸을 옮겨 다니는 파리를 때린다. 파리가 있는 칸을 누르면 성공.
 * 빈 칸을 치면 파리가 놀라 바로 옆 칸으로 도망간다(마구 두드리기 방지). 시간 초과는 실패(부모).
 * 키보드는 숫자 키패드 배열(7 8 9 / 4 5 6 / 1 2 3).
 */

const HOP_MS = 550;
/** 키 → 칸 (0=왼쪽 위) */
const KEY_CELL: Record<string, number> = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };

function otherCell(current: number): number {
  let n = current;
  while (n === current) n = Math.floor(Math.random() * 9);
  return n;
}

export function SwatFly({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [cell, setCell] = useState(() => Math.floor(Math.random() * 9));
  const cellRef = useRef(cell);
  const [splat, setSplat] = useState<number | null>(null); // 빈 칸을 친 자리
  const hopTimer = useRef(0);

  const hop = () => {
    cellRef.current = otherCell(cellRef.current);
    setCell(cellRef.current);
  };

  // 일정 간격으로 옮겨 다닌다. 배율이 오르면 더 자주.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isDone()) hop();
    }, HOP_MS / speedMultiplier);
    hopTimer.current = id;
    return () => window.clearInterval(id);
  }, [speedMultiplier, isDone]);

  const swat = (i: number) => {
    if (isDone()) return;
    if (i === cellRef.current) {
      finish(true);
      return;
    }
    setSplat(i);
    hop(); // 놀라서 도망
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const i = KEY_CELL[e.key];
      if (i === undefined) return;
      e.preventDefault();
      swat(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="game-swat-fly"
      data-fly={cell}
      data-done={done ?? ''}
      className="picnic relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
    >
      <Instruction>파리를 잡아!</Instruction>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.25),rgba(0,0,0,0.25)_80%)]" />
      <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 9 }, (_, i) => {
          const here = i === cell;
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              data-fly={here}
              aria-label={here ? '파리' : '빈 칸'}
              onPointerDown={() => swat(i)}
              className={`relative flex size-20 items-center justify-center rounded-full shadow-[0_10px_18px_-8px_rgba(0,0,0,0.6),inset_0_-4px_8px_rgba(0,0,0,0.12)] transition sm:size-24 ${
                done === 'success' && here ? 'bg-[radial-gradient(circle,#bbf7d0,#86efac_70%)] ring-4 ring-rush-green' : 'bg-[radial-gradient(circle_at_40%_35%,#ffffff,#f1f5f9_60%,#cbd5e1_100%)] ring-2 ring-slate-300/70 active:scale-95'
              }`}
            >
              <span aria-hidden className="absolute inset-[14%] rounded-full border-2 border-slate-300/70" />
              {here && (done === 'success' ? <Splat /> : <Fly />)}
              {splat === i && !here && <Swatter />}
            </button>
          );
        })}
      </div>
      <Hint>칸 탭 · 클릭 · 숫자 1~9</Hint>
    </div>
  );
}

/** 파리 — 몸통 · 머리 · 날개(퍼덕임) · 다리. 칸 안에서 잘게 떨린다 */
function Fly() {
  return (
    <svg viewBox="0 0 60 50" className="relative size-12 animate-[fx-jitter_0.15s_linear_infinite] drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)] sm:size-14" aria-hidden>
      <g style={{ transformBox: 'fill-box', transformOrigin: '100% 100%', animation: 'fx-wing 0.06s linear infinite alternate' }}>
        <ellipse cx="18" cy="16" rx="16" ry="7" fill="rgba(200,220,255,0.7)" stroke="#94a3b8" strokeWidth="1" transform="rotate(-25 34 26)" />
      </g>
      <g style={{ transformBox: 'fill-box', transformOrigin: '0% 100%', animation: 'fx-wing 0.06s linear infinite alternate-reverse' }}>
        <ellipse cx="42" cy="16" rx="16" ry="7" fill="rgba(200,220,255,0.7)" stroke="#94a3b8" strokeWidth="1" transform="rotate(25 26 26)" />
      </g>
      <path d="M22 34 l-8 8 M38 34 l8 8 M26 38 l-4 10 M34 38 l4 10" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="30" cy="32" rx="12" ry="9" fill="#1f2937" />
      <circle cx="30" cy="20" r="7" fill="#111827" />
      <circle cx="26" cy="19" r="2.6" fill="#dc2626" /><circle cx="34" cy="19" r="2.6" fill="#dc2626" />
    </svg>
  );
}
function Swatter() {
  return (
    <svg viewBox="0 0 60 60" className="absolute size-14 animate-pop opacity-70" aria-hidden>
      <rect x="14" y="6" width="32" height="32" rx="6" fill="#f472b6" stroke="#be185d" strokeWidth="2" />
      <path d="M22 6 v32 M30 6 v32 M38 6 v32 M14 14 h32 M14 22 h32 M14 30 h32" stroke="#be185d" strokeWidth="1" opacity="0.7" />
      <rect x="27" y="38" width="6" height="20" rx="3" fill="#7c2d12" />
    </svg>
  );
}
function Splat() {
  return (
    <svg viewBox="0 0 60 60" className="relative size-14 animate-pop" aria-hidden>
      <path d="M30 6 l5 12 12-6-6 12 13 6-13 4 4 13-11-8-4 13-4-13-11 8 4-13-13-4 13-6-6-12 12 6z" fill="#16a34a" opacity="0.85" />
      <circle cx="30" cy="30" r="8" fill="#052e16" />
    </svg>
  );
}
