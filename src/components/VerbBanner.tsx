/**
 * 중앙 지시어 팝업. 0.6초 동안만 떠 있으므로 한눈에 읽히는 것이 전부다 —
 * 아주 큰 글씨, 튀어나오는 애니메이션, 뒤는 단색으로 비운다.
 */
export function VerbBanner({ verb, stage }: { verb: string; stage: number }) {
  return (
    <div
      data-testid="verb-banner"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-rush-yellow text-rush-bg"
    >
      <span className="text-sm font-black tracking-[0.35em] opacity-60">STAGE {stage}</span>
      <h2
        key={verb + stage}
        className="animate-pop text-[clamp(3.5rem,14vw,9rem)] leading-none font-black tracking-tight drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]"
      >
        {verb}
      </h2>
    </div>
  );
}
