import { useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Cloud, Grass, Sun } from '../scenery';
import { Instruction } from '../ui';

/*
 * 닦아! — 김 서린 창문을 마우스로 문질러 80% 이상 걷어낸다.
 * 커서가 지나간 자리가 지워진다(누를 필요 없음 · 터치는 드래그). 걸레 반경(화면 짧은 변의 14%) 안에
 * 걸리는 타일은 한꺼번에 지워지므로 폰에서도 두세 번 스윕이면 된다. 빠르게 휘두르면 타일을 건너뛰므로
 * 직전 위치와 현재 위치 사이를 20px 간격으로 보간해 그 사이도 지운다. 궤적에는 반짝임이 남는다.
 */

const COLS = 5;
const ROWS = 4;
const TOTAL = COLS * ROWS;
const CLEAR_RATIO = 0.8;
const MAX_SPARKLES = 24;
/** 걸레 반경 — 필드의 짧은 변 대비 */
const BRUSH_RATIO = 0.14;

interface Sparkle {
  id: number;
  x: number;
  y: number;
}

export function CleanScreen({ onSuccess, onFail }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [cleared, setCleared] = useState<boolean[]>(() => Array.from({ length: TOTAL }, () => false));
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const fieldRef = useRef<HTMLDivElement>(null);
  const clearedRef = useRef(cleared);
  const last = useRef<{ x: number; y: number } | null>(null);
  const sparkleId = useRef(0);
  const lastSparkleAt = useRef(0);

  const count = cleared.filter(Boolean).length;

  const wipeAt = (x: number, y: number, width: number, height: number) => {
    // x, y: 필드 px 좌표. 걸레 원과 겹치는 타일을 전부 지운다
    const r = BRUSH_RATIO * Math.min(width, height);
    const tw = width / COLS;
    const th = height / ROWS;
    let next: boolean[] | null = null;
    for (let i = 0; i < TOTAL; i++) {
      if (clearedRef.current[i]) continue;
      const left = (i % COLS) * tw;
      const top = Math.floor(i / COLS) * th;
      const cx = Math.max(left, Math.min(left + tw, x));
      const cy = Math.max(top, Math.min(top + th, y));
      if ((cx - x) ** 2 + (cy - y) ** 2 > r * r) continue;
      if (!next) next = clearedRef.current.slice();
      next[i] = true;
    }
    if (!next) return;
    clearedRef.current = next;
    setCleared(next);
    if (next.filter(Boolean).length >= Math.ceil(TOTAL * CLEAR_RATIO)) finish(true);
  };

  const onMove = (e: React.PointerEvent) => {
    if (isDone()) return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const prev = last.current;
    last.current = { x, y };
    // 직전 점과의 사이를 20px 간격으로 채워 빠른 스윙에도 타일이 빠지지 않게 한다
    if (prev) {
      const dist = Math.hypot(x - prev.x, y - prev.y);
      const steps = Math.min(40, Math.ceil(dist / 20));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        wipeAt(prev.x + (x - prev.x) * t, prev.y + (y - prev.y) * t, rect.width, rect.height);
      }
    } else {
      wipeAt(x, y, rect.width, rect.height);
    }
    // 반짝임: 40ms 에 하나, 최대 24개
    const now = performance.now();
    if (now - lastSparkleAt.current > 40) {
      lastSparkleAt.current = now;
      const id = sparkleId.current++;
      setSparkles((s) => [...s.slice(-(MAX_SPARKLES - 1)), { id, x, y }]);
      window.setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 500);
    }
  };

  return (
    <div
      ref={fieldRef}
      data-testid="game-clean-screen"
      data-cleared={count}
      data-total={TOTAL}
      data-done={done ?? ''}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={() => {
        last.current = null;
      }}
      className="relative h-full w-full cursor-crosshair touch-none overflow-hidden bg-[linear-gradient(180deg,#5db4ff_0%,#a8d8ff_50%,#e7f4ff_100%)]"
    >
      {/* 창밖 풍경: 해 · 구름 · 언덕 · 집 · 풀 */}
      <Sun className="right-[12%] top-[10%] size-24" />
      <Cloud className="left-[8%] top-[16%] w-40" />
      <Cloud className="left-[42%] top-[8%] w-24 opacity-90" />
      <div aria-hidden className="absolute -left-[15%] bottom-[16%] h-[26%] w-[75%] rounded-[100%] bg-[linear-gradient(180deg,#8fd06a,#5fae4f)]" />
      <div aria-hidden className="absolute -right-[20%] bottom-[18%] h-[22%] w-[75%] rounded-[100%] bg-[linear-gradient(180deg,#a5db7b,#6db85a)]" />
      <svg viewBox="0 0 120 100" className="absolute left-[56%] bottom-[26%] w-[16%]" aria-hidden>
        <path d="M10 45 L60 8 L110 45 Z" fill="#b91c1c" /><rect x="20" y="45" width="80" height="50" fill="#fde68a" /><rect x="52" y="62" width="18" height="33" fill="#7c2d12" /><rect x="28" y="54" width="14" height="14" fill="#93c5fd" /><rect x="78" y="54" width="14" height="14" fill="#93c5fd" />
      </svg>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,#6cc35a,#3f8f34)]" />
      <Grass className="bottom-[21%]" color="#2f7a2a" count={30} />
      <Instruction>문질러 닦아!</Instruction>

      {/* 김 서린 타일 — 지워진 타일은 사라진다 */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      >
        {cleared.map((isClear, i) => (
          <div
            key={i}
            data-tile={i}
            className={`fog-tile transition-all duration-300 ${isClear ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'}`}
          />
        ))}
      </div>

      {/* 창틀 (그림자로 그리므로 히트 테스트를 막지 않는다) */}
      <div aria-hidden className="window-frame pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-[linear-gradient(90deg,#cbb994,#efe6d3,#cbb994)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 bg-[linear-gradient(180deg,#cbb994,#efe6d3,#cbb994)]" />

      {/* 궤적 반짝임 */}
      {sparkles.map((s) => (
        <span key={s.id} className="fx-sparkle pointer-events-none absolute z-10 text-2xl" style={{ left: s.x, top: s.y }}>
          ✦
        </span>
      ))}

      {/* 진행도 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-7 z-20 mx-auto flex w-52 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${(count / TOTAL) * 100}%` }} />
        </div>
        <span className="tabular-nums">{Math.round((count / TOTAL) * 100)}%</span>
      </div>
      {done === 'success' && (
        <p className="animate-pop absolute inset-x-0 top-[40%] z-20 text-center font-display text-7xl text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          반짝!
        </p>
      )}
    </div>
  );
}
