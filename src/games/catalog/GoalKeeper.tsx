import { useEffect, useRef, useState } from 'react';
import { useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Person } from '../scenery';
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
      className="pitch relative h-full w-full cursor-pointer touch-none select-none overflow-hidden"
    >
      <Instruction>공을 막아!</Instruction>
      <div aria-hidden className="crowd absolute inset-x-0 top-[18%] h-[8%] opacity-80" />
      {/* 페널티 박스 라인 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="4">
          <path d="M40 400 L120 170 H680 L760 400" /><path d="M250 400 L290 250 H510 L550 400" />
          <path d="M320 400 A80 40 0 0 1 480 400" />
        </g>
      </svg>

      {/* 골문 + 세 구역 */}
      <div className="absolute inset-x-[10%] top-[16%] h-[26%] rounded-t-md border-[10px] border-b-0 border-white bg-white/10 shadow-[0_18px_30px_-16px_rgba(0,0,0,0.6)] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.35)_0_1.5px,transparent_1.5px_14px),repeating-linear-gradient(90deg,rgba(255,255,255,0.35)_0_1.5px,transparent_1.5px_14px)]">
        {[0, 1, 2].map((z) => (
          <div key={z} data-zone={z} className={`absolute inset-y-0 w-1/3 transition-colors ${keeper === z ? 'bg-rush-yellow/15' : ''}`} style={{ left: `${(z * 100) / 3}%` }} />
        ))}
      </div>

      {/* 골키퍼: 팔을 벌린 선수 + 장갑 */}
      <div
        className="absolute top-[20%] h-[24%] w-[16%] -translate-x-1/2 transition-[left] duration-150 ease-out"
        style={{ left: `${ZONE_X[keeper]}%`, transform: `translateX(-50%) ${done === 'fail' ? 'rotate(-18deg)' : done === 'success' ? 'scale(1.12)' : ''}` }}
      >
        <Person className="h-full w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.45)]" pose={done === 'fail' ? 'fall' : 'cheer'} shirt={done === 'success' ? '#34e29a' : '#f59e0b'} />
        <span aria-hidden className="absolute left-[2%] top-[14%] size-[22%] rounded-full bg-[#ff7a1a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]" />
        <span aria-hidden className="absolute right-[2%] top-[14%] size-[22%] rounded-full bg-[#ff7a1a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]" />
      </div>

      {/* 공 — 날아갈수록 작아지고, 그림자는 발 앞에서만 */}
      <div className={`absolute w-[9%] -translate-x-1/2 -translate-y-1/2 ${!flying && t < 0 ? 'animate-[fx-jitter_0.2s_linear_infinite]' : ''}`} style={{ left: `${ballX}%`, top: `${ballY}%`, transform: `translate(-50%, -50%) scale(${ballScale})` }}>
        <svg viewBox="0 0 100 100" className="w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.45)]" aria-hidden>
          <defs><radialGradient id="gk-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cbd5e1" /></radialGradient></defs>
          <circle cx="50" cy="50" r="46" fill="url(#gk-ball)" stroke="#334155" strokeWidth="2" />
          <path d="M50 22 l18 13 -7 22 h-22 l-7 -22 z M50 22 l-4 -16 M68 35 l16 -6 M61 57 l12 14 M39 57 l-12 14 M32 35 l-16 -6" fill="#111827" stroke="#111827" strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </div>
      {/* 키커 */}
      <div className="absolute -bottom-[6%] left-1/2 h-[26%] w-[14%] -translate-x-[110%]">
        <Person className="h-full w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.4)]" pose={t < 0 ? 'crouch' : 'throw'} shirt="#ef4444" />
      </div>

      {done && (
        <p className={`animate-pop absolute inset-x-0 top-[46%] text-center font-display text-7xl drop-shadow-[0_6px_0_rgba(0,0,0,0.3)] ${done === 'success' ? 'text-white' : 'text-rush-red'}`}>
          {done === 'success' ? '세이브!' : '골…'}
        </p>
      )}
      <Hint>← → · 구역 탭 · 1 2 3</Hint>
    </div>
  );
}
