import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 세워! — 손바닥 위의 막대가 쓰러지려 한다. 기우는 반대쪽을 눌러 버틴다.
 * 중력은 sin(각도)에 비례하고 배율의 제곱으로 커진다, 누르는 동안 그쪽으로 토크(배율에 비례)가 걸린다.
 * 40° 를 넘으면 쓰러져 즉시 실패. 시간이 다 될 때까지 버티면 성공(registry 의 succeedOnTimeout).
 *
 * 왜 제곱인가: 가만히 두면 쓰러지는 데 걸리는 시간이 1/√중력 에 비례하는데, 제한 시간은 1/배율로 줄어든다.
 * 중력을 배율에 비례시키면 ×2.2 에서 쓰러지기 전에 시간이 끝나 "아무것도 안 해도 성공" 이 된다(실측).
 * 제곱으로 두면 어느 배율에서든 무입력 시 제한 시간의 ~70% 에 쓰러진다.
 */

const FAIL_DEG = 40;
const GRAVITY = 70; // deg/s² × sin(각도)
const TORQUE = 150; // deg/s²

export function BalancePole({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [init] = useState(() => ({ a: (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 5), v: (Math.random() - 0.5) * 16 }));
  const sim = useRef({ ...init });
  const input = useRef(0); // -1 왼쪽으로 밀기, +1 오른쪽으로 밀기
  const [angle, setAngle] = useState(init.a);
  const [pressing, setPressing] = useState(0);

  useFrameLoop((dt) => {
    if (isDone()) return;
    const s = sim.current;
    const g = GRAVITY * speedMultiplier * speedMultiplier;
    s.v += (g * Math.sin((s.a * Math.PI) / 180) + input.current * TORQUE * speedMultiplier) * dt;
    s.v *= 0.995;
    s.a += s.v * dt;
    setAngle(s.a);
    if (Math.abs(s.a) > FAIL_DEG) finish(false);
  }, !done);

  const setInput = (dir: number) => {
    input.current = dir;
    setPressing(dir);
  };

  useEffect(() => {
    const dirOf = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') return -1;
      if (k === 'arrowright' || k === 'd') return 1;
      return 0;
    };
    const down = (e: KeyboardEvent) => {
      const d = dirOf(e);
      if (!d) return;
      e.preventDefault();
      input.current = d;
      setPressing(d);
    };
    const up = (e: KeyboardEvent) => {
      const d = dirOf(e);
      if (!d || input.current !== d) return;
      input.current = 0;
      setPressing(0);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isDone()) return;
    capturePointer(e);
    const rect = e.currentTarget.getBoundingClientRect();
    setInput(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!input.current || isDone()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setInput(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
  };
  const release = () => setInput(0);

  const danger = Math.abs(angle) > 25;
  const fallen = done === 'fail';

  return (
    <div
      data-testid="game-balance-pole"
      data-angle={angle.toFixed(1)}
      data-done={done ?? ''}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      className="relative h-full w-full cursor-pointer touch-none select-none overflow-hidden bg-gradient-to-b from-orange-200 to-orange-400"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-orange-950/70">
        기우는 반대쪽을 눌러!
      </p>

      {/* 좌우 누름 표시 */}
      <div className={`absolute inset-y-0 left-0 w-1/2 transition-opacity ${pressing === -1 ? 'bg-white/20' : 'opacity-0'}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 transition-opacity ${pressing === 1 ? 'bg-white/20' : 'opacity-0'}`} />
      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-5xl text-orange-950/40">◀</span>
      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-5xl text-orange-950/40">▶</span>

      {/* 막대: 아래 끝을 축으로 회전 */}
      <div className="absolute bottom-[26%] left-1/2 h-[48%] w-4 origin-bottom -translate-x-1/2" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}>
        <div className={`h-full w-full rounded-full ${fallen ? 'bg-rush-red' : danger ? 'bg-rose-500' : 'bg-amber-800'}`} />
        <div className={`absolute -top-6 left-1/2 size-12 -translate-x-1/2 rounded-full border-4 border-black/30 ${done === 'success' ? 'bg-rush-green' : 'bg-rush-yellow'}`} />
      </div>
      {/* 손 */}
      <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 text-7xl">🖐️</div>

      <p className="absolute inset-x-0 bottom-4 text-center text-sm text-orange-950/60">
        {done === 'success' ? '버텼다!' : done === 'fail' ? '쓰러졌다…' : '← → · 화면 좌/우 누르기'}
      </p>
    </div>
  );
}
