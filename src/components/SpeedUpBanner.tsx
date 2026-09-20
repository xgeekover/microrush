import { Zap } from 'lucide-react';

interface SpeedUpBannerProps {
  /** 새로 적용되는 템포 배율 — `×1.20` 처럼 보여준다 */
  speedMultiplier: number;
}

/**
 * "SPEED UP!!" 전체 화면 연출. RUSH.speedUpMs(1.2초) 동안만 떠 있다는 전제로 길이를 잡았다:
 * 흰 플래시 0.3초가 걷히는 동안 제목이 줌인 바운스(0.4초)로 튀어나오고,
 * 배율이 0.25초 뒤에 따라 올라온다. 뒤로는 노랑/빨강 대각 줄무늬가 계속 흐른다.
 * 시각 스타일은 src/styles/speedup.css (접두어 su-) 에 있다.
 */
export function SpeedUpBanner({ speedMultiplier }: SpeedUpBannerProps) {
  return (
    <div
      data-testid="speed-up"
      className="su-root absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 overflow-hidden text-white"
    >
      <div aria-hidden className="su-stripes absolute inset-0" />
      <div aria-hidden className="su-flash absolute inset-0" />

      <div className="su-title relative flex items-center gap-4">
        <Zap aria-hidden className="su-bolt size-16 shrink-0 fill-current sm:size-24" />
        <h2 className="su-text font-display text-[clamp(2.6rem,14vw,10rem)] leading-none tracking-tight">SPEED UP!!</h2>
        <Zap aria-hidden className="su-bolt size-16 shrink-0 fill-current sm:size-24" />
      </div>

      <p data-testid="speed-up-multiplier" className="su-mult relative font-display text-[clamp(1.6rem,5vw,3.2rem)] tabular-nums">
        ×{speedMultiplier.toFixed(2)}
      </p>
    </div>
  );
}
