import { useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

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
      className="disco-stage relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
    >
      <Instruction>하나만 달라!</Instruction>
      {/* 무대 바닥 · 조명 */}
      <div aria-hidden className="disco-floor absolute inset-x-[-20%] bottom-0 h-[42%]" />
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="si-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(255,255,255,0.28)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
        </defs>
        {[140, 400, 660].map((x) => <polygon key={x} points={`${x - 16},0 ${x + 16},0 ${x + 160},400 ${x - 160},400`} fill="url(#si-beam)" />)}
        {[140, 400, 660].map((x) => <rect key={x} x={x - 22} y="0" width="44" height="14" rx="4" fill="#111827" />)}
      </svg>

      <div className="relative flex flex-wrap items-center justify-center gap-4 px-6 sm:gap-7">
        {layout.offsets.map((o, i) => {
          const isImposter = i === layout.imposter;
          const isPicked = picked === i;
          const ring =
            isPicked && done === 'success'
              ? 'ring-4 ring-rush-green shadow-[0_0_30px_rgba(52,226,154,0.8)]'
              : isPicked && done === 'fail'
                ? 'ring-4 ring-rush-red grayscale'
                : done === 'fail' && isImposter
                  ? 'ring-4 ring-rush-yellow'
                  : 'ring-2 ring-white/20 hover:ring-white/60';
          return (
            <div key={i} className="relative">
              <button
                type="button"
                data-index={i}
                data-imposter={isImposter}
                aria-label={isImposter ? '다른 녀석' : '같은 녀석'}
                onPointerDown={() => pick(i)}
                className={`relative flex size-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff,#e2e8f0_45%,#94a3b8_100%)] text-6xl leading-none shadow-[0_14px_24px_-8px_rgba(0,0,0,0.7)] transition sm:size-28 sm:text-7xl ${ring} ${isPicked && done === 'success' ? 'animate-pop' : ''} ${done ? '' : 'animate-[fx-dance_0.6s_ease-in-out_infinite_alternate]'}`}
                style={{ transform: `translateY(${o.dy}px)`, animationDelay: `${o.delay / speedMultiplier}ms`, animationDuration: `${600 / speedMultiplier}ms` }}
              >
                <span className="drop-shadow-[0_3px_0_rgba(0,0,0,0.25)]">{isImposter ? layout.pair[1] : layout.pair[0]}</span>
              </button>
              <span aria-hidden className="absolute inset-x-3 -bottom-4 h-3 rounded-[100%] bg-black/45 blur-[2px]" />
            </div>
          );
        })}
      </div>

      <Hint>{done === 'success' ? '찾았다!' : done === 'fail' ? '그놈이 아니야…' : '다른 하나를 클릭 · 탭'}</Hint>
    </div>
  );
}
