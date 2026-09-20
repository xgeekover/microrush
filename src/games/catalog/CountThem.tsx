import { useEffect, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Instruction } from '../ui';

/*
 * 세어! — 통통 튀는 사과가 몇 개인지 센다. 세 보기 중 맞는 수를 고르면 성공, 틀리면 즉시 실패.
 * 배율 ×1.45 부터 최대 8개. 시간 초과는 실패(부모).
 */

interface Layout {
  count: number;
  options: number[];
  items: Array<{ x: number; y: number; delay: number }>;
}

function makeLayout(speedMultiplier: number): Layout {
  const max = speedMultiplier >= 1.45 ? 8 : 6;
  const count = 3 + Math.floor(Math.random() * (max - 2));
  const options = [count - 1, count, count + 1].filter((n) => n >= 1);
  if (options.length < 3) options.push(count + 2);
  options.sort(() => Math.random() - 0.5);
  // 겹치지 않게 4×3 칸에서 뽑아 살짝 흔든다
  const cells = Array.from({ length: 12 }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
  const items = cells.map((c) => ({ x: 12 + (c % 4) * 25 + (Math.random() - 0.5) * 10, y: 22 + Math.floor(c / 4) * 20 + (Math.random() - 0.5) * 8, delay: Math.random() * 500 }));
  return { count, options, items };
}

export function CountThem({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [layout] = useState(() => makeLayout(speedMultiplier));
  const [picked, setPicked] = useState<number | null>(null);

  const pick = (n: number) => {
    if (isDone()) return;
    setPicked(n);
    finish(n === layout.count);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i < 0 || e.repeat) return;
      e.preventDefault();
      pick(layout.options[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="game-count-them"
      data-count={layout.count}
      data-done={done ?? ''}
      className="relative h-full w-full select-none overflow-hidden bg-gradient-to-b from-rose-100 to-rose-300"
    >
      <Instruction>사과가 몇 개?</Instruction>

      {layout.items.map((it, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-5xl sm:text-6xl animate-[fx-bob_0.7s_ease-in-out_infinite_alternate]"
          style={{ left: `${it.x}%`, top: `${it.y}%`, animationDelay: `${it.delay}ms` }}
        >
          🍎
        </span>
      ))}

      <div className="absolute inset-x-0 bottom-[8%] flex justify-center gap-3 sm:gap-5">
        {layout.options.map((n, i) => {
          const correct = n === layout.count;
          return (
            <button
              key={n}
              type="button"
              data-value={n}
              data-correct={correct}
              onPointerDown={() => pick(n)}
              className={`flex size-20 flex-col items-center justify-center rounded-2xl border-4 text-4xl font-black transition sm:size-24 ${
                picked === n && done === 'success'
                  ? 'animate-pop border-rush-green bg-rush-green text-rush-bg'
                  : picked === n && done === 'fail'
                    ? 'border-rush-red bg-rush-red text-white'
                    : done === 'fail' && correct
                      ? 'border-rush-yellow bg-rush-yellow/40 text-rose-950'
                      : 'border-rose-900/20 bg-white/70 text-rose-950 active:scale-95'
              }`}
            >
              {n}
              <span className="text-[10px] font-bold text-rose-950/50">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
