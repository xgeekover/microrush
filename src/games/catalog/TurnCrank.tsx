import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 돌려! — 밸브를 두 바퀴 돌리면 물이 나온다.
 * 포인터를 누른 채 밸브 주위로 원을 그리면 포인터 각도의 변화량이 회전으로 쌓인다(어느 방향이든).
 * 키보드는 ← → 를 누르고 있으면 초당 한 바퀴. 시간 초과는 실패(부모).
 */

const TURNS = 2;
const KEY_DEG_PER_S = 400;

export function TurnCrank({ onSuccess, onFail }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [rotation, setRotation] = useState(0);
  const rot = useRef(0);
  const drag = useRef<{ id: number; lastAngle: number } | null>(null);
  const keyDir = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const add = (deltaDeg: number) => {
    if (isDone()) return;
    rot.current += deltaDeg;
    setRotation(rot.current);
    if (Math.abs(rot.current) >= TURNS * 360) finish(true);
  };

  useFrameLoop((dt) => {
    if (keyDir.current) add(keyDir.current * KEY_DEG_PER_S * dt);
  }, !done);

  useEffect(() => {
    const dirOf = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      return k === 'arrowright' || k === 'd' ? 1 : k === 'arrowleft' || k === 'a' ? -1 : 0;
    };
    const down = (e: KeyboardEvent) => {
      const d = dirOf(e);
      if (!d) return;
      e.preventDefault();
      keyDir.current = d;
    };
    const up = (e: KeyboardEvent) => {
      if (dirOf(e) === keyDir.current) keyDir.current = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const angleOf = (e: React.PointerEvent) => {
    const r = wheelRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => {
    if (isDone()) return;
    capturePointer(e);
    drag.current = { id: e.pointerId, lastAngle: angleOf(e) };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleOf(e);
    let delta = a - d.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.lastAngle = a;
    add(delta);
  };
  const onUp = () => {
    drag.current = null;
  };

  const progress = Math.min(1, Math.abs(rotation) / (TURNS * 360));

  return (
    <div
      data-testid="game-turn-crank"
      data-rotation={rotation.toFixed(0)}
      data-done={done ?? ''}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="relative flex h-full w-full cursor-grab touch-none select-none flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-600 to-slate-800 active:cursor-grabbing"
    >
      <Instruction>밸브를 두 바퀴!</Instruction>

      {/* 파이프 + 물 */}
      <div className="absolute right-[12%] top-[38%] h-8 w-[40%] rounded-full bg-slate-400 shadow-inner" />
      <div className={`absolute right-[10%] top-[44%] w-6 rounded-b-full bg-sky-400 transition-[height] duration-500 ${done === 'success' ? 'h-[40%]' : 'h-0'}`} />

      {/* 진행 링 */}
      <div
        className="absolute size-64 rounded-full sm:size-72"
        style={{ background: `conic-gradient(#2dd881 ${progress * 360}deg, rgba(255,255,255,0.08) 0)`, maskImage: 'radial-gradient(circle, transparent 62%, black 63%)', WebkitMaskImage: 'radial-gradient(circle, transparent 62%, black 63%)' }}
      />
      {/* 밸브 휠 */}
      <div
        ref={wheelRef}
        className="relative flex size-52 items-center justify-center rounded-full border-[14px] border-rose-600 bg-slate-700 shadow-[0_10px_0_rgba(0,0,0,0.4)] sm:size-60"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {[0, 60, 120].map((d) => (
          <span key={d} className="absolute h-full w-4 rounded-full bg-rose-600" style={{ transform: `rotate(${d}deg)` }} />
        ))}
        <span className="absolute size-14 rounded-full bg-rose-700 shadow-inner" />
        <span className="absolute top-2 size-4 rounded-full bg-rush-yellow" />
      </div>

      <Hint>{done === 'success' ? '콸콸!' : `누른 채 원을 그리며 드래그 · ← → 홀드 (${Math.floor(progress * TURNS * 10) / 10}/${TURNS} 바퀴)`}</Hint>
    </div>
  );
}
