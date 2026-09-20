import { Leaf } from 'lucide-react';
import { useRef, useState } from 'react';
import { capturePointer, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 뽑아! — 땅에 박힌 거대한 무를 잡고 위로 홱 당긴다.
 * 무를 누른 채 위로 80px(빠를수록 좋다: 700ms 안에) 끌면 쑥 빠지며 성공. 느리게 끌면 도로 박힌다.
 * 시간 초과는 실패(부모가 판정).
 */

const PULL_PX = 80;
/** 이 시간 안에 80px 을 못 채우면 무가 미끄러져 되돌아간다 (템포가 오르면 더 짧아진다) */
const PULL_WINDOW_MS = 700;

export function PluckRoot({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [pull, setPull] = useState(0); // 0 → 80px 위로 당긴 거리
  const [slipped, setSlipped] = useState(0); // 미끄러진 횟수 (흔들림 연출 key)
  const drag = useRef<{ id: number; startY: number; startAt: number } | null>(null);

  const windowMs = PULL_WINDOW_MS / speedMultiplier;

  const onDown = (e: React.PointerEvent) => {
    if (isDone() || drag.current) return;
    capturePointer(e);
    drag.current = { id: e.pointerId, startY: e.clientY, startAt: performance.now() };
  };

  const release = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    if (!isDone()) {
      setPull(0);
      setSlipped((n) => n + 1);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || isDone()) return;
    const dy = d.startY - e.clientY; // 위로 끌면 양수
    const elapsed = performance.now() - d.startAt;
    if (elapsed > windowMs) {
      // 너무 느리다 — 무가 미끄러져 도로 박힌다. 다시 잡아 당길 수 있다.
      drag.current = null;
      setPull(0);
      setSlipped((n) => n + 1);
      return;
    }
    const p = Math.max(0, Math.min(PULL_PX, dy));
    setPull(p);
    if (p >= PULL_PX) {
      drag.current = null;
      finish(true);
    }
  };

  const lift = done === 'success' ? 260 : pull * 0.55; // 성공하면 하늘로

  return (
    <div
      data-testid="game-pluck-root"
      data-pull={pull.toFixed(0)}
      data-done={done ?? ''}
      className="relative h-full w-full select-none overflow-hidden bg-gradient-to-b from-sky-400 to-sky-200"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white drop-shadow">
        잡고 위로 홱!
      </p>

      {/* 땅 */}
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-b from-amber-800 to-amber-950" />
      <div className="absolute inset-x-0 bottom-[38%] h-4 bg-lime-600" />

      {/* 무: 잡는 곳. 몸통은 땅에 박혀 있고 잎만 나와 있다 */}
      <button
        type="button"
        aria-label="무를 잡고 위로 끌기"
        data-testid="pluck-target"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={release}
        onPointerCancel={release}
        className={`absolute left-1/2 bottom-[30%] flex w-40 -translate-x-1/2 cursor-grab touch-none flex-col items-center active:cursor-grabbing ${
          done === 'success' ? 'transition-transform duration-300 ease-out' : ''
        }`}
        style={{ transform: `translate(-50%, ${-lift}px) rotate(${done === 'success' ? -18 : 0}deg)` }}
      >
        <span key={slipped} className={`flex gap-1 ${slipped > 0 && !done ? 'animate-[fx-wiggle_0.3s_ease-in-out]' : ''}`}>
          <Leaf className="size-12 -rotate-45 fill-lime-500 text-lime-700" />
          <Leaf className="size-14 fill-lime-400 text-lime-700" />
          <Leaf className="size-12 rotate-45 fill-lime-500 text-lime-700" />
        </span>
        {/* 몸통: 연한 자주색에서 흰색으로 */}
        <span className="h-40 w-28 rounded-b-[999px] rounded-t-3xl border-4 border-black/30 bg-gradient-to-b from-fuchsia-300 via-white to-white shadow-inner" />
      </button>

      {/* 성공: 흙 파티클 + "쑥!" */}
      {done === 'success' && (
        <>
          <p className="animate-pop absolute inset-x-0 top-[30%] text-center text-6xl font-black text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.3)]">
            쑥!
          </p>
          <div className="absolute left-1/2 bottom-[36%]">
            {[-60, -35, -10, 15, 40, 65].map((dx, i) => (
              <span
                key={dx}
                className="fx-particle absolute size-3 rounded-full bg-amber-900"
                style={
                  { '--fx-dx': `${dx}px`, '--fx-dy': `${-90 - (i % 3) * 30}px`, '--fx-rot': '180deg', '--fx-delay': '0ms' } as React.CSSProperties
                }
              />
            ))}
          </div>
        </>
      )}

      <p className="absolute inset-x-0 bottom-[10%] text-center text-sm text-amber-100/80">무를 누른 채 위로 드래그</p>
    </div>
  );
}
