import { useEffect, useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

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
      className="room-wall relative h-full w-full select-none overflow-hidden"
    >
      <Instruction>{stage === 'show' ? '공을 잘 봐…' : stage === 'shuffle' ? '섞는다!' : '어느 컵?'}</Instruction>

      {/* 탁자 */}
      <div aria-hidden className="table-wood absolute inset-x-0 bottom-0 h-[34%] shadow-[0_-10px_20px_rgba(0,0,0,0.25)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-[34%] h-3 bg-[linear-gradient(180deg,#c98b52,#a86b3a)]" />
      {/* 자리 표시 (분필) */}
      {SLOT_X.map((x, i) => (
        <span key={x} aria-hidden className="absolute bottom-[27%] -translate-x-1/2 font-display text-lg text-white/50" style={{ left: `${x}%` }}>{i + 1}</span>
      ))}

      {/* 공 — 공이 든 컵의 자리를 따라간다 */}
      <div className="absolute bottom-[33%] size-10 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffb3b3,#e11d2f_45%,#7f0d18)] shadow-[0_6px_10px_rgba(0,0,0,0.4)] transition-[left] duration-300" style={{ left: `${SLOT_X[ballSlot]}%` }} />

      {/* 컵 3개 */}
      {[0, 1, 2].map((cup) => (
        <button
          key={cup}
          type="button"
          data-cup={cup}
          data-slot={slots[cup]}
          aria-label={`${slots[cup] + 1}번 컵`}
          onPointerDown={() => pickSlot(slots[cup])}
          className="absolute bottom-[32%] h-36 w-28 -translate-x-1/2 transition-[left,transform] duration-300 sm:w-32"
          style={{ left: `${SLOT_X[slots[cup]]}%`, transform: `translateX(-50%) translateY(${lifted ? -78 : 0}px)`, zIndex: 2 }}
        >
          <svg viewBox="0 0 100 130" className="h-full w-full overflow-visible drop-shadow-[0_14px_14px_rgba(0,0,0,0.4)]" aria-hidden>
            <defs>
              <linearGradient id={`sh-cup-${cup}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={picked === cup ? (done === 'success' ? '#14532d' : '#7f1d1d') : '#7f1d1d'} />
                <stop offset="0.35" stopColor={picked === cup ? (done === 'success' ? '#34e29a' : '#ff4d67') : '#ef4444'} />
                <stop offset="0.6" stopColor={picked === cup ? (done === 'success' ? '#6ee7b7' : '#ff8a8a') : '#f87171'} />
                <stop offset="1" stopColor={picked === cup ? (done === 'success' ? '#14532d' : '#7f1d1d') : '#7f1d1d'} />
              </linearGradient>
            </defs>
            <path d="M8 124 L20 34 Q50 -8 80 34 L92 124 Z" fill={`url(#sh-cup-${cup})`} stroke="#3f0a0a" strokeWidth="2" />
            <ellipse cx="50" cy="124" rx="42" ry="7" fill="#3f0a0a" opacity="0.5" />
            <path d="M22 34 Q50 6 78 34" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="5" strokeLinecap="round" />
            <path d="M26 44 L16 112" stroke="rgba(255,255,255,0.35)" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </button>
      ))}

      <Hint>{done === 'success' ? '찾았다!' : done === 'fail' ? '거기가 아니야…' : '컵 탭 · 1 2 3'}</Hint>
    </div>
  );
}
