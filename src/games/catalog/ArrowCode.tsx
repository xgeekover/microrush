import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 열어! — 자물쇠에 적힌 화살표 순서대로 입력하면 열린다. 하나라도 틀리면 즉시 실패.
 * 배율 ×1.45 부터 4개. 입력: 방향키 · WASD · 화면의 화살표 버튼 · 스와이프(30px 이상). 시간 초과는 실패(부모).
 */

type Dir = 'U' | 'R' | 'D' | 'L';
const DIRS: Dir[] = ['U', 'R', 'D', 'L'];
const ICON = { U: ArrowUp, R: ArrowRight, D: ArrowDown, L: ArrowLeft } as const;
const KEY_DIR: Record<string, Dir> = { arrowup: 'U', w: 'U', arrowright: 'R', d: 'R', arrowdown: 'D', s: 'D', arrowleft: 'L', a: 'L' };

export function ArrowCode({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [code] = useState<Dir[]>(() => Array.from({ length: speedMultiplier >= 1.45 ? 4 : 3 }, () => DIRS[Math.floor(Math.random() * 4)]));
  const [entered, setEntered] = useState<Dir[]>([]);
  const enteredRef = useRef<Dir[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const input = (d: Dir) => {
    if (isDone()) return;
    const next = [...enteredRef.current, d];
    enteredRef.current = next;
    setEntered(next);
    if (d !== code[next.length - 1]) finish(false);
    else if (next.length === code.length) finish(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEY_DIR[e.key.toLowerCase()];
      if (!d || e.repeat) return;
      e.preventDefault();
      input(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스와이프: 버튼 밖에서 시작한 드래그의 우세 축
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
  };

  const open = done === 'success';

  return (
    <div
      data-testid="game-arrow-code"
      data-code={code.join('')}
      data-entered={entered.join('')}
      data-done={done ?? ''}
      onPointerDown={onDown}
      onPointerUp={onUp}
      className="vault relative flex h-full w-full touch-none select-none flex-col items-center justify-center gap-5 overflow-hidden"
    >
      <Instruction>순서대로 입력해!</Instruction>

      <div className="flex items-center gap-5 sm:gap-8">
        {/* 자물쇠: 성공하면 고리가 열린다 */}
        <svg viewBox="0 0 120 150" className="h-32 w-24 overflow-visible drop-shadow-[0_16px_18px_rgba(0,0,0,0.6)] sm:h-40 sm:w-32" aria-hidden>
          <defs>
            <linearGradient id="ac-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6dd92" /><stop offset="0.5" stopColor="#c49435" /><stop offset="1" stopColor="#6b4a12" /></linearGradient>
            <linearGradient id="ac-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4b5563" /><stop offset="0.4" stopColor="#e5e7eb" /><stop offset="1" stopColor="#374151" /></linearGradient>
          </defs>
          <path d="M32 70 V42 a28 28 0 0 1 56 0 V70" fill="none" stroke="url(#ac-steel)" strokeWidth="12" strokeLinecap="round" style={{ transform: open ? 'translate(-6px, -22px) rotate(-14deg)' : undefined, transformOrigin: '32px 70px', transition: 'transform 0.35s cubic-bezier(0.2,1.4,0.4,1)' }} />
          <rect x="14" y="66" width="92" height="78" rx="12" fill="url(#ac-brass)" stroke="#4a3208" strokeWidth="2" />
          <rect x="22" y="74" width="76" height="20" rx="4" fill="#0f172a" />
          <text x="60" y="89" textAnchor="middle" fontSize="12" fontWeight="800" fill={done === 'fail' ? '#ff4d67' : open ? '#34e29a' : '#22e3ff'} fontFamily="var(--font-display)" letterSpacing="2">
            {open ? 'OPEN' : done === 'fail' ? 'ERROR' : 'LOCKED'}
          </text>
          <circle cx="60" cy="112" r="8" fill="#2b1d05" /><rect x="56" y="114" width="8" height="16" rx="2" fill="#2b1d05" />
        </svg>

        {/* 코드 표시창 */}
        <div className="flex gap-2 rounded-2xl border border-white/15 bg-black/50 p-2.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)]">
          {code.map((d, i) => {
            const Icon = ICON[d];
            const state = i < entered.length ? (entered[i] === d ? 'ok' : 'bad') : i === entered.length ? 'next' : 'todo';
            return (
              <span
                key={i}
                className={`flex size-14 items-center justify-center rounded-lg border-2 sm:size-16 ${
                  state === 'ok' ? 'border-rush-green bg-rush-green/25 text-rush-green' : state === 'bad' ? 'border-rush-red bg-rush-red/40 text-white' : state === 'next' ? 'animate-[fx-cue_0.3s_ease-in-out_infinite_alternate] border-rush-yellow bg-rush-yellow/10 text-rush-yellow' : 'border-white/10 text-white/40'
                }`}
              >
                <Icon className="size-9" strokeWidth={3} />
              </span>
            );
          })}
        </div>
      </div>

      {/* 방향 패드 */}
      <div className="relative grid grid-cols-3 gap-1.5 rounded-full bg-black/40 p-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),0_10px_20px_-10px_rgba(0,0,0,0.8)]">
        {(
          [
            [null, 'U', null],
            ['L', 'D', 'R'],
          ] as Array<Array<Dir | null>>
        ).map((row, r) =>
          row.map((d, c) =>
            d ? (
              <button
                key={`${r}${c}`}
                type="button"
                data-dir={d}
                aria-label={d}
                onPointerDown={() => input(d)}
                className="flex size-16 items-center justify-center rounded-xl border border-white/20 bg-[linear-gradient(180deg,#4b5563,#1f2937)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_0_#0b0f16] active:translate-y-0.5 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_0_#0b0f16] sm:size-18"
              >
                {(() => {
                  const Icon = ICON[d];
                  return <Icon className="size-8" strokeWidth={3} />;
                })()}
              </button>
            ) : (
              <span key={`${r}${c}`} />
            ),
          ),
        )}
      </div>

      <Hint>방향키 · 버튼 · 스와이프</Hint>
    </div>
  );
}
