import { Flame, Rocket } from 'lucide-react';
import { useRef, useState } from 'react';
import { useOutcome, usePressKey } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 연타해! — Space 나 화면을 N 번 연타해 파워 게이지를 100% 채우면 로켓이 발사된다.
 * N 은 기본 8회, 템포가 오르면 늘어난다(6 + 2×배율 → ×1.0 에서 8, ×2.2 에서 10).
 * 제한 시간(3.5s ÷ 배율) 안에 못 채우면 실패(부모).
 */

export function RocketMash({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const needed = Math.round(6 + 2 * speedMultiplier);
  const [presses, setPresses] = useState(0);
  const pressesRef = useRef(0);
  const [bump, setBump] = useState(0);

  const mash = () => {
    if (isDone()) return;
    pressesRef.current += 1;
    setPresses(pressesRef.current);
    setBump((b) => b + 1);
    if (pressesRef.current >= needed) finish(true);
  };
  usePressKey(mash);

  const power = Math.min(100, (presses / needed) * 100);
  const launched = done === 'success';

  return (
    <div
      data-testid="game-rocket-mash"
      data-presses={presses}
      data-needed={needed}
      data-power={power.toFixed(0)}
      data-done={done ?? ''}
      onPointerDown={mash}
      className="relative h-full w-full cursor-pointer select-none overflow-hidden bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-800"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-white/70">
        연타! 연타!
      </p>

      {/* 별 */}
      {[12, 30, 55, 72, 88].map((x, i) => (
        <span key={x} className="absolute size-1.5 rounded-full bg-white/70" style={{ left: `${x}%`, top: `${10 + ((i * 17) % 40)}%` }} />
      ))}

      {/* 발사대 + 로켓 */}
      <div className="absolute inset-x-0 bottom-[22%] flex justify-center">
        <div
          key={bump}
          className={`relative flex flex-col items-center ${launched ? 'animate-[fx-launch_0.9s_ease-in_forwards]' : 'animate-[fx-bump_0.12s_ease-out]'}`}
        >
          <Rocket className="size-28 -rotate-45 fill-slate-200 text-slate-700 drop-shadow-[0_8px_0_rgba(0,0,0,0.4)]" strokeWidth={2} />
          {/* 화염: 파워에 비례해 커진다 */}
          <Flame
            className="-mt-4 fill-orange-400 text-orange-500 transition-transform"
            style={{ transform: `scale(${0.4 + power / 100}) translateY(${power / 8}px)`, width: 48, height: 48 }}
          />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[18%] mx-auto h-4 w-56 rounded-full bg-slate-600 shadow-[0_6px_0_rgba(0,0,0,0.4)]" />

      {/* 파워 게이지 */}
      <div className="absolute inset-x-0 bottom-[6%] mx-auto w-72">
        <div className="mb-1 flex justify-between text-xs font-black text-white/60">
          <span>POWER</span>
          <span>
            {presses}/{needed}
          </span>
        </div>
        <div className="h-6 overflow-hidden rounded-full border-4 border-black/50 bg-black/40">
          <div
            className={`h-full transition-[width] duration-100 ${power >= 100 ? 'bg-rush-green' : 'bg-gradient-to-r from-rush-yellow to-orange-500'}`}
            style={{ width: `${power}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-white/50">Space · 클릭 · 탭을 연타</p>
      </div>

      {launched && (
        <p className="animate-pop absolute inset-x-0 top-[28%] text-center text-6xl font-black text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.3)]">
          발사!
        </p>
      )}
    </div>
  );
}
