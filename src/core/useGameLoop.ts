import { useCallback, useEffect, useRef, useState } from 'react';
import { tickIntervalMs } from './config';

export interface GameLoopOptions {
  /** PLAYING 동안 true. false 가 되면 즉시 멈춘다. */
  active: boolean;
  /** 이번 판의 제한 시간(ms) — playDurationMs() 결과 */
  durationMs: number;
  /** 째깍 간격을 줄이는 템포 배율 */
  speedMultiplier: number;
  /** 째깍 시점마다 (tickIntervalMs 스케줄). 시작 직후 ratio 1 로 한 번 불린다. */
  onTick: (ratio: number) => void;
  /** ratio 가 0 에 닿는 순간 정확히 한 번 */
  onTimeout: () => void;
}

/**
 * 한 판의 시계. rAF + performance.now() 로 남은 비율(1→0)을 매 프레임 갱신하고,
 * 째깍 스케줄과 시간 초과를 콜백으로 알린다.
 *
 * - 콜백은 ref 로 최신 것을 부르므로 effect 의존성은 active · durationMs · speedMultiplier 만이다.
 *   부모가 매 렌더 새 함수를 넘겨도 루프가 재시작되지 않는다.
 * - active 가 false 면 ratio 는 1 이다. 판이 끝나면(cleanup) 내부 상태도 1 로 되돌려
 *   다음 판의 첫 프레임에 지난 판의 꼬리 값이 비치지 않게 한다.
 * - StrictMode 의 마운트→언마운트→마운트에서도 cleanup 이 rAF 를 취소하므로 루프는 하나만 돈다.
 */
export function useGameLoop({ active, durationMs, speedMultiplier, onTick, onTimeout }: GameLoopOptions): {
  ratio: number;
  /** 지금 이 순간의 남은 비율을 시계에서 직접 읽는다 — 이벤트 핸들러용. 렌더된 ratio 는 최대 1프레임 늦다. */
  getRatio: () => number;
} {
  const [ratio, setRatio] = useState(1);
  // 판이 시작된 시각과 길이. 콜백(getRatio)이 렌더 상태를 거치지 않고 읽는다.
  const clockRef = useRef<{ startAt: number; durationMs: number } | null>(null);

  // 최신 콜백을 담아 두는 ref. 렌더 중에 ref 를 쓰지 않으려 effect 에서 갱신한다 (루프 effect 보다 먼저 선언).
  const onTickRef = useRef(onTick);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTickRef.current = onTick;
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    if (!active) return;

    const startAt = performance.now();
    clockRef.current = { startAt, durationMs };
    let nextTick = startAt; // 첫 프레임에서 바로 째깍
    let timedOut = false;
    let raf = 0;

    const loop = (now: number) => {
      const elapsed = now - startAt;

      if (elapsed >= durationMs) {
        // 시간 초과. 마지막 프레임에는 째깍을 겹치지 않고 타임아웃만 알린다.
        setRatio(0);
        if (!timedOut) {
          timedOut = true;
          onTimeoutRef.current();
        }
        return; // 루프 종료 — 더는 프레임을 예약하지 않는다
      }

      const r = Math.min(1, 1 - elapsed / durationMs); // rAF 타임스탬프가 startAt 보다 앞설 수 있다
      setRatio(r);
      if (now >= nextTick) {
        // 첫 째깍은 정확히 1 로 — 첫 프레임까지 흐른 몇 ms 는 무시한다
        const tickRatio = nextTick === startAt ? 1 : r;
        onTickRef.current(tickRatio);
        nextTick = now + tickIntervalMs(tickRatio, speedMultiplier);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      clockRef.current = null;
      // 다음 판의 첫 프레임이 1 에서 시작하도록 되돌린다 (언마운트 뒤라면 no-op)
      setRatio(1);
    };
  }, [active, durationMs, speedMultiplier]);

  const getRatio = useCallback(() => {
    const clock = clockRef.current;
    if (!clock) return 1;
    return Math.max(0, Math.min(1, 1 - (performance.now() - clock.startAt) / clock.durationMs));
  }, []);

  return { ratio: active ? ratio : 1, getRatio };
}
