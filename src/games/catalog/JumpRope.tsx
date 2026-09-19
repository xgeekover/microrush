import { PersonStanding } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFrameLoop, useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 점프! — 줄이 발밑을 지나는 순간 공중에 있어야 한다.
 * 줄은 1.1초(÷배율)에 한 바퀴 돌고 첫 바퀴의 3/4 지점에서 처음 발밑을 지난다. 그 순간
 * 점프 중(공중 320ms)이면 성공, 땅에 있으면 걸려 넘어져 즉시 실패. 판정은 첫 통과에서 한 번 난다.
 * 타이밍 창은 곧 공중 시간이다 — 줄이 오기 320ms 안쪽에 뛰어야 한다.
 */

const PERIOD_S = 1.1;
const AIR_MS = 320;
/** 시작 각도(도). 0 = 발밑. 90 에서 시작해 270° 돌면 처음 발밑 */
const START_DEG = 90;

export function JumpRope({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [angle, setAngle] = useState(START_DEG);
  const [airborne, setAirborne] = useState(false);
  const jumpAt = useRef<number | null>(null);
  const lastAngle = useRef(START_DEG);

  const period = PERIOD_S / speedMultiplier;

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
      data-done={done ?? ''}
      onPointerDown={jump}
      className="relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-teal-800 to-teal-950"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white/70">
        줄이 발밑에 올 때 점프!
      </p>

      <div className="relative flex size-72 items-center justify-center sm:size-80">
        {/* 줄: 원의 아랫쪽 호만 보이는 링을 회전시킨다. 각도 0 = 호가 발밑 */}
        <div
          className="absolute inset-0 rounded-full border-[6px] border-transparent border-b-amber-200 drop-shadow-[0_0_6px_rgba(0,0,0,0.6)]"
          style={{ transform: `rotate(${angle}deg)` }}
        />
        {/* 손잡이 */}
        <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
          <span className="absolute -bottom-1 left-[6%] h-6 w-3 rounded bg-rose-500" />
          <span className="absolute -bottom-1 right-[6%] h-6 w-3 rounded bg-rose-500" />
        </div>

        {/* 캐릭터 */}
        <div
          className={`relative transition-transform duration-150 ease-out ${done === 'fail' ? 'rotate-90 translate-y-8' : ''}`}
          style={{ transform: airborne && !done ? 'translateY(-64px) scaleY(1.08)' : undefined }}
        >
          <PersonStanding
            className={`size-32 ${done === 'fail' ? 'text-rush-red' : done === 'success' ? 'text-rush-green' : 'text-rush-yellow'}`}
            strokeWidth={2.5}
          />
        </div>
        {/* 발밑 그림자 */}
        <div
          className="absolute bottom-6 h-3 w-20 rounded-full bg-black/40 transition-transform"
          style={{ transform: airborne ? 'scale(0.6)' : 'scale(1)' }}
        />
      </div>

      <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/50">
        {done === 'success' ? '넘었다!' : done === 'fail' ? '걸렸다…' : 'Space · 클릭 · 탭'}
      </p>
    </div>
  );
}
