import { Hand, Hourglass } from 'lucide-react';
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
      className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-8 transition-colors duration-100 ${
        green ? 'bg-emerald-950' : 'bg-red-950'
      }`}
    >
      <Instruction>{green ? '지금!' : '초록을 기다려…'}</Instruction>

      <div
        className={`flex size-52 items-center justify-center rounded-full border-[10px] border-black/50 shadow-[0_14px_0_rgba(0,0,0,0.4)] sm:size-64 ${
          green ? 'animate-flash bg-rush-green shadow-[0_0_80px_rgba(45,216,129,0.9)]' : 'bg-rush-red'
        } ${done === 'fail' ? 'grayscale' : ''}`}
      >
        {green ? (
          <Hand className="size-24 text-rush-bg" strokeWidth={2.5} />
        ) : (
          <Hourglass className="size-24 text-white/80" strokeWidth={2.5} />
        )}
      </div>

      <Hint>{done === 'fail' ? '너무 빨랐어!' : done === 'success' ? '딱 맞았어!' : 'Space · 클릭 · 탭'}</Hint>
    </div>
  );
}
