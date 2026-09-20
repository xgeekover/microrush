import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

/** 게임이 요구하는 조작의 종류 — 로비 카드와 지시어 배너에 라벨로 보여준다 */
export type InputKind = 'tap' | 'hold' | 'drag' | 'move' | 'mash' | 'pick' | 'keys';

export const INPUT_LABELS: Record<InputKind, string> = {
  tap: '탭',
  hold: '홀드',
  drag: '드래그',
  move: '좌우',
  mash: '연타',
  pick: '고르기',
  keys: '화살표',
};

/**
 * 모든 마이크로게임이 받는 표준 Props.
 * 게임은 이 넷만 알고, 하트·점수·템포 같은 바깥 상태는 전혀 모른다.
 */
export interface MicrogameProps {
  /** 성공을 한 번 알린다. 두 번 불러도 첫 번째만 인정된다. */
  onSuccess: () => void;
  /** 실패를 한 번 알린다. */
  onFail: () => void;
  /** 남은 시간 비율. 시작 1 → 시간 초과 0. 매 프레임 갱신된다. */
  timeRemainingRatio: number;
  /** 템포 배율. 1.0 에서 시작해 5스테이지마다 오른다. 게임 내부 속도에 곱해 쓴다. */
  speedMultiplier: number;
}

export type Outcome = 'success' | 'fail';

export interface MicrogameDefinition {
  /** 고유 id (연속 중복 추첨을 피하는 데 쓴다) */
  id: string;
  /** 0.6초 동안 큰 글씨로 뜨는 단일 지시어 — "눌러!", "멈춰!" */
  verb: string;
  /** 로비 목록에 보여줄 한 줄 설명 */
  description: string;
  /** 로비 카드 · 지시어 배너의 아이콘 (lucide) */
  icon: LucideIcon;
  /** 어떤 조작인지 — 지시어와 함께 보여줘 첫 판에도 손이 먼저 간다 */
  input: InputKind;
  /** 기본 제한 시간(초). 실제 시간은 speedMultiplier 로 나눈 값이다. */
  duration: number;
  /**
   * 시간이 다 됐을 때의 판정. 기본은 실패("제때 못 눌렀다").
   * "피해!" 처럼 끝까지 버티는 게 목표인 게임은 true 로 둔다.
   */
  succeedOnTimeout?: boolean;
  component: ComponentType<MicrogameProps>;
}
