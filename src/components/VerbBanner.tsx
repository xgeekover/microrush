import type { LucideIcon } from 'lucide-react';
import type { InputKind } from '../games/types';
import { INPUT_LABELS } from '../games/types';

interface VerbBannerProps {
  verb: string;
  stage: number;
  icon?: LucideIcon;
  input?: InputKind;
}

/**
 * 중앙 지시어. 0.6초 동안만 떠 있으므로 한눈에 읽히는 것이 전부다 —
 * 아주 큰 글씨, 튀어나오는 애니메이션, 뒤는 단색으로 비운다. 아이콘과 조작 종류를 곁들여
 * 처음 보는 게임이라도 손이 먼저 가게 한다.
 */
export function VerbBanner({ verb, stage, icon: Icon, input }: VerbBannerProps) {
  return (
    <div
      data-testid="verb-banner"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 overflow-hidden bg-rush-yellow text-rush-bg"
    >
      <div aria-hidden className="verb-burst absolute inset-0" />
      <span className="chip-dark relative">stage {stage}</span>
      {Icon && (
        <Icon
          aria-hidden
          className="animate-pop relative size-16 sm:size-24"
          strokeWidth={2.25}
          style={{ animationDelay: '40ms' }}
        />
      )}
      <h2
        key={verb + stage}
        className="animate-pop relative font-display text-[clamp(4rem,16vw,11rem)] leading-none tracking-tight drop-shadow-[0_8px_0_rgba(0,0,0,0.18)]"
      >
        {verb}
      </h2>
      {input && (
        <span className="chip-dark animate-rise relative" style={{ animationDelay: '120ms' }}>
          {INPUT_LABELS[input]}
        </span>
      )}
    </div>
  );
}
