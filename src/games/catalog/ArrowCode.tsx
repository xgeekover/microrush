import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Lock, LockOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';

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

  return (
    <div
      data-testid="game-arrow-code"
      data-code={code.join('')}
      data-entered={entered.join('')}
      data-done={done ?? ''}
      onPointerDown={onDown}
      onPointerUp={onUp}
      className="relative flex h-full w-full touch-none select-none flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white/70">
        순서대로 입력해!
      </p>

      <div className="flex items-center gap-4">
        {done === 'success' ? <LockOpen className="size-16 text-rush-green" strokeWidth={2.5} /> : <Lock className={`size-16 ${done === 'fail' ? 'text-rush-red' : 'text-rush-yellow'}`} strokeWidth={2.5} />}
        <div className="flex gap-2">
          {code.map((d, i) => {
            const Icon = ICON[d];
            const state = i < entered.length ? (entered[i] === d ? 'ok' : 'bad') : i === entered.length ? 'next' : 'todo';
            return (
              <span
                key={i}
                className={`flex size-14 items-center justify-center rounded-xl border-4 sm:size-16 ${
                  state === 'ok' ? 'border-rush-green bg-rush-green/30 text-rush-green' : state === 'bad' ? 'border-rush-red bg-rush-red/40 text-white' : state === 'next' ? 'animate-[fx-cue_0.3s_ease-in-out_infinite_alternate] border-rush-yellow text-rush-yellow' : 'border-white/20 text-white/60'
                }`}
              >
                <Icon className="size-9" strokeWidth={3} />
              </span>
            );
          })}
        </div>
      </div>

      {/* 화면 화살표 버튼 (십자) */}
      <div className="grid grid-cols-3 gap-1">
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
                className="flex size-16 items-center justify-center rounded-xl border-4 border-white/20 bg-white/10 text-white active:bg-white/30 sm:size-18"
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

      <p className="absolute inset-x-0 bottom-4 text-center text-sm text-white/50">방향키 · 버튼 · 스와이프</p>
    </div>
  );
}
