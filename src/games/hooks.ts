import { useCallback, useEffect, useRef, useState } from 'react';
import type { Outcome } from './types';

/**
 * 마이크로게임의 판정 한 번 보장.
 * finish(ok) 는 첫 호출만 인정하고, 그 뒤로는 무시된다. done 은 화면 연출용 상태.
 * isDone() 은 이벤트 핸들러·rAF 루프에서 "이미 끝났나" 를 렌더 없이 묻는 용도다.
 */
export function useOutcome(onSuccess: () => void, onFail: () => void) {
  const [done, setDone] = useState<Outcome | null>(null);
  const doneRef = useRef(false);
  const finish = useCallback(
    (ok: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setDone(ok ? 'success' : 'fail');
      if (ok) onSuccess();
      else onFail();
    },
    [onSuccess, onFail],
  );
  const isDone = useCallback(() => doneRef.current, []);
  return { done, finish, isDone };
}

/**
 * Space / Enter 를 "누르기" 로 듣는다 (키 반복 무시). 핸들러는 ref 로 최신 것을 부르므로
 * 매 렌더 새 함수를 넘겨도 리스너가 다시 등록되지 않는다.
 */
export function usePressKey(handler: () => void, keys: readonly string[] = ['Space', 'Enter']) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (keys.includes(e.code) || keys.includes(e.key)) {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // keys 는 호출처마다 상수다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** 매 프레임 콜백(dt 초, 경과 초). 언마운트나 stop() 뒤에는 돌지 않는다. */
export function useFrameLoop(callback: (dt: number, elapsed: number) => void, active = true) {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    const loop = (now: number) => {
      // rAF 의 첫 타임스탬프는 effect 가 잡은 t0 보다 앞설 수 있다 → 음수 경과를 막는다
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = Math.max(last, now);
      ref.current(dt, Math.max(0, (now - t0) / 1000));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/**
 * 포인터 캡처를 시도한다. 합성 이벤트(테스트 봇)나 이미 끝난 포인터에는 setPointerCapture 가 예외를 던지는데,
 * 캡처는 "요소 밖으로 나가도 계속 추적" 하기 위한 보조일 뿐이라 실패해도 게임은 이어져야 한다.
 */
export function capturePointer(e: React.PointerEvent): void {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // 무시
  }
}
