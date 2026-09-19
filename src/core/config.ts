/** 코어 루프의 템포. 전부 여기서 조정한다. */
export const RUSH = {
  /** 시작 하트 */
  hearts: 4,
  /** 지시어("눌러!")가 떠 있는 시간 */
  readyMs: 600,
  /** 성공/실패 피드백 */
  resultMs: 700,
  /** "SPEED UP!!" 배너 */
  speedUpMs: 1000,
  /** 이만큼 클리어할 때마다 템포가 오른다 */
  stagesPerSpeedUp: 5,
  /** 배율로 나눠도 이보다 짧아지지는 않는다 (사람이 반응할 최소 시간) */
  minPlayMs: 1100,
  /** 째깍 간격 하한 — 아무리 급해도 이보다 촘촘히 울리지 않는다 */
  tickMinMs: 60,
} as const;

/** 템포 배율 사다리. 5클리어마다 한 칸 오르고 끝(×2.2)에서 고정된다. */
export const SPEED_STEPS = [1, 1.2, 1.45, 1.7, 1.95, 2.2] as const;

/** speedLevel(템포가 오른 횟수) → 배율. 사다리 끝을 넘으면 마지막 칸에 머문다. */
export function speedMultiplierFor(level: number): number {
  const i = Math.min(Math.max(0, Math.floor(level)), SPEED_STEPS.length - 1);
  return SPEED_STEPS[i];
}

/** 이 게임의 실제 제한 시간(ms) */
export function playDurationMs(baseSeconds: number, speedMultiplier: number): number {
  return Math.max(RUSH.minPlayMs, Math.round((baseSeconds * 1000) / speedMultiplier));
}

/**
 * 째깍 간격 꺾은선의 기준점 [남은 비율, ms]. 오름차순.
 * 여유 있을 땐 느긋하게(1.0 → 500ms), 절반에서 빨라지고(0.5 → 300ms),
 * 마지막 20% 는 다급하게(0.2 → 120ms, 0 → 90ms). 사이는 선형 보간.
 */
const TICK_CURVE: ReadonlyArray<readonly [ratio: number, ms: number]> = [
  [0, 90],
  [0.2, 120],
  [0.5, 300],
  [1, 500],
];

/**
 * 다음 째깍까지의 ms. ratio(남은 비율 1→0)가 줄수록 단조 감소하고, 템포 배율로 나눈다.
 * 하한은 RUSH.tickMinMs. 소리 자체는 SoundManager.tick 이 내고, 간격만 여기서 정한다.
 */
export function tickIntervalMs(ratio: number, speedMultiplier: number): number {
  const r = Math.min(1, Math.max(0, ratio));
  let ms = TICK_CURVE[TICK_CURVE.length - 1][1];
  for (let i = 1; i < TICK_CURVE.length; i++) {
    const [r0, m0] = TICK_CURVE[i - 1];
    const [r1, m1] = TICK_CURVE[i];
    if (r <= r1) {
      ms = m0 + ((r - r0) / (r1 - r0)) * (m1 - m0);
      break;
    }
  }
  const speed = speedMultiplier > 0 ? speedMultiplier : 1;
  return Math.max(RUSH.tickMinMs, ms / speed);
}
