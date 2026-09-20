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

/** 상단 유리 바: 하트 · 점수/스테이지 · 템포 · 음소거. 노치 아래로 내려앉는다 */
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
  const lastHeart = hearts === 1;

  return (
    <header className="pt-safe relative z-20 shrink-0 px-2 sm:px-4">
      <div className="glass mx-auto mt-2 flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl px-2.5 sm:px-4">
        <div className="flex items-center gap-0.5 sm:gap-1" aria-label={`남은 하트 ${hearts}`} data-testid="hearts" data-count={hearts}>
          {Array.from({ length: RUSH.hearts }, (_, i) => (
            <span key={i} className="relative inline-flex">
              <Heart
                aria-hidden
                className={`size-5 transition-transform sm:size-6 ${
                  i < hearts
                    ? `fill-rush-pink text-rush-pink drop-shadow-[0_0_8px_rgba(255,61,154,0.6)] ${lastHeart ? 'animate-pulse-soft' : ''}`
                    : 'scale-90 text-white/20'
                }`}
              />
              {/* 방금 잃은 하트: 빈 윤곽 위에 깨진 하트 두 조각을 겹쳐 0.6s 동안 갈라져 떨어지게 한다.
                  key 가 hearts 마다 달라 다시 마운트되므로 CSS 애니메이션만으로 매번 재생된다. */}
              {i === lost && (
                <span key={`break-${hearts}`} aria-hidden data-testid="heart-break" className="pointer-events-none absolute inset-0">
                  <HeartCrack className="fx-heart-break-l absolute inset-0 size-5 fill-rush-pink text-rush-pink sm:size-6" />
                  <HeartCrack className="fx-heart-break-r absolute inset-0 size-5 fill-rush-pink text-rush-pink sm:size-6" />
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 items-end gap-3 whitespace-nowrap sm:gap-5">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[9px] font-bold tracking-[0.2em] text-rush-muted sm:text-[10px]">SCORE</span>
            <b className="font-display text-xl text-rush-yellow tabular-nums sm:text-2xl" data-testid="score">
              {score}
            </b>
          </div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[9px] font-bold tracking-[0.2em] text-rush-muted sm:text-[10px]">STAGE</span>
            <b className="font-display text-xl text-rush-ink tabular-nums sm:text-2xl" data-testid="stage">
              {stage}
            </b>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            data-testid="speed"
            className={`flex h-8 items-center gap-1 rounded-full border px-2 text-xs font-black tabular-nums sm:px-2.5 ${
              speedMultiplier > 1
                ? 'border-rush-cyan/60 bg-rush-cyan/10 text-rush-cyan shadow-[0_0_14px_rgba(34,227,255,0.35)]'
                : 'border-white/15 text-rush-muted'
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
            className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5 text-rush-ink/80 transition hover:bg-white/12 hover:text-white active:scale-95 sm:size-11"
          >
            {muted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
