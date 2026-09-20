import { useEffect, useRef, useState } from 'react';
import { capturePointer, useFrameLoop, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 돌려! — 밸브를 두 바퀴 돌리면 물이 나온다.
 * 포인터를 누른 채 밸브 주위로 원을 그리면 포인터 각도의 변화량이 회전으로 쌓인다(어느 방향이든).
 * 키보드는 ← → 를 누르고 있으면 초당 한 바퀴. 시간 초과는 실패(부모).
 *
 * 그림: 배관실 벽 → 파이프(SVG: 플랜지 · 볼트 · 밸브 몸통 · 압력계 · 수도꼭지) → 핸드휠(CSS, 회전) → 물줄기.
 * 압력계 바늘이 돌린 만큼 오르고, 두 바퀴를 채우면 꼭지에서 물이 쏟아진다.
 */

const TURNS = 2;
const KEY_DEG_PER_S = 400;
const SPOKES = [0, 45, 90, 135];
const DROPS = [0, 1, 2, 3, 4];

export function TurnCrank({ onSuccess, onFail }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [rotation, setRotation] = useState(0);
  const rot = useRef(0);
  const drag = useRef<{ id: number; lastAngle: number } | null>(null);
  const keyDir = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const add = (deltaDeg: number) => {
    if (isDone()) return;
    rot.current += deltaDeg;
    setRotation(rot.current);
    if (Math.abs(rot.current) >= TURNS * 360) finish(true);
  };

  useFrameLoop((dt) => {
    if (keyDir.current) add(keyDir.current * KEY_DEG_PER_S * dt);
  }, !done);

  useEffect(() => {
    const dirOf = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      return k === 'arrowright' || k === 'd' ? 1 : k === 'arrowleft' || k === 'a' ? -1 : 0;
    };
    const down = (e: KeyboardEvent) => {
      const d = dirOf(e);
      if (!d) return;
      e.preventDefault();
      keyDir.current = d;
    };
    const up = (e: KeyboardEvent) => {
      if (dirOf(e) === keyDir.current) keyDir.current = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const angleOf = (e: React.PointerEvent) => {
    const r = wheelRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onDown = (e: React.PointerEvent) => {
    if (isDone()) return;
    capturePointer(e);
    drag.current = { id: e.pointerId, lastAngle: angleOf(e) };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleOf(e);
    let delta = a - d.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.lastAngle = a;
    add(delta);
  };
  const onUp = () => {
    drag.current = null;
  };

  const progress = Math.min(1, Math.abs(rotation) / (TURNS * 360));
  const success = done === 'success';
  const needleDeg = -100 + progress * 200; // 압력계 바늘: 왼쪽 끝 → 오른쪽 끝

  return (
    <div
      data-testid="game-turn-crank"
      data-rotation={rotation.toFixed(0)}
      data-done={done ?? ''}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="crank-room relative flex h-full w-full cursor-grab touch-none select-none items-center justify-center overflow-hidden active:cursor-grabbing"
    >
      <Instruction>밸브를 두 바퀴!</Instruction>

      {/* 장면: 400×340 좌표계를 화면 폭에 맞춰 비율 유지 */}
      <div className="relative aspect-[400/340] w-[min(92vw,560px)] max-h-[82%]" style={{ containerType: 'inline-size' }}>
        <svg viewBox="0 0 400 340" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="tc-pipe-h" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7c8797" />
              <stop offset="0.22" stopColor="#d5dbe4" />
              <stop offset="0.5" stopColor="#8d97a6" />
              <stop offset="0.85" stopColor="#3f4753" />
              <stop offset="1" stopColor="#2b313a" />
            </linearGradient>
            <linearGradient id="tc-pipe-v" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3f4753" />
              <stop offset="0.25" stopColor="#c9d0da" />
              <stop offset="0.55" stopColor="#7d8796" />
              <stop offset="1" stopColor="#2b313a" />
            </linearGradient>
            <linearGradient id="tc-brass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3d98a" />
              <stop offset="0.5" stopColor="#b8862f" />
              <stop offset="1" stopColor="#6b4a12" />
            </linearGradient>
            <linearGradient id="tc-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fdcff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#2aa7f0" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="tc-gauge" cx="0.4" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#cfd6e0" />
            </radialGradient>
          </defs>

          {/* 벽에 고정한 브래킷 */}
          <rect x="24" y="182" width="352" height="12" rx="3" fill="#1f242c" opacity="0.65" />

          {/* 가로 본관 */}
          <rect x="0" y="176" width="332" height="48" rx="6" fill="url(#tc-pipe-h)" />
          {/* 플랜지 + 볼트 */}
          {[46, 236].map((x) => (
            <g key={x}>
              <rect x={x} y="166" width="26" height="68" rx="4" fill="url(#tc-pipe-v)" stroke="#1f242c" strokeWidth="1.5" />
              {[176, 200, 222].map((y) => (
                <circle key={y} cx={x + 13} cy={y} r="3.2" fill="#e6ebf2" stroke="#3f4753" strokeWidth="1.2" />
              ))}
            </g>
          ))}

          {/* 밸브 몸통(보닛) — 본관 위로 솟은 원통, 그 위에 황동 너트, 스템은 핸드휠 허브 뒤로 들어간다 */}
          <rect x="128" y="126" width="52" height="60" rx="8" fill="url(#tc-pipe-v)" stroke="#1f242c" strokeWidth="1.5" />
          <polygon points="154,110 172,119 172,137 154,146 136,137 136,119" fill="url(#tc-brass)" stroke="#5a3f10" strokeWidth="1.5" />
          <rect x="147" y="92" width="14" height="22" rx="3" fill="url(#tc-pipe-v)" stroke="#1f242c" strokeWidth="1.2" />

          {/* 압력계 */}
          <g transform="translate(300 118)">
            <rect x="-8" y="30" width="16" height="30" rx="3" fill="url(#tc-brass)" stroke="#5a3f10" strokeWidth="1.2" />
            <circle r="34" fill="#2b313a" />
            <circle r="30" fill="url(#tc-gauge)" />
            {Array.from({ length: 11 }, (_, i) => -100 + i * 20).map((a) => (
              <line key={a} x1="0" y1="-26" x2="0" y2={a % 40 === -100 % 40 ? -19 : -22} stroke={a > 60 ? '#e11d48' : '#3f4753'} strokeWidth={a % 40 === -100 % 40 ? 2 : 1.2} transform={`rotate(${a})`} />
            ))}
            <path d="M-22 -14 A26 26 0 0 1 22 -14" fill="none" stroke="#e11d48" strokeWidth="4" strokeDasharray="14 60" strokeDashoffset="-46" opacity="0.9" />
            <line x1="0" y1="6" x2="0" y2="-24" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${needleDeg})`} className="transition-transform duration-75" />
            <circle r="3.5" fill="#1f242c" />
          </g>

          {/* 수도꼭지: 본관 끝에서 둥글게 꺾여 아래로 (굵은 선 하나로 관을 그린다) */}
          <path d="M330 200 h18 a18 18 0 0 1 18 18 v22" fill="none" stroke="#1f242c" strokeWidth="50" strokeLinejoin="round" />
          <path d="M330 200 h18 a18 18 0 0 1 18 18 v22" fill="none" stroke="url(#tc-pipe-h)" strokeWidth="46" strokeLinejoin="round" />
          <rect x="342" y="236" width="48" height="14" rx="4" fill="url(#tc-pipe-v)" stroke="#1f242c" strokeWidth="1.5" />
          <rect x="352" y="248" width="28" height="6" rx="2" fill="#141820" />

          {/* 배수 그레이팅 — 꼭지 아래 바닥 */}
          <rect x="300" y="312" width="94" height="16" rx="4" fill="#12161c" stroke="#3f4753" strokeWidth="1.2" />
          {[310, 322, 334, 346, 358, 370, 382].map((x) => (
            <rect key={x} x={x} y="316" width="4" height="8" rx="1" fill="#2b313a" />
          ))}

          {/* 물: 성공하면 쏟아진다. 그 전에는 돌린 만큼 방울이 맺힌다 */}
          {success ? (
            <g>
              <rect x="356" y="254" width="20" height="60" rx="8" fill="url(#tc-water)" className="tc-stream" />
              <ellipse cx="347" cy="320" rx="52" ry="6" fill="#2aa7f0" opacity="0.5" className="tc-puddle" />
              {DROPS.map((i) => (
                <circle key={i} cx={366 + (i - 2) * 16} cy="312" r="3" fill="#8fdcff" className="tc-splash" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </g>
          ) : (
            <ellipse cx="366" cy={256 + progress * 6} rx={3 + progress * 3} ry={4 + progress * 5} fill="#8fdcff" opacity={0.25 + progress * 0.7} />
          )}
        </svg>

        {/* 핸드휠 — 스템 위. 회전만 프레임마다 바뀐다 (wheelRef 의 중심이 각도 기준) */}
        <div
          ref={wheelRef}
          className="crank-wheel absolute"
          style={{ left: '38.5%', top: '27%', width: '40cqw', height: '40cqw', transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        >
          <div className="crank-rim absolute inset-0 rounded-full" />
          {SPOKES.map((d) => (
            <span key={d} className="crank-spoke absolute inset-y-[9%] left-1/2 w-[9%] -translate-x-1/2" style={{ transform: `translateX(-50%) rotate(${d}deg)` }} />
          ))}
          <div className="crank-hub absolute left-1/2 top-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <span className="crank-nut absolute left-1/2 top-1/2 size-[14%] -translate-x-1/2 -translate-y-1/2" />
          <span className="absolute left-1/2 top-[3%] size-[7%] -translate-x-1/2 rounded-full bg-rush-yellow shadow-[0_0_10px_rgba(255,214,10,0.8)]" />
          <div className="crank-gloss pointer-events-none absolute inset-0 rounded-full" />
        </div>
      </div>

      <Hint>{success ? '콸콸!' : `누른 채 원을 그리며 드래그 · ← → 홀드 (${Math.floor(progress * TURNS * 10) / 10}/${TURNS} 바퀴)`}</Hint>
    </div>
  );
}
