import { useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 골라내! — 춤추는 표정들 가운데 하나만 다르다. 그놈을 누르면 성공, 다른 놈을 누르면 즉시 실패.
 * 배율 ×1.45 부터는 6명, 그 전엔 5명. 조합(기본 표정 · 다른 표정)은 매번 무작위.
 */

const PAIRS: ReadonlyArray<readonly [base: string, imposter: string]> = [
  ['😊', '😎'],
  ['😊', '😠'],
  ['😀', '🙃'],
  ['🐱', '🐶'],
  ['🍎', '🍅'],
  ['😐', '😴'],
  ['🐧', '🐔'],
];

interface Layout {
  count: number;
  imposter: number;
  pair: readonly [string, string];
  /** 슬롯별 세로 흔들림(%)과 춤 지연(ms) */
  offsets: Array<{ dy: number; delay: number }>;
}

function makeLayout(speedMultiplier: number): Layout {
  const count = speedMultiplier >= 1.45 ? 6 : 5;
  return {
    count,
    imposter: Math.floor(Math.random() * count),
    pair: PAIRS[Math.floor(Math.random() * PAIRS.length)],
    offsets: Array.from({ length: count }, () => ({ dy: (Math.random() - 0.5) * 30, delay: Math.random() * 400 })),
  };
}

export function SpotImposter({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [layout] = useState(() => makeLayout(speedMultiplier));
  const [picked, setPicked] = useState<number | null>(null);

  const pick = (i: number) => {
    if (isDone()) return;
    setPicked(i);
    finish(i === layout.imposter);
  };

  return (
    <div
      data-testid="game-spot-imposter"
      data-imposter={layout.imposter}
      data-count={layout.count}
      data-done={done ?? ''}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-violet-900 to-fuchsia-950"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white/70">
        하나만 달라!
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 px-6 sm:gap-6">
        {layout.offsets.map((o, i) => {
          const isImposter = i === layout.imposter;
          const isPicked = picked === i;
          return (
            <button
              key={i}
              type="button"
              data-index={i}
              data-imposter={isImposter}
              aria-label={isImposter ? '다른 녀석' : '같은 녀석'}
              onPointerDown={() => pick(i)}
              className={`flex size-24 items-center justify-center rounded-3xl border-4 text-6xl leading-none transition sm:size-28 sm:text-7xl ${
                isPicked && done === 'success'
                  ? 'animate-pop border-rush-green bg-rush-green/30'
                  : isPicked && done === 'fail'
                    ? 'border-rush-red bg-rush-red/40 grayscale'
                    : done === 'fail' && isImposter
                      ? 'border-rush-yellow bg-rush-yellow/20'
                      : 'border-white/10 bg-white/5 hover:border-white/50'
              } ${done ? '' : 'animate-[fx-dance_0.6s_ease-in-out_infinite_alternate]'}`}
              style={{ transform: `translateY(${o.dy}px)`, animationDelay: `${o.delay / speedMultiplier}ms`, animationDuration: `${600 / speedMultiplier}ms` }}
            >
              <span>{isImposter ? layout.pair[1] : layout.pair[0]}</span>
            </button>
          );
        })}
      </div>

      <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/50">
        {done === 'success' ? '찾았다!' : done === 'fail' ? '그놈이 아니야…' : '다른 하나를 클릭 · 탭'}
      </p>
    </div>
  );
}
