import { useRef, useState } from 'react';
import { capturePointer, useOutcome } from '../hooks';
import type { MicrogameProps } from '../types';
import { Hint, Instruction } from '../ui';

/*
 * 뽑아! — 땅에 박힌 거대한 무를 잡고 위로 홱 당긴다.
 * 무를 누른 채 위로 80px(빠를수록 좋다: 700ms 안에) 끌면 쑥 빠지며 성공. 느리게 끌면 도로 박힌다.
 * 시간 초과는 실패(부모가 판정).
 *
 * 그림: 하늘(해 · 구름) → 먼 언덕 → 흙(질감) → 풀 → 구멍 → 무(SVG). 무는 땅 아래가 clip-path 로 가려져 있고,
 * 당기는 만큼 clip 이 내려가며 몸통이 흙 밖으로 드러난다.
 */

const PULL_PX = 80;
/** 이 시간 안에 80px 을 못 채우면 무가 미끄러져 되돌아간다 (템포가 오르면 더 짧아진다) */
const PULL_WINDOW_MS = 700;

/** 무 SVG(160×260)를 150px 폭으로 그린다 → 244px 높이. 땅 표면은 SVG y=120 → 화면 112px */
const RADISH_W = 150;
const RADISH_H = 244;
const GROUND_IN_RADISH = 112;
/** 땅 표면의 컨테이너 기준 높이 (아래에서) */
const GROUND = '36%';

const LEAF_ANGLES = [-42, -21, 0, 21, 42];
const CRUMBS = [-70, -42, -18, 6, 30, 54, 78];
const TUFTS = Array.from({ length: 26 }, (_, i) => i);

export function PluckRoot({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const { done, finish, isDone } = useOutcome(onSuccess, onFail);
  const [pull, setPull] = useState(0); // 0 → 80px 위로 당긴 거리
  const [slipped, setSlipped] = useState(0); // 미끄러진 횟수 (흔들림 연출 key)
  const drag = useRef<{ id: number; startY: number; startAt: number } | null>(null);

  const windowMs = PULL_WINDOW_MS / speedMultiplier;

  const onDown = (e: React.PointerEvent) => {
    if (isDone() || drag.current) return;
    capturePointer(e);
    drag.current = { id: e.pointerId, startY: e.clientY, startAt: performance.now() };
  };

  const release = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    if (!isDone()) {
      setPull(0);
      setSlipped((n) => n + 1);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || isDone()) return;
    const dy = d.startY - e.clientY; // 위로 끌면 양수
    const elapsed = performance.now() - d.startAt;
    if (elapsed > windowMs) {
      // 너무 느리다 — 무가 미끄러져 도로 박힌다. 다시 잡아 당길 수 있다.
      drag.current = null;
      setPull(0);
      setSlipped((n) => n + 1);
      return;
    }
    const p = Math.max(0, Math.min(PULL_PX, dy));
    setPull(p);
    if (p >= PULL_PX) {
      drag.current = null;
      finish(true);
    }
  };

  const success = done === 'success';
  const lift = success ? 300 : pull * 0.55; // 성공하면 하늘로
  const buried = Math.max(0, RADISH_H - GROUND_IN_RADISH - lift); // 아직 흙 속에 있는 높이
  const strain = pull / PULL_PX; // 0~1, 당기는 정도 — 구멍 · 금 · 기울기에 쓴다

  return (
    <div
      data-testid="game-pluck-root"
      data-pull={pull.toFixed(0)}
      data-done={done ?? ''}
      className="relative h-full w-full select-none overflow-hidden bg-[linear-gradient(180deg,#4fb0ff_0%,#9fd6ff_48%,#e4f3ff_100%)]"
    >
      <Instruction>잡고 위로 홱!</Instruction>

      {/* 해 · 구름 */}
      <div aria-hidden className="absolute top-[7%] right-[12%] size-20 rounded-full bg-[radial-gradient(circle,#fffbe0_0%,#ffe27a_45%,rgba(255,226,122,0)_72%)]" />
      <Cloud className="top-[14%] left-[6%] w-44 opacity-95" />
      <Cloud className="top-[27%] right-[22%] w-28 opacity-80" />

      {/* 먼 언덕 — 뒤에 낮고 넓은 것 하나, 앞에 둘. 지평선 띠가 언덕 사이 틈을 막는다 */}
      <div aria-hidden className="absolute -left-[20%] bottom-[34%] h-[14%] w-[140%] rounded-[100%] bg-[linear-gradient(180deg,#b5e28d,#7cc466)]" />
      <div aria-hidden className="absolute -left-[12%] bottom-[33%] h-[24%] w-[70%] rounded-[100%] bg-[linear-gradient(180deg,#8fd06a,#5fae4f)]" />
      <div aria-hidden className="absolute -right-[18%] bottom-[34%] h-[20%] w-[70%] rounded-[100%] bg-[linear-gradient(180deg,#a5db7b,#6db85a)]" />
      <div aria-hidden className="absolute inset-x-0 h-4 bg-[linear-gradient(180deg,#6cb95a,#4e9d3c)]" style={{ bottom: `calc(${GROUND} - 2px)` }} />

      {/* 흙 — 질감은 games.css 의 .pluck-soil */}
      <div aria-hidden className="pluck-soil absolute inset-x-0 bottom-0" style={{ height: GROUND }} />

      {/* 구멍 · 흙더미 · 금: 당길수록 벌어진다 */}
      <div aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `calc(${GROUND} - 10px)` }}>
        <div className="absolute left-1/2 h-9 w-52 -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_50%_35%,#8f6a3c,#5a3a1c_70%)] opacity-90" />
        <div
          className="absolute left-1/2 h-6 -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-[#1d1108] transition-[width,opacity] duration-100"
          style={{ width: `${104 + strain * 44}px`, opacity: 0.55 + strain * 0.45 }}
        />
        {[-1, 1].map((s) => (
          <span
            key={s}
            className="absolute top-0 h-0.5 origin-left rounded-full bg-[#2a1a0b] transition-opacity duration-100"
            style={{ left: `${s * 46}px`, width: `${30 + strain * 40}px`, transform: `rotate(${s * (18 + strain * 10)}deg) scaleX(${s})`, opacity: strain > 0.08 ? 0.7 : 0 }}
          />
        ))}
      </div>

      {/* 풀 — 땅 표면을 따라 늘어선 풀잎 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 flex justify-between px-1" style={{ bottom: `calc(${GROUND} - 3px)` }}>
        {TUFTS.map((i) => (
          <svg key={i} viewBox="0 0 24 22" className="h-5 w-6 text-[#4e9d3c]" style={{ transform: `scaleX(${i % 2 ? -1 : 1}) translateY(${i % 3}px)` }}>
            <path d="M3 22 C5 15 5 9 3 2 C9 8 9 15 9 22 M10 22 C10 12 13 6 16 0 C15 8 14 15 13 22 M15 22 C16 16 19 12 23 9 C20 14 19 18 18 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ))}
      </div>

      {/* 무: 잡는 곳. 땅 아래는 clip-path 로 가려져 있다 */}
      <button
        type="button"
        aria-label="무를 잡고 위로 끌기"
        data-testid="pluck-target"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={release}
        onPointerCancel={release}
        className={`absolute left-1/2 block cursor-grab touch-none active:cursor-grabbing ${success ? 'transition-transform duration-300 ease-out' : ''}`}
        style={{
          width: RADISH_W,
          height: RADISH_H,
          bottom: `calc(${GROUND} - ${RADISH_H - GROUND_IN_RADISH}px)`,
          transform: `translate(-50%, ${-lift}px) rotate(${success ? -22 : -strain * 6}deg)`,
        }}
      >
        {/* 땅 아래는 그림만 가린다 (clip-path 는 히트 테스트도 잘라내므로 버튼이 아니라 SVG 에 건다) */}
        <svg
          key={slipped}
          viewBox="0 0 160 260"
          className={`block h-full w-full drop-shadow-[0_10px_8px_rgba(0,0,0,0.25)] ${slipped > 0 && !done ? 'animate-[fx-wiggle_0.3s_ease-in-out]' : ''}`}
          style={{ transformOrigin: '50% 45%', clipPath: `inset(0 0 ${buried}px 0)` }}
        >
          <defs>
            <linearGradient id="pr-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9fd46e" />
              <stop offset="0.22" stopColor="#dbeec4" />
              <stop offset="0.45" stopColor="#f9f9f2" />
              <stop offset="1" stopColor="#e2dfd0" />
            </linearGradient>
            <linearGradient id="pr-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.2" />
              <stop offset="0.32" stopColor="#fff" stopOpacity="0.38" />
              <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.24" />
            </linearGradient>
            <linearGradient id="pr-leaf" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#3c8a2e" />
              <stop offset="1" stopColor="#95d85a" />
            </linearGradient>
          </defs>
          {/* 잎: 뒤에 짙고 넓은 부채, 앞에 밝은 다섯 장 — 두 겹이라 풍성하다 */}
          {[-56, -32, -8, 16, 40, 62].map((a) => (
            <path key={`back-${a}`} d="M80 124 C60 100 46 66 56 30 C70 58 84 92 80 124 Z" fill="#4a9a38" stroke="#2c6a22" strokeWidth="1.2" transform={`rotate(${a} 80 124) scale(0.92) translate(7 10)`} />
          ))}
          {LEAF_ANGLES.map((a) => (
            <g key={a} transform={`rotate(${a} 80 122)`}>
              <path d="M80 122 C66 96 52 62 58 18 C72 46 82 84 80 122 Z" fill="url(#pr-leaf)" stroke="#2f6f25" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M80 120 C74 92 66 60 60 24" fill="none" stroke="#2f6f25" strokeWidth="1.2" strokeOpacity="0.55" />
              <path d="M74 96 C68 90 64 86 60 84 M70 70 C64 66 61 63 58 62" fill="none" stroke="#2f6f25" strokeWidth="0.9" strokeOpacity="0.4" />
            </g>
          ))}
          {/* 몸통 */}
          <path
            d="M44 116 C36 152 40 202 60 236 C68 250 76 258 80 260 C84 258 92 250 100 236 C120 202 124 152 116 116 C106 106 54 106 44 116 Z"
            fill="url(#pr-body)"
            stroke="#8f9483"
            strokeWidth="2"
          />
          <path d="M44 116 C36 152 40 202 60 236 C68 250 76 258 80 260 C84 258 92 250 100 236 C120 202 124 152 116 116 C106 106 54 106 44 116 Z" fill="url(#pr-side)" />
          {/* 가로 주름 · 잔뿌리 · 흙 얼룩 */}
          {[150, 176, 202].map((y) => (
            <path key={y} d={`M50 ${y} Q80 ${y + 9} 110 ${y}`} fill="none" stroke="#c8c6b4" strokeWidth="1.6" strokeOpacity="0.9" />
          ))}
          <path d="M58 196 l-11 7 M104 186 l11 9 M72 244 l-7 9 M92 240 l6 10" fill="none" stroke="#b9b39c" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="66" cy="222" rx="9" ry="4" fill="#8a6a3a" opacity="0.35" />
          <ellipse cx="98" cy="238" rx="7" ry="3" fill="#8a6a3a" opacity="0.3" />
        </svg>
      </button>

      {/* 흙 파편: 미끄러질 때 조금, 성공하면 많이 */}
      {(success || slipped > 0) && (
        <div key={`crumbs-${slipped}-${done ?? ''}`} aria-hidden className="pointer-events-none absolute left-1/2" style={{ bottom: `calc(${GROUND} - 4px)` }}>
          {(success ? CRUMBS : CRUMBS.slice(2, 5)).map((dx, i) => (
            <span
              key={dx}
              className="fx-particle absolute rounded-[2px] bg-[#5b3a1a]"
              style={
                {
                  width: `${6 + (i % 3) * 3}px`,
                  height: `${5 + ((i + 1) % 3) * 3}px`,
                  '--fx-dx': `${dx}px`,
                  '--fx-dy': `${success ? -110 - (i % 3) * 40 : -40 - (i % 2) * 20}px`,
                  '--fx-rot': `${180 + i * 40}deg`,
                  '--fx-delay': `${i * 15}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {success && (
        <p className="animate-pop absolute inset-x-0 top-[26%] text-center font-display text-7xl text-white drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]">
          쑥!
        </p>
      )}

      <Hint>{success ? '뽑았다!' : slipped > 0 ? '더 빠르게, 홱!' : '무를 누른 채 위로 드래그'}</Hint>
    </div>
  );
}

/** 뭉게구름 — 둥근 덩어리 셋 */
function Cloud({ className }: { className: string }) {
  return (
    <div aria-hidden className={`absolute ${className}`}>
      <div className="relative h-10">
        <span className="absolute bottom-0 left-0 h-7 w-[45%] rounded-full bg-white/95" />
        <span className="absolute bottom-0 left-[22%] h-10 w-[46%] rounded-full bg-white" />
        <span className="absolute bottom-0 right-0 h-6 w-[40%] rounded-full bg-white/95" />
        <span className="absolute inset-x-[6%] bottom-0 h-3 rounded-full bg-white" />
      </div>
    </div>
  );
}
