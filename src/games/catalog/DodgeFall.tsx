import { useEffect, useRef, useState } from 'react';
import type { MicrogameProps, Outcome } from '../types';
import { Person } from '../scenery';
import { Hint, Instruction } from '../ui';

/*
 * 피해! — 위에서 쇳덩이 하나가 플레이어를 조준해 떨어진다. 옆으로 비켜서면 성공.
 * 좌표는 필드 크기와 무관한 비율(0~1)이다. 쇳덩이는 스폰 순간의 플레이어 x 를 향해 떨어지고,
 * 낙하 시간은 배율로 나눈다. 바닥을 지나갈 때 겹치면 실패, 지나가면 그 순간 성공.
 * 시간 초과도 성공이다 (registry 의 succeedOnTimeout).
 */

const PLAYER_W = 0.12;
const OBJECT_W = 0.16;
/** 플레이어가 서 있는 높이 띠 (y 비율) — 이 사이에 쇳덩이 아랫면이 들어오면 충돌을 본다 */
const PLAYER_TOP = 0.78;
const PLAYER_BOTTOM = 0.94;
const SPAWN_DELAY = 0.3;
const KEY_SPEED = 1.3; // 필드 폭 / 초

export function DodgeFall({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState(0.5);
  const [obj, setObj] = useState<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState<Outcome | null>(null);

  const playerRef = useRef(0.5);
  const targetRef = useRef<number | null>(null); // 포인터가 가리키는 x
  const keysRef = useRef({ left: false, right: false });
  const doneRef = useRef(false);

  const finish = (ok: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(ok ? 'success' : 'fail');
    if (ok) onSuccess();
    else onFail();
  };

  useEffect(() => {
    const fallSeconds = 1.4 / speedMultiplier;
    const t0 = performance.now();
    let last = t0;
    let aimX: number | null = null;
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;

      // 플레이어 이동: 포인터가 있으면 그쪽으로 빠르게 따라가고, 키보드는 일정 속도로
      let px = playerRef.current;
      if (targetRef.current !== null) px += (targetRef.current - px) * Math.min(1, dt * 18);
      if (keysRef.current.left) px -= KEY_SPEED * dt;
      if (keysRef.current.right) px += KEY_SPEED * dt;
      px = Math.max(PLAYER_W / 2, Math.min(1 - PLAYER_W / 2, px));
      playerRef.current = px;
      setPlayer(px);

      // 쇳덩이: 스폰 순간 플레이어를 조준하고 그대로 떨어진다
      if (t >= SPAWN_DELAY) {
        if (aimX === null) aimX = px;
        const y = -0.15 + ((t - SPAWN_DELAY) / fallSeconds) * 1.3; // -0.15 → 1.15
        setObj({ x: aimX, y });
        if (!doneRef.current) {
          const overlap = Math.abs(aimX - px) < (PLAYER_W + OBJECT_W) / 2;
          const bottom = y + 0.08;
          if (bottom >= PLAYER_TOP && bottom <= PLAYER_BOTTOM && overlap) finish(false);
          else if (bottom > PLAYER_BOTTOM) finish(true);
        }
        if (y > 1.2) return; // 화면 밖으로 나갔다
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keysRef.current.left = down;
      else if (k === 'arrowright' || k === 'd') keysRef.current.right = down;
      else return;
      e.preventDefault();
    };
    const keyDown = onKey(true);
    const keyUp = onKey(false);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedMultiplier]);

  const pointTo = (e: React.PointerEvent) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetRef.current = (e.clientX - rect.left) / rect.width;
  };

  // 착지 그림자: 쇳덩이가 내려올수록 진하고 작아진다 — "여기 떨어진다" 예고
  const fallP = obj ? Math.max(0, Math.min(1, (obj.y + 0.15) / 1.0)) : 0;

  return (
    <div
      ref={fieldRef}
      data-testid="game-dodge-fall"
      data-player-x={player.toFixed(3)}
      data-object-x={obj ? obj.x.toFixed(3) : ''}
      data-object-y={obj ? obj.y.toFixed(3) : ''}
      data-done={done ?? ''}
      onPointerMove={pointTo}
      onPointerDown={pointTo}
      className="site-sky relative h-full w-full cursor-none touch-none overflow-hidden"
    >
      <Instruction>옆으로 피해!</Instruction>

      {/* 크레인 · 건물 · 바닥 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="#1e1b3a">
          <rect x="0" y="200" width="90" height="180" /><rect x="110" y="150" width="60" height="230" /><rect x="640" y="170" width="70" height="210" /><rect x="730" y="120" width="70" height="260" />
        </g>
        <g stroke="#f2b46b" strokeWidth="4" fill="none" opacity="0.9">
          <path d="M60 0 v0 M60 20 h380" /><path d="M60 20 v-20" /><path d="M120 20 l40 -20 M180 20 l40 -20 M240 20 l40 -20 M300 20 l40 -20 M360 20 l40 -20" />
        </g>
        <rect x="0" y="376" width="800" height="24" fill="#3d3a48" />
        <rect x="0" y="372" width="800" height="6" fill="#6b6780" />
        <rect x="0" y="380" width="800" height="8" fill="url(#df-hazard)" />
        <defs>
          <pattern id="df-hazard" width="40" height="8" patternUnits="userSpaceOnUse"><rect width="40" height="8" fill="#f2b46b" /><path d="M0 8 L20 0 L40 0 L20 8 Z" fill="#1f2937" /></pattern>
        </defs>
      </svg>

      {/* 착지 그림자 */}
      {obj && !done && (
        <div
          className="absolute h-[2.5%] -translate-x-1/2 rounded-[100%] bg-black"
          style={{ left: `${obj.x * 100}%`, top: `${PLAYER_BOTTOM * 100 - 0.5}%`, width: `${OBJECT_W * 100 * (1.4 - fallP * 0.5)}%`, opacity: 0.15 + fallP * 0.55 }}
        />
      )}

      {/* 쇳덩이 — 잔상 두 개가 위에 남는다 */}
      {obj && (
        <div className="absolute -translate-x-1/2" style={{ left: `${obj.x * 100}%`, top: `${obj.y * 100}%`, width: `${OBJECT_W * 100}%` }}>
          {[0.5, 0.25].map((o, i) => (
            <svg key={i} viewBox="0 0 100 100" className="absolute inset-x-0 top-0 w-full" style={{ opacity: o * 0.35, transform: `translateY(${-(i + 1) * 22}px) scaleX(${1 - (i + 1) * 0.08})` }} aria-hidden>
              <path d="M22 40 H78 L92 92 H8 Z" fill="#7c8698" />
            </svg>
          ))}
          <svg viewBox="0 0 100 100" className="relative w-full drop-shadow-[0_12px_10px_rgba(0,0,0,0.5)]" aria-hidden>
            <defs>
              <linearGradient id="df-iron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9d2dd" /><stop offset="0.5" stopColor="#6b7684" /><stop offset="1" stopColor="#2b323d" /></linearGradient>
            </defs>
            <path d="M50 4 a11 11 0 1 1 -0.1 0 M50 14 a5 5 0 1 0 0.1 0" fill="none" stroke="#3b4350" strokeWidth="6" />
            <path d="M22 40 H78 L92 92 H8 Z" fill="url(#df-iron)" stroke="#1f2937" strokeWidth="2" />
            <text x="50" y="76" textAnchor="middle" fontSize="26" fontWeight="900" fill="#1f2937" fontFamily="var(--font-display)">1t</text>
          </svg>
        </div>
      )}

      {/* 플레이어: 안전모를 쓴 작업자 */}
      <div
        className="absolute -translate-x-1/2"
        style={{ left: `${player * 100}%`, top: `${(PLAYER_TOP - 0.1) * 100}%`, width: `${PLAYER_W * 100}%`, height: `${(PLAYER_BOTTOM - PLAYER_TOP + 0.1) * 100}%` }}
      >
        <div className="absolute inset-x-[15%] -bottom-1 h-2 rounded-[100%] bg-black/35" />
        <Person className={`h-full w-full transition-transform ${done === 'fail' ? 'rotate-90 scale-y-75' : ''}`} pose={done === 'fail' ? 'fall' : done === 'success' ? 'cheer' : 'stand'} shirt="#2563eb" hat="#facc15" />
      </div>

      <Hint>마우스 · 드래그 · ← → · A D</Hint>
    </div>
  );
}
