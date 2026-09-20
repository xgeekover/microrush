import { useRef, useState } from 'react';
import { useFrameLoop, useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';
import { Cloud, Person, Sun } from '../scenery';
import { Hint, Instruction } from '../ui';

/*
 * 점프! — 줄이 발밑을 지나는 순간 공중에 있어야 한다.
 * 줄은 1.35초(÷배율)에 한 바퀴 돌고 첫 바퀴의 3/4 지점에서 처음 발밑을 지난다. 그 순간
 * 점프 중(공중 450ms)이면 성공, 땅에 있으면 걸려 넘어져 즉시 실패. 판정은 첫 통과에서 한 번 난다.
 * 타이밍 창은 곧 공중 시간이다 — 줄이 오기 450ms 안쪽에 뛰어야 한다.
 * 줄이 마지막 1/4 바퀴(발밑 90° 앞)에 들어오면 발밑 링이 켜지고 줄이 밝아진다 — 폰에서는 이 예고가 없으면
 * 터치 지연(~80ms)과 반응 시간을 빼고 남는 창이 거의 없다.
 */

const PERIOD_S = 1.35;
const AIR_MS = 450;
/** 이 각도(도, 발밑까지 남은 각)부터 "지금!" 예고 */
const CUE_DEG = 100;
/** 시작 각도(도). 0 = 발밑. 90 에서 시작해 270° 돌면 처음 발밑 */
const START_DEG = 90;

export function JumpRope({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [angle, setAngle] = useState(START_DEG);
  const [airborne, setAirborne] = useState(false);
  const jumpAt = useRef<number | null>(null);
  const lastAngle = useRef(START_DEG);

  const period = PERIOD_S / speedMultiplier;
  /** 발밑까지 남은 각도. 예고 구간이면 true */
  const cue = !done && 360 - angle <= CUE_DEG;

  useFrameLoop((_dt, elapsed) => {
    if (isDone()) return;
    const a = (START_DEG + (elapsed / period) * 360) % 360;
    const now = performance.now();
    const inAir = jumpAt.current !== null && now - jumpAt.current < AIR_MS;
    if (!inAir && jumpAt.current !== null && now - jumpAt.current >= AIR_MS) jumpAt.current = null;
    setAirborne(inAir);
    // 각도가 360 → 0 으로 감기는 순간 = 줄이 발밑을 지났다. 진짜 한 바퀴(270° 이상 → 90° 미만)일 때만 —
    // 프레임 타이밍 오차로 각도가 살짝 뒤로 가는 것을 통과로 오판하지 않게.
    if (lastAngle.current > 270 && a < 90) finish(inAir);
    lastAngle.current = a;
    setAngle(a);
  }, !done);

  const jump = () => {
    if (isDone() || jumpAt.current !== null) return; // 공중에서는 다시 뛸 수 없다
    jumpAt.current = performance.now();
    setAirborne(true);
  };
  usePressKey(jump);

  return (
    <div
      data-testid="game-jump-rope"
      data-rope-angle={angle.toFixed(0)}
      data-airborne={airborne}
      data-cue={cue}
      data-done={done ?? ''}
      onPointerDown={jump}
      className="park-sky relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
    >
      <Instruction>줄이 발밑에 올 때 점프!</Instruction>
      <Sun className="left-[10%] top-[8%] size-24" />
      <Cloud className="right-[10%] top-[14%] w-40" />
      <Cloud className="left-[30%] top-[22%] w-24 opacity-85" />
      {/* 나무 · 울타리 · 마당 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {[60, 180, 640, 760].map((x, i) => (
          <g key={x}>
            <rect x={x - 8} y="220" width="16" height="70" fill="#7c4a1e" />
            <circle cx={x} cy="200" r={44 + (i % 2) * 10} fill={i % 2 ? '#3f9a3a' : '#4fae45'} />
            <circle cx={x - 26} cy="216" r="30" fill="#5bbd50" />
            <circle cx={x + 26} cy="216" r="30" fill="#3f9a3a" />
          </g>
        ))}
        <rect x="0" y="286" width="800" height="8" fill="#a3e635" />
      </svg>
      <div aria-hidden className="park-ground absolute inset-x-0 bottom-0 h-[28%]" />

      <div className="relative mt-[6%] flex size-72 items-center justify-center sm:size-80">
        {/* 줄: 아래쪽 호 + 나무 손잡이. 각도 0 = 호가 발밑. 예고 구간이면 밝아진다 */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" style={{ transform: `rotate(${angle}deg)` }} aria-hidden>
          <defs>
            <linearGradient id="jr-rope" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c4884f" /><stop offset="0.5" stopColor="#f0c890" /><stop offset="1" stopColor="#c4884f" /></linearGradient>
          </defs>
          <path d="M34.9 154.6 A85 85 0 0 0 165.1 154.6" fill="none" stroke={cue ? '#ffd60a' : 'url(#jr-rope)'} strokeWidth="7" strokeLinecap="round" className={cue ? 'drop-shadow-[0_0_10px_rgba(255,214,10,0.9)]' : 'drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)]'} />
          <rect x="28" y="140" width="12" height="30" rx="5" fill="#7c4a1e" transform="rotate(50 34.9 154.6)" />
          <rect x="160" y="140" width="12" height="30" rx="5" fill="#7c4a1e" transform="rotate(-50 165.1 154.6)" />
        </svg>
        {/* 발밑 링: 줄이 가까워지면 켜진다 — "지금 뛰어!" */}
        <div className={`pointer-events-none absolute bottom-2 h-6 w-36 rounded-[50%] border-4 transition-opacity ${cue ? 'animate-[fx-cue_0.25s_ease-in-out_infinite_alternate] border-rush-yellow opacity-100' : 'border-white/30 opacity-40'}`} />
        {/* 발밑 그림자 */}
        <div className="absolute bottom-5 h-3 w-20 rounded-full bg-black/35 transition-transform" style={{ transform: airborne ? 'scale(0.6)' : 'scale(1)' }} />
        {/* 캐릭터 */}
        <div
          className={`relative h-40 w-24 transition-transform duration-150 ease-out ${done === 'fail' ? 'translate-y-6 rotate-90' : ''}`}
          style={{ transform: airborne && !done ? 'translateY(-70px)' : undefined }}
        >
          <Person className="h-full w-full" pose={done === 'fail' ? 'fall' : done === 'success' ? 'cheer' : airborne ? 'jump' : 'stand'} shirt={done === 'fail' ? '#ff4d67' : done === 'success' ? '#34e29a' : '#f59e0b'} />
        </div>
      </div>

      <Hint>{done === 'success' ? '넘었다!' : done === 'fail' ? '걸렸다…' : 'Space · 클릭 · 탭'}</Hint>
    </div>
  );
}
