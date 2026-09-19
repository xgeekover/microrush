import { Heart, HeartCrack, Volume2, VolumeX, Zap } from 'lucide-react';
import { useState } from 'react';
import { RUSH } from '../core/config';

interface HUDProps {
  hearts: number;
  score: number;
  stage: number;
  speedMultiplier: number;
  muted: boolean;
  onToggleMute: () => void;
}

/** 상단 한 줄: 하트 · 스테이지 · 점수 · 템포 · 음소거 */
export function HUD({ hearts, score, stage, speedMultiplier, muted, onToggleMute }: HUDProps) {
  // 직전 hearts 와 비교해 어느 하트가 방금 빠졌는지 알아낸다 (빠진 하트의 인덱스 = 새 hearts 값).
  // 렌더 중 조건부 setState 는 React 가 문서화한 "이전 렌더 정보 저장" 패턴 — effect 없이 즉시 반영되고,
  // hearts 가 그대로인 동안 lost 가 유지되어 재렌더가 끼어도 깨짐 애니메이션이 끊기지 않는다.
  // hearts 가 늘어난 경우(새 판)는 lost = -1 이라 애니메이션 없이 즉시 채워진다.
  const [seen, setSeen] = useState({ hearts, lost: -1 });
  if (seen.hearts !== hearts) {
    setSeen({ hearts, lost: hearts < seen.hearts ? hearts : -1 });
  }
  const lost = seen.hearts === hearts ? seen.lost : -1;

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-black/40 bg-black/30 px-3 py-2 text-white sm:gap-3 sm:px-4">
      <div className="flex items-center gap-1" aria-label={`남은 하트 ${hearts}`} data-testid="hearts" data-count={hearts}>
        {Array.from({ length: RUSH.hearts }, (_, i) => (
          <span key={i} className="relative inline-flex">
            <Heart
              aria-hidden
              className={`size-6 transition-transform sm:size-7 ${
                i < hearts ? 'fill-rush-pink text-rush-pink drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]' : 'scale-90 text-white/25'
              }`}
            />
            {/* 방금 잃은 하트: 빈 윤곽 위에 깨진 하트 두 조각을 겹쳐 0.6s 동안 갈라져 떨어지게 한다.
                key 가 hearts 마다 달라 다시 마운트되므로 CSS 애니메이션만으로 매번 재생된다. */}
            {i === lost && (
              <span key={`break-${hearts}`} aria-hidden data-testid="heart-break" className="pointer-events-none absolute inset-0">
                <HeartCrack className="fx-heart-break-l absolute inset-0 size-6 fill-rush-pink text-rush-pink sm:size-7" />
                <HeartCrack className="fx-heart-break-r absolute inset-0 size-6 fill-rush-pink text-rush-pink sm:size-7" />
              </span>
            )}
          </span>
        ))}
      </div>

      {/* 390px 폰에서는 라벨을 줄여 한 줄에 다 들어가게 한다 (넘치면 음소거 버튼이 화면 밖으로 밀린다) */}
      <div className="flex min-w-0 items-baseline gap-3 font-black tabular-nums whitespace-nowrap sm:gap-4">
        <span className="text-xs tracking-wider text-white/60 sm:text-sm sm:tracking-widest">
          <span className="hidden sm:inline">STAGE</span>
          <span className="sm:hidden">ST</span> <b className="text-lg text-white" data-testid="stage">{stage}</b>
        </span>
        <span className="text-xs tracking-wider text-white/60 sm:text-sm sm:tracking-widest">
          <span className="hidden sm:inline">SCORE</span>
          <span className="sm:hidden">SC</span> <b className="text-lg text-rush-yellow" data-testid="score">{score}</b>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          data-testid="speed"
          className={`flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-xs font-black ${
            speedMultiplier > 1 ? 'border-rush-cyan text-rush-cyan' : 'border-white/30 text-white/50'
          }`}
        >
          <Zap aria-hidden className="hidden size-3.5 fill-current sm:inline" />×{speedMultiplier.toFixed(2)}
        </span>
        <button
          type="button"
          aria-label={muted ? '소리 켜기' : '음소거'}
          aria-pressed={muted}
          data-testid="mute"
          onClick={(e) => {
            onToggleMute();
            e.currentTarget.blur(); // 포커스가 남으면 Space 가 게임 입력 대신 이 버튼을 누른다
          }}
          className="rounded-full border-2 border-white/30 p-1.5 text-white/70 transition hover:border-white hover:text-white"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </header>
  );
}
