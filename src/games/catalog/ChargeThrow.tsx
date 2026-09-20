import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
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
      className="relative h-full w-full cursor-pointer touch-none select-none overflow-hidden bg-gradient-to-b from-indigo-300 to-indigo-600"
    >
      <Instruction>누르고 있다가 바구니에 놓아!</Instruction>

      {/* 바닥 · 바구니 (파워 65~85% 위치) */}
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-indigo-900" />
      <div className="absolute bottom-[22%] h-16 -translate-x-1/2 rounded-b-3xl border-4 border-amber-900 bg-amber-600" style={{ left: `${8 + 0.84 * 75}%`, width: `${0.84 * 20}%` }} />
      <div className="absolute bottom-[22%] h-2 rounded bg-rush-yellow/70" style={{ left: `${8 + 0.84 * ZONE[0]}%`, width: `${0.84 * (ZONE[1] - ZONE[0])}%` }} />

      {/* 던지는 사람 + 공 */}
      <div className="absolute bottom-[22%] left-[6%] text-7xl">🧍</div>
      <div
        className="absolute text-5xl transition-[left,bottom] duration-500 ease-out"
        style={{ left: `${8 + 0.84 * (thrown ?? 0)}%`, bottom: thrown !== null ? '24%' : '46%' }}
      >
        🏀
      </div>

      {/* 파워 게이지 */}
      <div className="absolute inset-x-[8%] bottom-[8%]">
        <div className="relative h-7 overflow-hidden rounded-full border-4 border-black/40 bg-black/30">
          <div className="absolute inset-y-0 bg-rush-yellow/30" style={{ left: `${ZONE[0]}%`, width: `${ZONE[1] - ZONE[0]}%` }} />
          <div className={`h-full transition-none ${inZone ? 'bg-rush-green' : 'bg-gradient-to-r from-sky-400 to-rush-pink'}`} style={{ width: `${shown}%` }} />
        </div>
        <Hint>{done === 'success' ? '골인!' : done === 'fail' ? (shown < ZONE[0] ? '짧았어…' : '넘어갔어…') : holding ? '놓아!' : 'Space · 화면을 누르고 있어'}</Hint>
      </div>
    </div>
  );
}
