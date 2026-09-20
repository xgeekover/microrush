import { Cloud, Sun } from 'lucide-react';
import { useRef, useState } from 'react';
import { useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
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
      className="relative h-full w-full cursor-crosshair touch-none overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-300"
    >
      {/* 창밖 풍경 */}
      <Sun className="absolute right-[12%] top-[10%] size-28 fill-yellow-300 text-yellow-400" />
      <Cloud className="absolute left-[8%] top-[18%] size-24 fill-white text-white/80" />
      <Cloud className="absolute left-[38%] top-[8%] size-16 fill-white text-white/80" />
      <div className="absolute inset-x-0 bottom-0 h-[28%] rounded-t-[50%_100%] bg-emerald-500" />
      <Instruction>문질러 닦아!</Instruction>

      {/* 김 서린 타일 */}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
      >
        {cleared.map((isClear, i) => (
          <div
            key={i}
            data-tile={i}
            className={`border border-white/30 bg-slate-200/85 backdrop-blur-md transition-all duration-300 ${
              isClear ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'
            }`}
          />
        ))}
      </div>

      {/* 궤적 반짝임 */}
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="fx-sparkle pointer-events-none absolute z-10 text-2xl"
          style={{ left: s.x, top: s.y }}
        >
          ✦
        </span>
      ))}

      {/* 진행도 */}
      <div className="absolute inset-x-0 bottom-4 z-20 mx-auto w-48 overflow-hidden rounded-full border-2 border-white/60 bg-black/20">
        <div className="h-3 bg-white transition-[width] duration-150" style={{ width: `${(count / TOTAL) * 100}%` }} />
      </div>
      {done === 'success' && (
        <p className="animate-pop absolute inset-x-0 top-[40%] z-20 text-center text-6xl font-black text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          반짝!
        </p>
      )}
    </div>
  );
}
