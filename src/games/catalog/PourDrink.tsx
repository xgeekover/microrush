import { useRef, useState } from 'react';
import { useFrameLoop, useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';

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

  return (
    <div
      data-testid="game-pour-drink"
      data-level={level.toFixed(1)}
      data-target-min={TARGET_MIN}
      data-target-max={TARGET_MAX}
      data-done={done ?? ''}
      onPointerDown={stop}
      className="relative flex h-full w-full cursor-pointer flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-rose-950 to-rush-bg pb-[8%]"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white/70">
        점선까지 채워!
      </p>

      {/* 주스 줄기 (멈추면 사라진다) */}
      {!stopped && (
        <div className="absolute left-1/2 top-[14%] h-[45%] w-5 -translate-x-1/2 rounded-b-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.8)]" />
      )}
      {/* 주전자 입 */}
      <div className="absolute left-1/2 top-[8%] h-10 w-28 -translate-x-1/2 rounded-b-3xl border-4 border-black/40 bg-slate-300" />

      {/* 컵 */}
      <div className="relative h-[58%] w-52 overflow-hidden rounded-b-[2.5rem] rounded-t-xl border-x-[6px] border-b-[10px] border-white/70 bg-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.15)] sm:w-60">
        {/* 타겟 점선 */}
        <div className="absolute inset-x-0 z-10 border-t-4 border-dashed border-rush-yellow" style={{ bottom: `${TARGET_MAX}%` }} />
        <div className="absolute inset-x-0 z-10 border-t-4 border-dashed border-rush-yellow" style={{ bottom: `${TARGET_MIN}%` }} />
        <div
          className="absolute inset-x-0 z-0 bg-rush-yellow/15"
          style={{ bottom: `${TARGET_MIN}%`, height: `${TARGET_MAX - TARGET_MIN}%` }}
        />
        {/* 주스 */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-orange-500 to-orange-400 ${
            done === 'success' ? 'shadow-[0_0_40px_rgba(251,146,60,0.9)]' : ''
          }`}
          style={{ height: `${Math.min(100, level)}%` }}
        >
          <div className={`absolute -top-2 inset-x-0 h-4 rounded-[50%] bg-orange-300 ${stopped ? '' : 'animate-[fx-wave_0.5s_ease-in-out_infinite_alternate]'}`} />
        </div>
      </div>

      {/* 넘침 */}
      {overflow && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] h-[10%] animate-pop rounded-t-[50%] bg-orange-400/80" />
      )}

      <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/50">
        {done === 'success' ? '완벽한 한 잔!' : overflow ? '넘쳤어!' : short ? '너무 적어…' : 'Space · 클릭 · 탭'}
      </p>
    </div>
  );
}
