import { useEffect, useRef, useState } from 'react';
import { useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 막아! — 키커가 세 구역 중 한 곳으로 찬다. 공이 날아가는 방향을 읽고 골키퍼를 그 구역으로 옮긴다.
 * 공은 0.5초(÷배율) 뒤에 출발해 1.1초(÷배율) 동안 날아간다. 도착 순간 키퍼가 같은 구역이면 세이브(성공),
 * 아니면 골(즉시 실패). 시간 초과는 없다 — 반드시 도착한다.
 */

const WINDUP_S = 0.5;
const FLIGHT_S = 1.1;
const ZONE_X = [22, 50, 78]; // 구역 중심 x (%)

export function GoalKeeper({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [target] = useState(() => Math.floor(Math.random() * 3));
  const [keeper, setKeeper] = useState(1);
  const keeperRef = useRef(1);
  const [t, setT] = useState(-1); // 비행 진행도. 0 미만이면 아직 발 앞

  useFrameLoop((_dt, elapsed) => {
    if (isDone()) return;
    const p = (elapsed - WINDUP_S / speedMultiplier) / (FLIGHT_S / speedMultiplier);
    setT(Math.min(1, p));
    if (p >= 1) finish(keeperRef.current === target);
  }, !done);

  const moveTo = (zone: number) => {
    if (isDone()) return;
    keeperRef.current = Math.max(0, Math.min(2, zone));
    setKeeper(keeperRef.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') moveTo(keeperRef.current - 1);
      else if (k === 'arrowright' || k === 'd') moveTo(keeperRef.current + 1);
      else if (k === '1' || k === '2' || k === '3') moveTo(Number(k) - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    moveTo(Math.floor(((e.clientX - rect.left) / rect.width) * 3));
  };

  const flying = t >= 0 && t < 1;
  const ballX = t < 0 ? 50 : 50 + (ZONE_X[target] - 50) * t;
  const ballY = t < 0 ? 84 : 84 - 56 * t; // 발 앞(84%) → 골문(28%)
  const ballScale = t < 0 ? 1 : 1 - 0.55 * t;

  return (
    <div
      data-testid="game-goal-keeper"
      data-target={target}
      data-keeper={keeper}
      data-ball-t={t.toFixed(2)}
      data-done={done ?? ''}
      onPointerDown={onPointerDown}
      className="relative h-full w-full cursor-pointer touch-none select-none overflow-hidden bg-gradient-to-b from-sky-300 via-emerald-500 to-emerald-700"
    >
      <Instruction>공을 막아!</Instruction>

      {/* 골문 + 세 구역 */}
      <div className="absolute inset-x-[8%] top-[16%] h-[26%] rounded-t-2xl border-8 border-b-0 border-white bg-white/10 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.25)_0_2px,transparent_2px_16px),repeating-linear-gradient(90deg,rgba(255,255,255,0.25)_0_2px,transparent_2px_16px)]">
        {[0, 1, 2].map((z) => (
          <div
            key={z}
            data-zone={z}
            className={`absolute inset-y-0 w-1/3 border-x border-white/20 ${keeper === z ? 'bg-rush-yellow/15' : ''}`}
            style={{ left: `${(z * 100) / 3}%` }}
          />
        ))}
      </div>

      {/* 골키퍼 */}
      <div
        className="absolute top-[24%] -translate-x-1/2 text-7xl transition-[left] duration-150 ease-out"
        style={{ left: `${ZONE_X[keeper]}%`, transform: `translateX(-50%) ${done === 'fail' ? 'rotate(-20deg)' : done === 'success' ? 'scale(1.15)' : ''}` }}
      >
        🧤
      </div>

      {/* 공 */}
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 text-6xl ${!flying && t < 0 ? 'animate-[fx-jitter_0.2s_linear_infinite]' : ''}`}
        style={{ left: `${ballX}%`, top: `${ballY}%`, transform: `translate(-50%, -50%) scale(${ballScale})` }}
      >
        ⚽
      </div>
      {/* 키커 */}
      <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 text-7xl">🦵</div>

      {done && (
        <p className={`animate-pop absolute inset-x-0 top-[46%] text-center text-6xl font-black drop-shadow-[0_6px_0_rgba(0,0,0,0.3)] ${done === 'success' ? 'text-white' : 'text-rush-red'}`}>
          {done === 'success' ? '세이브!' : '골…'}
        </p>
      )}
      <Hint>← → · 구역 탭 · 1 2 3</Hint>
    </div>
  );
}
