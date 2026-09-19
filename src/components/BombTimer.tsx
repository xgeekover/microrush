import { Flame } from 'lucide-react';
import type { CSSProperties } from 'react';

interface BombTimerProps {
  /** 남은 시간 비율 1 → 0 */
  ratio: number;
  /** 플레이 중일 때만 불꽃이 탄다 */
  active: boolean;
  /**
   * 시간 초과로 도화선이 다 탄 순간 true — 불꽃 자리에서 펑 연출을 한 번 재생한다.
   * RESULT 동안 계속 true 로 두면 된다 (애니메이션은 forwards 라 반복되지 않는다).
   */
  exploded?: boolean;
}

type BombState = 'idle' | 'burning' | 'popped';

/** 이 비율 아래로는 붉게 변하고 불꽃이 급해진다 */
const URGENT_RATIO = 0.2;

/** 스파크·파편이 인라인 style 로 받는 커스텀 프로퍼티 */
type BombVars = CSSProperties & Record<`--bomb-${string}`, string>;

/** 스파크의 도착 지점(px)·지연·주기. 모듈 상수라 프레임마다 새로 만들지 않는다 */
const SPARK_STYLES: readonly BombVars[] = [
  { '--bomb-dx': '-14px', '--bomb-dy': '-22px', '--bomb-delay': '0s', '--bomb-dur': '0.6s' },
  { '--bomb-dx': '10px', '--bomb-dy': '-26px', '--bomb-delay': '0.15s', '--bomb-dur': '0.7s' },
  { '--bomb-dx': '18px', '--bomb-dy': '-14px', '--bomb-delay': '0.3s', '--bomb-dur': '0.5s' },
  { '--bomb-dx': '-20px', '--bomb-dy': '-10px', '--bomb-delay': '0.42s', '--bomb-dur': '0.65s' },
  { '--bomb-dx': '3px', '--bomb-dy': '-30px', '--bomb-delay': '0.55s', '--bomb-dur': '0.8s' },
];

/** 펑 파편 — 사방으로 흩어진다 (아래·좌우로 나가는 것은 컨테이너에서 잘린다) */
const SHARD_STYLES: readonly BombVars[] = [
  { '--bomb-dx': '-26px', '--bomb-dy': '-20px' },
  { '--bomb-dx': '-8px', '--bomb-dy': '-30px' },
  { '--bomb-dx': '12px', '--bomb-dy': '-28px' },
  { '--bomb-dx': '28px', '--bomb-dy': '-12px' },
  { '--bomb-dx': '22px', '--bomb-dy': '10px' },
  { '--bomb-dx': '-22px', '--bomb-dy': '8px' },
];

/**
 * 화면 하단의 도화선. 남은 길이가 남은 시간이고, 끝에서 불꽃이 타들어가며 스파크가 튄다.
 * 마지막 20% 는 붉게 변하고 불꽃이 다급해진다. 시간 초과(exploded)면 작은 펑.
 *
 * 프레임마다 재렌더되므로 계산은 곱셈 몇 개, 배열은 모듈 상수. 움직이는 요소는 `.bomb-fuse` 의 width 와
 * `.bomb-head` 의 left 둘뿐이고 불꽃·스파크는 그 컨테이너 안에 정적으로 놓인다.
 */
export function BombTimer({ ratio, active, exploded = false }: BombTimerProps) {
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  const pct = exploded ? 0 : clamped * 100;
  const state: BombState = exploded ? 'popped' : active ? 'burning' : 'idle';
  const urgent = exploded || clamped < URGENT_RATIO;

  return (
    <div
      data-testid="bomb-timer"
      data-ratio={ratio.toFixed(3)}
      data-state={state}
      data-urgent={urgent || undefined}
      className="bomb-timer"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label="남은 시간"
    >
      {/* 탄 자리 (배경) */}
      <div aria-hidden className="bomb-bar" />
      {/* 남은 도화선 */}
      <div aria-hidden className="bomb-fuse" style={{ width: `${pct}%` }} />
      {/* 불꽃 위치 컨테이너 — 이것만 프레임마다 움직인다 */}
      <div aria-hidden className="bomb-head" style={{ left: `${pct}%` }}>
        {state === 'burning' && (
          <>
            <span className="bomb-ember" />
            <Flame className="bomb-flame bomb-flame--outer" />
            <Flame className="bomb-flame bomb-flame--inner" />
            {SPARK_STYLES.map((style, i) => (
              <span key={i} data-testid="bomb-spark" className="bomb-spark" style={style} />
            ))}
          </>
        )}
        {state === 'popped' && (
          <>
            <span data-testid="bomb-pop" className="bomb-pop" />
            {SHARD_STYLES.map((style, i) => (
              <span key={i} className="bomb-shard" style={style} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
