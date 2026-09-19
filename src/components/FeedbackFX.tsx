import { Star } from 'lucide-react';
import type { CSSProperties, JSX } from 'react';
import type { Outcome } from '../games/types';

/*
 * RESULT 순간(0.8s)의 연출. GameController 가 phase === 'RESULT' 동안 마운트한다.
 *
 * - 문구 'SUCCESS!' / 'MISS!' / '♥ −1' 와 data-testid="result" · data-outcome 은 검증 스크립트가
 *   읽으므로 바꾸지 않는다.
 * - 화면 쉐이크(.fx-shake)는 여기서 걸지 않는다 — 컨트롤러 루트에 거는 것은 Queen 의 몫이다.
 * - 애니메이션은 전부 CSS(src/styles/fx.css). 마운트 한 번에 한 번씩 재생되고 JS 타이머는 없다.
 */

/** 파티클 커스텀 프로퍼티 — fx.css 의 @keyframes fx-particle 이 읽는다 */
type ParticleVars = CSSProperties & Record<'--fx-dx' | '--fx-dy' | '--fx-rot' | '--fx-delay', string>;

interface Particle {
  shape: 'star' | 'square';
  /** 중앙에서의 목적지(px). CSS cos()/sin() 대신 여기서 미리 계산해 둔다. */
  dx: number;
  dy: number;
  rotDeg: number;
  delayMs: number;
  /** Tailwind 색/크기 클래스 — 정적 스캔이 잡을 수 있게 문자열 그대로 둔다 */
  color: string;
  size: string;
}

const PARTICLE_COUNT = 12;
/** 팝업 카드(데스크톱에서 폭 ~580px) 바깥까지 확실히 빠져나가도록 190~330px */
const PARTICLE_DISTS = [220, 300, 190, 270, 240, 330, 205];
const PARTICLE_DELAYS = [0, 60, 30, 90, 15, 120, 45];
const PARTICLE_COLORS = ['text-rush-yellow', 'text-rush-cyan', 'text-rush-pink', 'text-white', 'text-rush-green'];

/**
 * 결정적 파티클 배열 — 난수를 쓰지 않아 매 판 같은 모양이고 스크린샷 비교가 안정적이다.
 * 각도는 균등 분포에 살짝 어긋남을 주고, 거리·지연·색은 서로 다른 주기로 순환시켜 규칙적으로 보이지 않게 한다.
 */
const PARTICLES: readonly Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i): Particle => {
  const angleDeg = (i * 360) / PARTICLE_COUNT + (i % 2 ? 9 : -7);
  const rad = (angleDeg * Math.PI) / 180;
  const dist = PARTICLE_DISTS[i % PARTICLE_DISTS.length];
  return {
    shape: i % 3 === 2 ? 'square' : 'star', // 별 8 · 네온 사각 4
    dx: Math.round(Math.cos(rad) * dist),
    dy: Math.round(Math.sin(rad) * dist),
    rotDeg: (i % 2 ? 1 : -1) * (180 + i * 25),
    delayMs: PARTICLE_DELAYS[i % PARTICLE_DELAYS.length],
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    size: i % 3 === 0 ? 'size-8' : 'size-6',
  };
});

const POPUP_BASE =
  'fx-pop rounded-3xl border-8 border-black/30 px-10 py-5 text-[clamp(2.5rem,9vw,5.5rem)] leading-none font-black tracking-tight shadow-[0_10px_0_rgba(0,0,0,0.35)]';

/** 성공/실패 판정 순간의 전체 화면 피드백 */
export function ResultOverlay({ outcome }: { outcome: Outcome }): JSX.Element {
  const success = outcome === 'success';
  return (
    <div
      data-testid="result"
      data-outcome={outcome}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    >
      {success ? (
        <>
          {/* 가장자리 초록 플래시 */}
          <div aria-hidden className="fx-edge-flash absolute inset-0" />
          <div className={`${POPUP_BASE} relative bg-rush-green text-rush-bg`}>SUCCESS!</div>
          {/* 파티클 — 카드가 넓어 뒤에 두면 가려지므로 DOM 상 뒤(= 화면 앞)에 둔다 */}
          <div aria-hidden className="absolute inset-0">
            {PARTICLES.map((p, i) => (
              <ParticleSprite key={i} particle={p} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* 붉은 비네트 플래시 */}
          <div aria-hidden className="fx-vignette absolute inset-0" />
          <div className="relative flex flex-col items-center gap-3">
            <div className={`${POPUP_BASE} bg-rush-red text-white`}>MISS!</div>
            <div className="fx-heart-loss text-2xl font-black text-white drop-shadow">♥ −1</div>
          </div>
        </>
      )}
    </div>
  );
}

/** 파티클 하나. 위치·이동은 전부 CSS 변수로 넘기고 모양만 여기서 고른다. */
function ParticleSprite({ particle: p }: { particle: Particle }) {
  const style: ParticleVars = {
    '--fx-dx': `${p.dx}px`,
    '--fx-dy': `${p.dy}px`,
    '--fx-rot': `${p.rotDeg}deg`,
    '--fx-delay': `${p.delayMs}ms`,
  };
  if (p.shape === 'star') {
    return (
      <Star
        data-testid="fx-particle"
        className={`fx-particle ${p.size} ${p.color} fill-current drop-shadow-[0_0_6px_currentColor]`}
        style={style}
      />
    );
  }
  return (
    <span
      data-testid="fx-particle"
      className={`fx-particle ${p.size} ${p.color} block rounded-[3px] bg-current shadow-[0_0_10px_currentColor]`}
      style={style}
    />
  );
}
