import { ArrowCode } from './catalog/ArrowCode';
import { BalancePole } from './catalog/BalancePole';
import { ChargeThrow } from './catalog/ChargeThrow';
import { CleanScreen } from './catalog/CleanScreen';
import { CountThem } from './catalog/CountThem';
import { DodgeFall } from './catalog/DodgeFall';
import { GoalKeeper } from './catalog/GoalKeeper';
import { JumpRope } from './catalog/JumpRope';
import { PluckRoot } from './catalog/PluckRoot';
import { PourDrink } from './catalog/PourDrink';
import { RedLightGreen } from './catalog/RedLightGreen';
import { RocketMash } from './catalog/RocketMash';
import { ShellGame } from './catalog/ShellGame';
import { SpotImposter } from './catalog/SpotImposter';
import { StopTheGauge } from './catalog/StopTheGauge';
import { SwatFly } from './catalog/SwatFly';
import { TurnCrank } from './catalog/TurnCrank';
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
    duration: 4.0,
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
  {
    id: 'balance-pole',
    verb: '세워!',
    description: '쓰러지려는 막대를 반대쪽을 눌러 버틴다',
    duration: 3.0,
    succeedOnTimeout: true,
    component: BalancePole,
  },
  {
    id: 'swat-fly',
    verb: '잡아!',
    description: '칸을 옮겨 다니는 파리를 때린다',
    duration: 3.2,
    component: SwatFly,
  },
  {
    id: 'goal-keeper',
    verb: '막아!',
    description: '공이 날아오는 구역으로 골키퍼를 옮긴다',
    duration: 3.0,
    component: GoalKeeper,
  },
  {
    id: 'count-them',
    verb: '세어!',
    description: '튀는 사과가 몇 개인지 고른다',
    duration: 3.5,
    component: CountThem,
  },
  {
    id: 'shell-game',
    verb: '찾아!',
    description: '섞인 컵 중 공이 든 컵을 고른다',
    duration: 3.5,
    component: ShellGame,
  },
  {
    id: 'turn-crank',
    verb: '돌려!',
    description: '밸브를 두 바퀴 돌린다 — 원을 그리며 드래그',
    duration: 3.5,
    component: TurnCrank,
  },
  {
    id: 'arrow-code',
    verb: '열어!',
    description: '자물쇠의 화살표를 순서대로 입력한다',
    duration: 3.5,
    component: ArrowCode,
  },
  {
    id: 'charge-throw',
    verb: '던져!',
    description: '누르고 있다가 파워가 바구니에 맞을 때 놓는다',
    duration: 3.2,
    component: ChargeThrow,
  },
];

/** 이만큼 최근에 나온 게임은 다시 뽑지 않는다 (풀이 작으면 가능한 만큼만) */
export const RECENT_EXCLUDE = 3;

/**
 * 최근에 나온 게임들을 피해서 하나 뽑는다. 직전 하나만 피하면 17종에서도 같은 게임이
 * 두세 판 걸러 자주 돌아오므로, 최근 3개를 빼고 균등 추첨한다.
 */
export function pickNextGame(recentIds: readonly string[]): MicrogameDefinition {
  const avoid = new Set(recentIds.slice(-RECENT_EXCLUDE));
  const pool = MICROGAMES.filter((g) => !avoid.has(g.id));
  const from = pool.length > 0 ? pool : MICROGAMES;
  return from[Math.floor(Math.random() * from.length)];
}
