import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MicrogameProps, Outcome } from '../types';

/**
 * 멈춰! — 좌우로 오가는 바늘이 초록 영역 안에 있을 때 누른다.
 * 바늘 속도와 영역 폭이 speedMultiplier 를 따른다. 시간 초과는 실패(부모가 판정).
 */
export function StopTheGauge({ onSuccess, onFail, timeRemainingRatio, speedMultiplier }: MicrogameProps) {
  // 초록 영역: 폭은 템포가 오를수록 좁아지고, 위치는 매번 무작위
  const [zone] = useState(() => {
    const width = Math.max(0.1, 0.2 - (speedMultiplier - 1) * 0.06);
    const start = 0.12 + Math.random() * (0.88 - width - 0.12);
    return { start, end: start + width };
  });
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState<Outcome | null>(null);
  const doneRef = useRef(false);
  const posRef = useRef(0);

  // 바늘: 삼각파로 왕복. 한 번 건너가는 데 1 / (0.9 × 배율) 초.
  useEffect(() => {
    if (done) return;
    const sweepsPerSec = 0.9 * speedMultiplier;
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const p = (((now - t0) / 1000) * sweepsPerSec) % 2;
      const x = p < 1 ? p : 2 - p;
      posRef.current = x;
      setPos(x);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [done, speedMultiplier]);

  const press = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const x = posRef.current;
    const hit = x >= zone.start && x <= zone.end;
    setDone(hit ? 'success' : 'fail');
    if (hit) onSuccess();
    else onFail();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // press 는 ref 만 읽으므로 매 렌더 새로 등록할 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inZone = pos >= zone.start && pos <= zone.end;

  return (
    <div
      data-testid="game-stop-the-gauge"
      data-needle={pos.toFixed(3)}
      data-zone-start={zone.start.toFixed(3)}
      data-zone-end={zone.end.toFixed(3)}
      data-done={done ?? ''}
      onPointerDown={press}
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-8 bg-gradient-to-b from-rush-panel to-rush-bg px-8"
    >
      <p className="text-2xl font-black tracking-widest text-white/70">초록에서 멈춰!</p>

      <div className="relative w-full max-w-2xl">
        {/* 트랙 */}
        <div className="relative h-16 w-full overflow-hidden rounded-full border-4 border-black/50 bg-white/10 shadow-inner">
          <div
            className="absolute inset-y-0 bg-rush-green shadow-[0_0_30px_rgba(45,216,129,0.8)]"
            style={{ left: `${zone.start * 100}%`, width: `${(zone.end - zone.start) * 100}%` }}
          />
        </div>
        {/* 바늘 */}
        <div
          className={`absolute -top-3 -bottom-3 w-2 -translate-x-1/2 rounded-full transition-colors ${
            done === 'success' ? 'bg-rush-yellow' : done === 'fail' ? 'bg-rush-red' : inZone ? 'bg-white' : 'bg-rush-yellow'
          } shadow-[0_0_12px_rgba(255,255,255,0.9)]`}
          style={{ left: `${pos * 100}%` }}
        >
          <div className="absolute -top-4 left-1/2 size-0 -translate-x-1/2 border-x-[10px] border-t-[12px] border-x-transparent border-t-white" />
        </div>
        {/* 판정 마크 */}
        {done && (
          <div
            className={`animate-pop absolute -top-20 -translate-x-1/2 rounded-full p-2 ${done === 'success' ? 'bg-rush-green text-rush-bg' : 'bg-rush-red text-white'}`}
            style={{ left: `${pos * 100}%` }}
          >
            {done === 'success' ? <Check className="size-10" strokeWidth={4} /> : <X className="size-10" strokeWidth={4} />}
          </div>
        )}
      </div>

      <p className="text-sm text-white/50">Space · 클릭 · 탭</p>
      {/* 시간이 촉박하면 배경이 붉어진다 */}
      <div
        className="pointer-events-none absolute inset-0 bg-rush-red transition-opacity"
        style={{ opacity: timeRemainingRatio < 0.3 && !done ? (0.3 - timeRemainingRatio) * 0.8 : 0 }}
      />
    </div>
  );
}
