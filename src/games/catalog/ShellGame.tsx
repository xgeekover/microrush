import { useEffect, useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';

/*
 * 찾아! — 공을 보여주고 컵을 덮은 뒤 몇 번 섞는다. 공이 든 컵을 고르면 성공, 아니면 즉시 실패.
 * 섞는 횟수는 배율에 따라 2 → 3 → 4번, 한 번 섞는 시간은 0.35초(÷배율). 시간 초과는 실패(부모).
 * 컵은 slot(0·1·2 자리)을 갖고, 섞기는 두 컵의 slot 을 맞바꾼다. 공은 컵에 붙어 있으므로 "공이 있는 자리" 는
 * 공이 든 컵의 slot 이다.
 */

const SHOW_S = 0.6;
const SWAP_S = 0.35;
const SLOT_X = [22, 50, 78];

type Stage = 'show' | 'shuffle' | 'pick';

export function ShellGame({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [ballCup] = useState(() => Math.floor(Math.random() * 3));
  const [slots, setSlots] = useState<number[]>([0, 1, 2]); // 컵 i 의 자리
  const slotsRef = useRef([0, 1, 2]);
  const [stage, setStage] = useState<Stage>('show');
  const stageRef = useRef<Stage>('show');
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const swaps = speedMultiplier >= 1.95 ? 4 : speedMultiplier >= 1.45 ? 3 : 2;
    const swapMs = (SWAP_S * 1000) / speedMultiplier;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    let t = (SHOW_S * 1000) / speedMultiplier;
    at(t, () => {
      stageRef.current = 'shuffle';
      setStage('shuffle');
    });
    for (let s = 0; s < swaps; s++) {
      t += swapMs;
      at(t, () => {
        // 서로 다른 두 컵의 자리를 바꾼다
        const a = Math.floor(Math.random() * 3);
        let b = Math.floor(Math.random() * 3);
        while (b === a) b = Math.floor(Math.random() * 3);
        const next = slotsRef.current.slice();
        [next[a], next[b]] = [next[b], next[a]];
        slotsRef.current = next;
        setSlots(next);
      });
    }
    at(t + swapMs, () => {
      stageRef.current = 'pick';
      setStage('pick');
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [speedMultiplier]);

  const pickSlot = (slot: number) => {
    if (isDone() || stageRef.current !== 'pick') return;
    const cup = slotsRef.current.indexOf(slot);
    setPicked(cup);
    finish(cup === ballCup);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i < 0 || e.repeat) return;
      e.preventDefault();
      pickSlot(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lifted = stage === 'show' || done !== null;
  const ballSlot = slots[ballCup];

  return (
    <div
      data-testid="game-shell-game"
      data-stage={stage}
      data-ball-slot={stage === 'pick' || done ? ballSlot : ''}
      data-done={done ?? ''}
      className="relative h-full w-full select-none overflow-hidden bg-gradient-to-b from-amber-100 to-amber-300"
    >
      <p className="absolute inset-x-0 top-6 text-center text-2xl font-black tracking-widest text-amber-950/70">
        {stage === 'show' ? '공을 잘 봐…' : stage === 'shuffle' ? '섞는다!' : '어느 컵?'}
      </p>

      {/* 탁자 */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-amber-700" />

      {/* 공 — 공이 든 컵의 자리를 따라간다 */}
      <div className="absolute bottom-[32%] size-10 -translate-x-1/2 rounded-full bg-rush-red shadow-[0_0_14px_rgba(255,71,87,0.7)] transition-[left] duration-300" style={{ left: `${SLOT_X[ballSlot]}%` }} />

      {/* 컵 3개 */}
      {[0, 1, 2].map((cup) => (
        <button
          key={cup}
          type="button"
          data-cup={cup}
          data-slot={slots[cup]}
          aria-label={`${slots[cup] + 1}번 컵`}
          onPointerDown={() => pickSlot(slots[cup])}
          className={`absolute bottom-[30%] h-32 w-24 -translate-x-1/2 rounded-t-[40%] rounded-b-md border-4 border-black/30 transition-[left,transform] duration-300 sm:w-28 ${
            picked === cup ? (done === 'success' ? 'bg-rush-green' : 'bg-rush-red') : 'bg-gradient-to-b from-red-500 to-red-700'
          }`}
          style={{ left: `${SLOT_X[slots[cup]]}%`, transform: `translateX(-50%) translateY(${lifted ? -70 : 0}px)`, zIndex: 2 }}
        >
          <span className="absolute inset-x-0 -bottom-9 text-center text-sm font-black text-amber-950/60">{slots[cup] + 1}</span>
        </button>
      ))}

      <p className="absolute inset-x-0 bottom-4 text-center text-sm text-amber-950/60">
        {done === 'success' ? '찾았다!' : done === 'fail' ? '거기가 아니야…' : '컵 탭 · 1 2 3'}
      </p>
    </div>
  );
}
