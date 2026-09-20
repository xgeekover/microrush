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
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-lime-200 to-lime-400"
    >
      <Instruction>파리를 잡아!</Instruction>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
              className={`relative flex size-20 items-center justify-center rounded-2xl border-4 text-5xl sm:size-24 sm:text-6xl ${
                done === 'success' && here ? 'border-rush-green bg-rush-green/40' : 'border-lime-900/20 bg-white/40'
              }`}
            >
              {here && <span className={done === 'success' ? '' : 'inline-block animate-[fx-jitter_0.15s_linear_infinite]'}>{done === 'success' ? '💥' : '🪰'}</span>}
              {splat === i && !here && <span className="absolute text-3xl opacity-40">✋</span>}
            </button>
          );
        })}
      </div>
      <Hint>칸 탭 · 클릭 · 숫자 1~9</Hint>
    </div>
  );
}
