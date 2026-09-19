import { CleanScreen } from './catalog/CleanScreen';
import { DodgeFall } from './catalog/DodgeFall';
import { JumpRope } from './catalog/JumpRope';
import { PluckRoot } from './catalog/PluckRoot';
import { PourDrink } from './catalog/PourDrink';
import { RedLightGreen } from './catalog/RedLightGreen';
import { RocketMash } from './catalog/RocketMash';
import { SpotImposter } from './catalog/SpotImposter';
import { StopTheGauge } from './catalog/StopTheGauge';
import type { MicrogameDefinition } from './types';

/**
 * 마이크로게임 등록 목록.
 * 새 게임은 catalog/ 에 컴포넌트를 만들고 여기에 한 줄 추가하면 끝이다 — 그 순간부터 랜덤 추첨 풀에 들어간다.
 */
export const MICROGAMES: readonly MicrogameDefinition[] = [
  {
    id: 'stop-the-gauge',
    verb: '멈춰!',
    description: '바늘이 초록 영역을 지날 때 누른다',
    duration: 3.5,
    component: StopTheGauge,
  },
  {
    id: 'red-light-green-light',
    verb: '눌러!',
    description: '불이 초록으로 바뀌는 순간 누른다 — 빨간불에 누르면 실패',
    duration: 3.2,
    component: RedLightGreen,
  },
  {
    id: 'dodge-fall',
    verb: '피해!',
    description: '위에서 떨어지는 쇳덩이를 옆으로 피한다',
    duration: 3.0,
    succeedOnTimeout: true,
    component: DodgeFall,
  },
  {
    id: 'pluck-root',
    verb: '뽑아!',
    description: '땅에 박힌 무를 잡고 위로 홱 당긴다',
    duration: 3.0,
    component: PluckRoot,
  },
  {
    id: 'clean-screen',
    verb: '닦아!',
    description: '김 서린 창문을 문질러 80% 이상 닦아낸다',
    duration: 3.5,
    component: CleanScreen,
  },
  {
    id: 'pour-drink',
    verb: '채워!',
    description: '차오르는 주스를 점선 사이에서 멈춘다 — 넘치면 실패',
    duration: 3.2,
    component: PourDrink,
  },
  {
    id: 'rocket-mash',
    verb: '연타해!',
    description: '연타로 파워를 채워 로켓을 발사한다',
    duration: 3.5,
    component: RocketMash,
  },
  {
    id: 'spot-imposter',
    verb: '골라내!',
    description: '춤추는 표정 중 하나만 다르다 — 그놈을 누른다',
    duration: 3.0,
    component: SpotImposter,
  },
  {
    id: 'jump-rope',
    verb: '점프!',
    description: '줄이 발밑을 지나는 순간 점프한다',
    duration: 3.0,
    component: JumpRope,
  },
];

/** 직전 게임과 같은 것은 피해서 하나 뽑는다 (게임이 하나뿐이면 그냥 그것). */
export function pickNextGame(previousId: string | null): MicrogameDefinition {
  const pool = MICROGAMES.length > 1 ? MICROGAMES.filter((g) => g.id !== previousId) : MICROGAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}
