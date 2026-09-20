import { Smile, Weight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MicrogameProps, Outcome } from '../types';
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
      className="relative h-full w-full cursor-none touch-none overflow-hidden bg-gradient-to-b from-sky-900 to-rush-bg"
    >
      <Instruction>옆으로 피해!</Instruction>

      {/* 바닥 */}
      <div className="absolute inset-x-0 bottom-0 h-[6%] bg-rush-panel border-t-4 border-black/40" />

      {/* 쇳덩이 */}
      {obj && (
        <div
          className="absolute flex -translate-x-1/2 items-center justify-center"
          style={{ left: `${obj.x * 100}%`, top: `${obj.y * 100}%`, width: `${OBJECT_W * 100}%` }}
        >
          <Weight className="size-full text-slate-300 drop-shadow-[0_8px_0_rgba(0,0,0,0.5)]" strokeWidth={2.5} />
        </div>
      )}

      {/* 플레이어 */}
      <div
        className={`absolute flex -translate-x-1/2 items-center justify-center rounded-t-3xl rounded-b-lg border-4 border-black/40 ${
          done === 'fail' ? 'bg-rush-red' : done === 'success' ? 'bg-rush-green' : 'bg-rush-yellow'
        }`}
        style={{
          left: `${player * 100}%`,
          top: `${PLAYER_TOP * 100}%`,
          width: `${PLAYER_W * 100}%`,
          height: `${(PLAYER_BOTTOM - PLAYER_TOP) * 100}%`,
        }}
      >
        <Smile className="size-3/4 text-rush-bg" strokeWidth={2.5} />
      </div>

      <Hint>마우스 · 드래그 · ← → · A D</Hint>
    </div>
  );
}
