import { useEffect, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Grass, Sun } from '../scenery';
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
      className="orchard-sky relative h-full w-full select-none overflow-hidden"
    >
      <Instruction>사과가 몇 개?</Instruction>
      <Sun className="right-[8%] top-[6%] size-24" />
      {/* 큰 사과나무 · 잔디 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect x="370" y="220" width="60" height="140" fill="#7c4a1e" />
        <path d="M400 230 l-30 -40 M400 250 l34 -50" stroke="#7c4a1e" strokeWidth="14" strokeLinecap="round" />
        <circle cx="400" cy="150" r="130" fill="#3f9a3a" /><circle cx="300" cy="190" r="90" fill="#4fae45" /><circle cx="510" cy="190" r="95" fill="#3a8f35" /><circle cx="400" cy="110" r="90" fill="#5bbd50" />
      </svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[24%] bg-[linear-gradient(180deg,#7cc25a,#4f9a3c)]" />
      <Grass className="bottom-[23%]" color="#2f7a2a" count={30} />

      {layout.items.map((it, i) => (
        <svg
          key={i}
          viewBox="0 0 60 64"
          className="absolute w-14 -translate-x-1/2 -translate-y-1/2 animate-[fx-bob_0.7s_ease-in-out_infinite_alternate] drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] sm:w-16"
          style={{ left: `${it.x}%`, top: `${it.y}%`, animationDelay: `${it.delay}ms` }}
          aria-hidden
        >
          <defs><radialGradient id={`ct-apple-${i}`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ff9a9a" /><stop offset="0.5" stopColor="#e11d2f" /><stop offset="1" stopColor="#8f0d18" /></radialGradient></defs>
          <path d="M30 14 C40 4 58 10 56 32 C54 50 42 62 30 58 C18 62 6 50 4 32 C2 10 20 4 30 14 Z" fill={`url(#ct-apple-${i})`} />
          <path d="M30 14 v-10" stroke="#5b3a1e" strokeWidth="3" strokeLinecap="round" />
          <path d="M31 8 q12 -8 16 2 q-10 6 -16 -2 z" fill="#4fae45" />
          <ellipse cx="20" cy="24" rx="5" ry="8" fill="rgba(255,255,255,0.45)" transform="rotate(-20 20 24)" />
        </svg>
      ))}

      <div className="absolute inset-x-0 bottom-[7%] flex justify-center gap-3 sm:gap-5">
        {layout.options.map((n, i) => {
          const correct = n === layout.count;
          return (
            <button
              key={n}
              type="button"
              data-value={n}
              data-correct={correct}
              onPointerDown={() => pick(n)}
              className={`relative flex size-20 flex-col items-center justify-center rounded-xl border-2 font-display text-4xl shadow-[0_10px_16px_-8px_rgba(0,0,0,0.6)] transition sm:size-24 ${
                picked === n && done === 'success'
                  ? 'animate-pop border-rush-green bg-rush-green text-rush-bg'
                  : picked === n && done === 'fail'
                    ? 'border-rush-red bg-rush-red text-white'
                    : done === 'fail' && correct
                      ? 'border-rush-yellow bg-rush-yellow text-rush-bg'
                      : 'border-[#5b3a1e] bg-[linear-gradient(180deg,#d9a15c,#b9803f)] text-[#3b2410] active:scale-95'
              }`}
            >
              <span aria-hidden className="absolute top-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-black/40" />
              {n}
              <span className="text-[10px] font-sans font-bold opacity-60">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
