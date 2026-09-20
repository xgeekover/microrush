/**
 * 17종 마이크로게임이 공유하는 화면 조각. 게임마다 배경색이 다르므로 지시문·힌트는
 * 어떤 배경 위에서도 읽히도록 짙은 반투명 알약 안에 넣는다. 게임은 글만 채운다.
 */
import type { ReactNode } from 'react';

/** 위쪽 지시문 — "초록에서 멈춰!" 같은 한 줄. 게임 루트가 positioned 여야 한다 (컨트롤러의 래퍼가 그렇다). */
export function Instruction({ children }: { children: ReactNode }) {
  return (
    <p className="pointer-events-none absolute inset-x-0 top-4 z-10 px-4 text-center sm:top-5">
      <span className="inline-block max-w-full rounded-full border border-white/15 bg-black/40 px-5 py-2 font-display text-xl leading-tight text-white shadow-lg backdrop-blur-md sm:px-6 sm:text-2xl">
        {children}
      </span>
    </p>
  );
}

/** 아래쪽 조작 힌트 — "Space · 클릭 · 탭". 상태에 따라 결과 문구로 바뀌기도 한다. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center">
      <span className="inline-block max-w-full rounded-full bg-black/30 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/85 backdrop-blur-sm sm:text-sm">
        {children}
      </span>
    </p>
  );
}
