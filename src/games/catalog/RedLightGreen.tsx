import { useEffect, useRef, useState } from 'react';
import type { MicrogameProps, Outcome } from '../types';
import { Hint, Instruction } from '../ui';

type Light = 'red' | 'green';

/**
 * 눌러! — 빨간불에서 기다리다가 초록으로 바뀌는 순간 누른다.
 * 빨간불에 누르면 실패, 초록을 놓치고 시간이 다 되면 실패(부모가 판정).
 * 초록이 켜지는 시점은 무작위이고, 템포가 오르면 더 늦게(짧은 창) 켜진다.
 */
export function RedLightGreen({ onSuccess, onFail, speedMultiplier }: MicrogameProps) {
  const [light, setLight] = useState<Light>('red');
  const [done, setDone] = useState<Outcome | null>(null);
  const lightRef = useRef<Light>('red');
  const doneRef = useRef(false);

  // 초록이 켜질 때까지의 대기: 0.5~1.6초를 배율로 나눈다. 제한 시간(3.2s/배율) 안에는 반드시 켜진다.
  useEffect(() => {
    const delay = (500 + Math.random() * 1100) / speedMultiplier;
    const t = window.setTimeout(() => {
      lightRef.current = 'green';
      setLight('green');
    }, delay);
    return () => window.clearTimeout(t);
  }, [speedMultiplier]);

  const press = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const ok = lightRef.current === 'green';
    setDone(ok ? 'success' : 'fail');
    if (ok) onSuccess();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const green = light === 'green';

  return (
    <div
      data-testid="game-red-light-green-light"
      data-light={light}
      data-done={done ?? ''}
      onPointerDown={press}
      className="street-night relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden"
    >
      <Instruction>{green ? '지금!' : '초록을 기다려…'}</Instruction>

      {/* 도시 실루엣 · 도로 */}
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <g fill="#0b1024">
          <rect x="0" y="150" width="70" height="80" /><rect x="80" y="110" width="50" height="120" /><rect x="140" y="170" width="90" height="60" />
          <rect x="560" y="120" width="60" height="110" /><rect x="630" y="160" width="80" height="70" /><rect x="720" y="100" width="80" height="130" />
        </g>
        <g fill="#f5d67a" opacity="0.5">
          {[12, 30, 92, 104, 574, 590, 740, 760, 780].map((x, i) => <rect key={i} x={x} y={130 + (i % 4) * 22} width="8" height="6" />)}
        </g>
        <rect x="0" y="230" width="800" height="170" fill="#262a33" />
        <rect x="0" y="228" width="800" height="6" fill="#4b5563" />
        {[0, 120, 240, 360, 480, 600, 720].map((x) => <rect key={x} x={x + 20} y="312" width="70" height="8" fill="#e5e7eb" opacity="0.8" />)}
      </svg>

      {/* 신호등 */}
      <svg viewBox="0 0 140 300" className="relative h-[68%] max-h-[420px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]" aria-hidden>
        <defs>
          <linearGradient id="rl-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a3f4a" /><stop offset="0.5" stopColor="#1f2329" /><stop offset="1" stopColor="#0f1216" />
          </linearGradient>
          <radialGradient id="rl-red-on" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#ffb3b3" /><stop offset="0.5" stopColor="#ff3b4a" /><stop offset="1" stopColor="#8f0d18" /></radialGradient>
          <radialGradient id="rl-green-on" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#d6ffe9" /><stop offset="0.5" stopColor="#34e29a" /><stop offset="1" stopColor="#0f6b46" /></radialGradient>
        </defs>
        <rect x="62" y="220" width="16" height="80" fill="url(#rl-body)" />
        <rect x="20" y="4" width="100" height="220" rx="16" fill="url(#rl-body)" stroke="#0a0c10" strokeWidth="2" />
        {[
          { cy: 46, on: !green, onFill: 'url(#rl-red-on)', off: '#3a1418', glow: 'rgba(255,59,74,0.85)' },
          { cy: 114, on: false, onFill: '#ffd60a', off: '#3a3010', glow: '' },
          { cy: 182, on: green, onFill: 'url(#rl-green-on)', off: '#12301f', glow: 'rgba(52,226,154,0.85)' },
        ].map((l) => (
          <g key={l.cy}>
            <path d={`M38 ${l.cy - 30} a32 14 0 0 1 64 0 v6 a32 14 0 0 1 -64 0 z`} fill="#0f1216" />
            <circle cx="70" cy={l.cy} r="26" fill="#0a0c10" />
            <circle cx="70" cy={l.cy} r="23" fill={l.on ? l.onFill : l.off} className={l.on ? 'animate-flash' : ''} style={l.on && l.glow ? { filter: `drop-shadow(0 0 16px ${l.glow})` } : undefined} />
            {l.on && <ellipse cx="62" cy={l.cy - 9} rx="8" ry="4" fill="rgba(255,255,255,0.5)" />}
          </g>
        ))}
      </svg>

      {done === 'fail' && (
        <p className="animate-pop absolute inset-x-0 top-[40%] text-center font-display text-6xl text-rush-red drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]">
          너무 빨라!
        </p>
      )}
      <Hint>{done === 'fail' ? '빨간불에 눌렀어…' : done === 'success' ? '딱 맞았어!' : 'Space · 클릭 · 탭'}</Hint>
    </div>
  );
}
