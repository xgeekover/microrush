import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Person } from '../scenery';
import { Hint, Instruction } from '../ui';

/*
 * 던져! — 누르고 있으면 파워가 0 → 100 → 0 으로 오르내린다. 바구니(65~85%)에 맞춰 놓으면 골인.
 * 놓는 순간 판정: 구간 안이면 성공, 모자라거나 넘치면 즉시 실패. 안 놓고 시간이 다 되면 실패(부모).
 * 입력: Space/Enter 홀드 · 화면 홀드(터치 · 마우스). 파워 왕복 주기는 1.2초(÷배율).
 */

const ZONE: readonly [number, number] = [65, 85];
const CYCLE_S = 1.2;

export function ChargeThrow({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [power, setPower] = useState(0);
  const powerRef = useRef(0);
  const holdStart = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [thrown, setThrown] = useState<number | null>(null);

  useFrameLoop(() => {
    if (isDone() || holdStart.current === null) return;
    const cycle = (CYCLE_S * 1000) / speedMultiplier;
    const p = ((performance.now() - holdStart.current) % cycle) / cycle; // 0~1
    const tri = p < 0.5 ? p * 2 : 2 - p * 2; // 삼각파 0→1→0
    powerRef.current = tri * 100;
    setPower(powerRef.current);
  }, !done);

  const press = () => {
    if (isDone() || holdStart.current !== null) return;
    holdStart.current = performance.now();
    setHolding(true);
  };
  const release = () => {
    if (isDone() || holdStart.current === null) return;
    holdStart.current = null;
    setHolding(false);
    const pw = powerRef.current;
    setThrown(pw);
    finish(pw >= ZONE[0] && pw <= ZONE[1]);
  };

  useEffect(() => {
    const isKey = (e: KeyboardEvent) => e.code === 'Space' || e.key === 'Enter';
    const down = (e: KeyboardEvent) => {
      if (!isKey(e) || e.repeat) return;
      e.preventDefault();
      press();
    };
    const up = (e: KeyboardEvent) => {
      if (!isKey(e)) return;
      release();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = thrown ?? power;
  const inZone = shown >= ZONE[0] && shown <= ZONE[1];
  const landX = 12 + 0.8 * (thrown ?? 0); // 착지 x (%)
  const START_X = 12;

  return (
    <div
      data-testid="game-charge-throw"
      data-power={shown.toFixed(0)}
      data-holding={holding}
      data-done={done ?? ''}
      onPointerDown={(e) => {
        capturePointer(e);
        press();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      className="gym-wall relative h-full w-full cursor-pointer touch-none select-none overflow-hidden"
    >
      <Instruction>누르고 있다가 바구니에 놓아!</Instruction>
      {/* 체육관: 벽 라인 · 마루 · 코트 선 */}
      <div aria-hidden className="absolute inset-x-0 top-[40%] h-[3%] bg-[#b91c1c]/70" />
      <div aria-hidden className="absolute inset-x-0 top-[44%] h-[1.5%] bg-[#1d4ed8]/60" />
      <div aria-hidden className="gym-floor absolute inset-x-0 bottom-0 h-[26%]" />
      <div aria-hidden className="absolute inset-x-0 bottom-[26%] h-1.5 bg-black/30" />
      <div aria-hidden className="absolute bottom-[10%] h-1 w-[40%] bg-white/60" style={{ left: `${12 + 0.8 * ZONE[0] - 20}%` }} />

      {/* 바구니 (파워 65~85% 자리) + 착지 표시 */}
      <div className="absolute bottom-[22%] -translate-x-1/2" style={{ left: `${12 + 0.8 * 75}%`, width: `${0.8 * (ZONE[1] - ZONE[0]) + 6}%` }}>
        <svg viewBox="0 0 120 80" className="w-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.4)]" aria-hidden>
          <defs><linearGradient id="ct-wicker" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9a15c" /><stop offset="1" stopColor="#8a5a2b" /></linearGradient></defs>
          <path d="M6 22 L114 22 L100 78 L20 78 Z" fill="url(#ct-wicker)" stroke="#5b3a1e" strokeWidth="2" />
          {[34, 46, 58, 70].map((y) => <path key={y} d={`M${8 + (y - 22) * 0.25} ${y} H${112 - (y - 22) * 0.25}`} stroke="#5b3a1e" strokeWidth="1.5" opacity="0.6" />)}
          <ellipse cx="60" cy="22" rx="54" ry="9" fill="#3b2410" /><ellipse cx="60" cy="20" rx="54" ry="9" fill="none" stroke="#d9a15c" strokeWidth="4" />
        </svg>
      </div>
      <div aria-hidden className="absolute bottom-[8%] h-2.5 -translate-x-1/2 rounded-[100%] bg-rush-yellow/60" style={{ left: `${12 + 0.8 * 75}%`, width: `${0.8 * (ZONE[1] - ZONE[0])}%` }} />

      {/* 던지는 사람 + 공 */}
      <div className="absolute bottom-[20%] h-[30%] w-[14%]" style={{ left: `${START_X - 6}%` }}>
        <Person className="h-full w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.4)]" pose={holding || thrown !== null ? 'throw' : 'stand'} shirt="#2563eb" />
      </div>
      <div
        key={thrown === null ? 'hold' : 'fly'}
        className="absolute bottom-[42%] w-[6%] -translate-x-1/2"
        style={
          {
            left: `${START_X + 4}%`,
            '--fx-dx': `${landX - START_X - 4}vw`,
            '--fx-dy': `${thrown !== null ? 'calc(20vh)' : '0px'}`,
            animation: thrown !== null ? 'fx-arc 0.6s cubic-bezier(0.3,0,0.7,1) forwards' : undefined,
            transform: holding ? `scale(${1 + power / 400})` : undefined,
          } as React.CSSProperties
        }
      >
        <svg viewBox="0 0 100 100" className="w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.4)]" aria-hidden>
          <defs><radialGradient id="ct-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffb066" /><stop offset="1" stopColor="#c2410c" /></radialGradient></defs>
          <circle cx="50" cy="50" r="46" fill="url(#ct-ball)" stroke="#7c2d12" strokeWidth="2" />
          <path d="M4 50 H96 M50 4 V96 M18 18 Q50 50 82 82 M82 18 Q50 50 18 82" fill="none" stroke="#7c2d12" strokeWidth="3" />
        </svg>
      </div>

      {/* 파워 게이지 */}
      <div className="absolute inset-x-[8%] bottom-[3%]">
        <div className="relative h-6 overflow-hidden rounded-full border border-white/40 bg-black/45 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-y-0 bg-rush-yellow/35" style={{ left: `${ZONE[0]}%`, width: `${ZONE[1] - ZONE[0]}%` }} />
          <div className={`h-full transition-none ${inZone ? 'bg-rush-green' : 'bg-gradient-to-r from-sky-400 to-rush-pink'}`} style={{ width: `${shown}%` }} />
        </div>
      </div>
      <Hint>{done === 'success' ? '골인!' : done === 'fail' ? (shown < ZONE[0] ? '짧았어…' : '넘어갔어…') : holding ? '놓아!' : 'Space · 화면을 누르고 있어'}</Hint>
    </div>
  );
}
