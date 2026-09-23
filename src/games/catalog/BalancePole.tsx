import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

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
  // 처음 기울기와 처음 각속도는 **같은 방향**이어야 한다 — "가만히 두면 쓰러진다"가 이 게임의 전제이기 때문이다.
  // 반대 방향으로 뽑히면 막대가 중심을 지나 반대편으로 넘어가느라 제한 시간을 넘겨, 아무것도 안 했는데 성공하는
  // 맥 빠지는 판이 나온다 (무입력 10만 회 시뮬: ×1.00 에서 8.2% · ×1.45 에서 1.4%). 같은 방향이면 어느 배율에서도 0%.
  const [init] = useState(() => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    return { a: dir * (7 + Math.random() * 5), v: dir * Math.random() * 8 };
  });
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
  const shown = fallen ? angle + Math.sign(angle || 1) * 48 : angle; // 쓰러지면 더 눕는다

  return (
    <div
      data-testid="game-balance-pole"
      data-angle={angle.toFixed(1)}
      data-done={done ?? ''}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      className="circus relative h-full w-full cursor-pointer touch-none select-none overflow-hidden"
    >
      <Instruction>기우는 반대쪽을 눌러!</Instruction>
      <div aria-hidden className="circus-floor absolute inset-x-0 bottom-0 h-[24%]" />
      <div aria-hidden className="absolute left-1/2 bottom-[18%] h-[10%] w-[46%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse,rgba(255,255,255,0.55),rgba(255,255,255,0)_70%)]" />

      {/* 좌우 누름 표시 */}
      <div className={`absolute inset-y-0 left-0 w-1/2 transition-opacity ${pressing === -1 ? 'bg-white/25' : 'opacity-0'}`} />
      <div className={`absolute inset-y-0 right-0 w-1/2 transition-opacity ${pressing === 1 ? 'bg-white/25' : 'opacity-0'}`} />
      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-display text-5xl text-black/30">◀</span>
      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-display text-5xl text-black/30">▶</span>

      {/* 막대 + 접시: 손바닥 위의 점을 축으로 회전 */}
      <div className="absolute bottom-[24%] left-1/2 h-[54%] w-14 origin-bottom" style={{ transform: `translateX(-50%) rotate(${shown}deg)`, transition: fallen ? 'transform 0.35s ease-in' : undefined }}>
        <svg viewBox="0 0 56 300" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="bp-wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5b3a1e" /><stop offset="0.5" stopColor="#b8814a" /><stop offset="1" stopColor="#5b3a1e" /></linearGradient>
            <radialGradient id="bp-plate" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="0.6" stopColor="#dbeafe" /><stop offset="1" stopColor="#93c5fd" /></radialGradient>
          </defs>
          <rect x="24" y="24" width="8" height="276" rx="4" fill="url(#bp-wood)" />
          <g className={done === 'success' ? '' : 'bp-spin'} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <ellipse cx="28" cy="18" rx="30" ry="9" fill={fallen ? '#ff4d67' : danger ? '#fca5a5' : 'url(#bp-plate)'} stroke="#1e3a8a" strokeWidth="2" />
            <ellipse cx="28" cy="18" rx="18" ry="5" fill="none" stroke="#1e3a8a" strokeWidth="1.5" opacity="0.6" />
          </g>
        </svg>
      </div>
      {/* 손바닥 */}
      <svg viewBox="0 0 120 90" className="absolute bottom-[14%] left-1/2 w-28 -translate-x-1/2 drop-shadow-[0_10px_12px_rgba(0,0,0,0.4)]" aria-hidden>
        <path d="M20 40 Q10 90 60 90 Q110 90 100 40 Z" fill="#f5c9a6" />
        {[26, 44, 62, 80].map((x, i) => <rect key={x} x={x - 7} y={8 + (i === 0 || i === 3 ? 10 : 0)} width="14" height="38" rx="7" fill="#f5c9a6" stroke="#d9a883" strokeWidth="1" />)}
        <rect x="94" y="30" width="26" height="14" rx="7" fill="#f5c9a6" stroke="#d9a883" strokeWidth="1" transform="rotate(-30 94 37)" />
        <path d="M30 60 q30 10 60 0" fill="none" stroke="#d9a883" strokeWidth="1.5" />
      </svg>

      <Hint>{done === 'success' ? '버텼다!' : done === 'fail' ? '쓰러졌다…' : '← → · 화면 좌/우 누르기'}</Hint>
    </div>
  );
}
