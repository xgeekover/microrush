import { RotateCcw } from 'lucide-react';

interface GameOverModalProps {
  /** 이번 판 점수 (클리어한 스테이지 수) */
  score: number;
  /** 역대 최고 (이번 판이 반영된 값) */
  best: number;
  onRestart: () => void;
}

/**
 * 게임 오버 화면. 화면 어디를 눌러도 다시 시작한다 — 키(R · Space · Enter)는 GameController 가 듣는다.
 * button 은 블록 요소를 담을 수 없어 div 로 둔다.
 */
export function GameOverModal({ score, best, onRestart }: GameOverModalProps) {
  const newBest = score > 0 && score >= best;
  return (
    <div
      data-testid="game-over"
      role="dialog"
      aria-label="게임 오버"
      onClick={onRestart}
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <h2 className="animate-pop text-[clamp(3rem,12vw,7rem)] leading-none font-black tracking-tight text-rush-red drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]">
        GAME OVER
      </h2>
      <div className="flex items-end gap-8 font-black tabular-nums">
        <div>
          <div className="text-xs tracking-widest text-white/60">SCORE</div>
          <div className="text-6xl text-rush-yellow" data-testid="final-score">
            {score}
          </div>
        </div>
        <div>
          <div className="text-xs tracking-widest text-white/60">BEST</div>
          <div className="text-4xl text-white/80" data-testid="best-score">
            {best}
          </div>
        </div>
      </div>
      {newBest && <div className="animate-blink text-xl font-black text-rush-yellow">★ NEW BEST ★</div>}
      <button
        type="button"
        data-testid="retry"
        onClick={(e) => {
          e.stopPropagation();
          onRestart();
        }}
        className="flex items-center gap-2 rounded-full bg-rush-pink px-6 py-3 text-lg font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.35)] transition active:translate-y-1 active:shadow-none"
      >
        <RotateCcw aria-hidden className="size-5" /> 다시 도전 (R · Space · 탭)
      </button>
    </div>
  );
}
