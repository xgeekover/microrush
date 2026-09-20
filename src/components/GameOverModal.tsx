import { Crown, Flag, Gauge, RotateCcw, Trophy } from 'lucide-react';

interface GameOverModalProps {
  /** 이번 판 점수 (클리어한 스테이지 수) */
  score: number;
  /** 역대 최고 (이번 판이 반영된 값) */
  best: number;
  /** 도달한 스테이지 번호 */
  stage: number;
  /** 마지막에 도달한 템포 배율 */
  speedMultiplier: number;
  onRestart: () => void;
  onLobby: () => void;
}

/**
 * 게임 오버 화면. 화면 어디를 눌러도 다시 시작한다 — 키(R · Space · Enter)는 GameController 가 듣는다.
 * 카드 안에 점수 · 최고 · 도달 스테이지 · 최고 템포를 모아 보여주고, 다시 도전 / 처음으로 두 버튼을 둔다.
 */
export function GameOverModal({ score, best, stage, speedMultiplier, onRestart, onLobby }: GameOverModalProps) {
  const newBest = score > 0 && score >= best;
  return (
    <div
      data-testid="game-over"
      role="dialog"
      aria-label="게임 오버"
      onClick={onRestart}
      className="h-full w-full cursor-pointer overflow-y-auto overscroll-contain"
    >
      {/* min-h-full 래퍼로 가운데 정렬 — 카드가 화면보다 길어도(가로 폰) 위가 잘리지 않고 스크롤된다 */}
      <div className="flex min-h-full items-center justify-center px-5 py-4 sm:py-6">
      <div className="glass animate-rise w-full max-w-md rounded-[2rem] px-6 py-6 text-center sm:px-8 sm:py-9 [@media(max-height:480px)]:max-w-lg [@media(max-height:480px)]:py-4">
        <p className="text-[11px] font-bold tracking-[0.35em] text-rush-muted [@media(max-height:480px)]:hidden">run ended</p>
        <h2 className="animate-pop mt-1 font-display text-[clamp(2.5rem,min(10vw,14vh),4.5rem)] leading-none text-rush-red drop-shadow-[0_0_28px_rgba(255,77,103,0.5)]">
          GAME OVER
        </h2>

        <div className="mt-5 flex items-end justify-center gap-8 tabular-nums [@media(max-height:480px)]:mt-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-[0.25em] text-rush-muted">SCORE</span>
            <span className="font-display text-6xl leading-none text-rush-yellow drop-shadow-[0_0_20px_rgba(255,214,10,0.4)] [@media(max-height:480px)]:text-5xl" data-testid="final-score">
              {score}
            </span>
          </div>
          <div className="flex flex-col items-center pb-1">
            <span className="text-[10px] font-bold tracking-[0.25em] text-rush-muted">BEST</span>
            <span className="font-display text-4xl leading-none text-rush-ink/85" data-testid="best-score">
              {best}
            </span>
          </div>
        </div>

        {newBest && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rush-yellow/50 bg-rush-yellow/10 px-3 py-1 text-xs font-black tracking-[0.2em] text-rush-yellow">
            <Crown aria-hidden className="size-3.5 fill-current" /> NEW BEST
          </div>
        )}

        {/* 가로 폰(높이 390px)에서는 통계 줄을 접어 버튼까지 한 화면에 들어오게 한다 */}
        <dl className="mt-5 grid grid-cols-2 gap-2 text-left [@media(max-height:480px)]:hidden">
          <Stat icon={Flag} label="도달 스테이지" value={String(stage)} />
          <Stat icon={Gauge} label="최고 템포" value={`×${speedMultiplier.toFixed(2)}`} />
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row [@media(max-height:480px)]:mt-3">
          <button
            type="button"
            data-testid="retry"
            onClick={(e) => {
              e.stopPropagation();
              onRestart();
            }}
            className="btn-primary flex-1"
          >
            <RotateCcw aria-hidden className="size-5" /> 다시 도전 <span className="kbd-hint">R</span>
          </button>
          <button
            type="button"
            data-testid="to-lobby"
            onClick={(e) => {
              e.stopPropagation();
              onLobby();
            }}
            className="btn-ghost"
          >
            <Trophy aria-hidden className="size-4" /> 처음으로
          </button>
        </div>
        <p className="mt-3 text-[11px] text-rush-muted [@media(max-height:480px)]:hidden">화면 아무 곳이나 탭해도 다시 시작</p>
      </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Flag; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/8 text-rush-cyan">
        <Icon aria-hidden className="size-4.5" />
      </span>
      <div className="min-w-0 leading-tight">
        <dt className="text-[10px] font-bold tracking-wider text-rush-muted">{label}</dt>
        <dd className="font-display text-lg text-rush-ink tabular-nums">{value}</dd>
      </div>
    </div>
  );
}
