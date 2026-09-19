import { Gamepad2, Play, Zap } from 'lucide-react';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { BombTimer } from '../components/BombTimer';
import { GameOverModal } from '../components/GameOverModal';
import { ResultOverlay } from '../components/FeedbackFX';
import { HUD } from '../components/HUD';
import { SpeedUpBanner } from '../components/SpeedUpBanner';
import { VerbBanner } from '../components/VerbBanner';
import { MICROGAMES, pickNextGame } from '../games/registry';
import type { MicrogameDefinition, Outcome } from '../games/types';
import { RUSH, playDurationMs, speedMultiplierFor } from './config';
import { SoundManager } from './SoundManager';
import { loadBest, loadSettings, saveBest, saveSettings } from '../utils/storage';
import { useGameLoop } from './useGameLoop';

/*
 * 코어 루프 상태 머신.
 *
 *   LOBBY ─START─▶ READY(0.6s 지시어) ─▶ PLAYING(3~4s) ─▶ RESULT(0.8s 팡파르) ─┬─▶ READY (다음 게임)
 *                                                                              ├─▶ SPEED_UP(1.2s) ─▶ READY   (5클리어마다)
 *                                                                              └─▶ GAMEOVER (하트 0)  ─START─▶ READY
 *
 * 전환은 전부 reducer 한 곳에서 일어난다. 마이크로게임이 onSuccess/onFail 을 몇 번 부르든
 * PLAYING 이 아닐 때 들어온 RESOLVE 는 무시되므로 판정은 스테이지당 정확히 한 번이다.
 */

type Phase = 'LOBBY' | 'READY' | 'PLAYING' | 'RESULT' | 'SPEED_UP' | 'GAMEOVER';

interface RushState {
  phase: Phase;
  hearts: number;
  /** 클리어한 스테이지 수 */
  score: number;
  /** 지금 스테이지 번호 (1부터) */
  stage: number;
  /** 템포가 오른 횟수 */
  speedLevel: number;
  game: MicrogameDefinition | null;
  outcome: Outcome | null;
  /** 이번 판정이 도화선이 다 타서 났는가 (펑 연출용) */
  timedOut: boolean;
  /** 판정 순간의 남은 시간 비율 — RESULT 동안 도화선을 그 자리에 멎게 한다 */
  frozenRatio: number;
  best: number;
}

type Action =
  | { type: 'START'; game: MicrogameDefinition }
  | { type: 'PLAY' }
  | { type: 'RESOLVE'; outcome: Outcome; ratio: number; timedOut?: boolean }
  | { type: 'RESULT_DONE'; nextGame: MicrogameDefinition }
  | { type: 'SPEED_UP_DONE' };

function initialState(): RushState {
  return {
    phase: 'LOBBY',
    hearts: RUSH.hearts,
    score: 0,
    stage: 0,
    speedLevel: 0,
    game: null,
    outcome: null,
    timedOut: false,
    frozenRatio: 1,
    best: loadBest(),
  };
}

function reducer(s: RushState, a: Action): RushState {
  switch (a.type) {
    case 'START':
      return { ...initialState(), best: s.best, phase: 'READY', game: a.game, stage: 1 };
    case 'PLAY':
      return s.phase === 'READY' ? { ...s, phase: 'PLAYING' } : s;
    case 'RESOLVE': {
      if (s.phase !== 'PLAYING') return s;
      const success = a.outcome === 'success';
      return {
        ...s,
        phase: 'RESULT',
        outcome: a.outcome,
        timedOut: a.timedOut ?? false,
        frozenRatio: a.ratio,
        hearts: success ? s.hearts : s.hearts - 1,
        score: success ? s.score + 1 : s.score,
      };
    }
    case 'RESULT_DONE': {
      if (s.phase !== 'RESULT') return s;
      if (s.hearts <= 0) return { ...s, phase: 'GAMEOVER', best: Math.max(s.best, s.score) };
      const speedUp = s.outcome === 'success' && s.score % RUSH.stagesPerSpeedUp === 0;
      if (speedUp) return { ...s, phase: 'SPEED_UP', speedLevel: s.speedLevel + 1, game: a.nextGame, outcome: null };
      return { ...s, phase: 'READY', game: a.nextGame, stage: s.stage + 1, outcome: null };
    }
    case 'SPEED_UP_DONE':
      return s.phase === 'SPEED_UP' ? { ...s, phase: 'READY', stage: s.stage + 1 } : s;
  }
}

export function GameController() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  // 음소거는 저장되는 설정 — 첫 렌더에서 한 번 읽고, 바뀔 때마다 저장한다
  const [muted, setMuted] = useState(() => loadSettings().muted);
  const [sound] = useState(() => new SoundManager());

  const { phase, game, outcome, stage, score, hearts, speedLevel, timedOut, frozenRatio, best } = state;
  const speed = speedMultiplierFor(speedLevel);

  // 한 판의 시계. 도화선 비율을 매 프레임 주고, 째깍 시점과 시간 초과를 알린다.
  const { ratio, getRatio } = useGameLoop({
    active: phase === 'PLAYING' && game !== null,
    durationMs: game ? playDurationMs(game.duration, speed) : 0,
    speedMultiplier: speed,
    onTick: (r) => sound.tick(r),
    onTimeout: () =>
      dispatch({ type: 'RESOLVE', outcome: game?.succeedOnTimeout ? 'success' : 'fail', ratio: 0, timedOut: true }),
  });


  useEffect(() => () => sound.dispose(), [sound]);
  useEffect(() => {
    sound.setMuted(muted);
    saveSettings({ muted });
  }, [sound, muted]);

  const start = useCallback(() => {
    sound.unlock();
    dispatch({ type: 'START', game: pickNextGame(null) });
  }, [sound]);

  // 마이크로게임에 넘기는 판정 콜백. 참조가 바뀌지 않으므로 게임이 effect 의존성에 넣어도 안전하다.
  // 판정 순간의 도화선 길이는 렌더된 값(최대 1프레임 늦음)이 아니라 시계에서 직접 읽는다.
  const onSuccess = useCallback(() => dispatch({ type: 'RESOLVE', outcome: 'success', ratio: getRatio() }), [getRatio]);
  const onFail = useCallback(() => dispatch({ type: 'RESOLVE', outcome: 'fail', ratio: getRatio() }), [getRatio]);

  // 오디오 컨텍스트는 탭 전환·iOS 인터럽트로 suspended 가 될 수 있다. 어떤 입력이든, 탭이 돌아오든 다시 깨운다 (idempotent).
  useEffect(() => {
    const wake = () => sound.unlock();
    const onVisible = () => {
      if (!document.hidden) sound.unlock();
    };
    window.addEventListener('pointerdown', wake, true);
    window.addEventListener('keydown', wake, true);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('keydown', wake, true);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sound]);

  // RESULT 동안 화면에 남아 있는(멎은) 게임에 키가 새지 않게 캡처 단계에서 막는다.
  // 게임은 window 의 버블 단계에서 듣는다 — 여기서 stopImmediatePropagation 하면 닿지 않는다.
  useEffect(() => {
    if (phase !== 'RESULT' && phase !== 'SPEED_UP') return;
    const block = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' || e.metaKey || e.ctrlKey || e.altKey) return; // 음소거·브라우저 단축키는 통과
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', block, true);
    window.addEventListener('keyup', block, true);
    return () => {
      window.removeEventListener('keydown', block, true);
      window.removeEventListener('keyup', block, true);
    };
  }, [phase]);

  // M 은 어느 phase 에서든 음소거 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'm') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 개발 빌드에서만 사운드 로그 등을 열어 둔다 (실측 스크립트용). 프로덕션 번들에는 남지 않는다.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __microrush?: { sound: SoundManager } };
    w.__microrush = { sound };
    return () => {
      delete w.__microrush;
    };
  }, [sound]);

  // READY: 지시어를 0.6초 보여주고 플레이로
  useEffect(() => {
    if (phase !== 'READY') return;
    sound.alert();
    const t = window.setTimeout(() => dispatch({ type: 'PLAY' }), RUSH.readyMs);
    return () => window.clearTimeout(t);
  }, [phase, stage, sound]);

  // RESULT: 팡파르 0.8초 뒤 다음으로
  useEffect(() => {
    if (phase !== 'RESULT') return;
    // 도화선이 다 탄 경우: 펑이 먼저, 판정음은 80ms 뒤에 (겹치면 펑이 묻힌다)
    const delay = timedOut ? 0.08 : 0;
    if (timedOut) sound.fusePop();
    if (outcome === 'success') sound.success(delay);
    else sound.fail(delay);
    const t = window.setTimeout(
      () => dispatch({ type: 'RESULT_DONE', nextGame: pickNextGame(game?.id ?? null) }),
      RUSH.resultMs,
    );
    return () => window.clearTimeout(t);
  }, [phase, outcome, timedOut, game, sound]);

  // SPEED_UP: 연출 1.2초
  useEffect(() => {
    if (phase !== 'SPEED_UP') return;
    sound.speedUp();
    const t = window.setTimeout(() => dispatch({ type: 'SPEED_UP_DONE' }), RUSH.speedUpMs);
    return () => window.clearTimeout(t);
  }, [phase, sound]);

  // GAMEOVER: 기록 저장
  useEffect(() => {
    if (phase !== 'GAMEOVER') return;
    sound.gameOver();
    saveBest(best);
  }, [phase, best, sound]);

  // 로비 · 게임오버의 키 입력 (플레이 중 키는 각 마이크로게임이 듣는다)
  useEffect(() => {
    if (phase !== 'LOBBY' && phase !== 'GAMEOVER') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const isStart = e.code === 'Space' || e.key === 'Enter' || (phase === 'GAMEOVER' && e.key.toLowerCase() === 'r');
      if (!isStart) return;
      e.preventDefault();
      start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start]);

  const Game = game?.component ?? null;
  const showGame = Game && (phase === 'PLAYING' || phase === 'RESULT');

  return (
    <div
      data-phase={phase}
      className={`flex h-full flex-col bg-rush-bg ${phase === 'RESULT' && outcome === 'fail' ? 'fx-shake' : ''}`}
    >
      <HUD
        hearts={hearts}
        score={score}
        stage={stage}
        speedMultiplier={speed}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {phase === 'LOBBY' && <Lobby best={best} onStart={start} />}

        {showGame && game && Game && (
          <div className={`absolute inset-0 ${phase === 'PLAYING' ? '' : 'pointer-events-none'}`}>
            <Game
              key={stage}
              onSuccess={onSuccess}
              onFail={onFail}
              timeRemainingRatio={ratio}
              speedMultiplier={speed}
            />
          </div>
        )}

        {phase === 'READY' && game && <VerbBanner verb={game.verb} stage={stage} />}
        {phase === 'RESULT' && outcome && <ResultOverlay outcome={outcome} />}
        {phase === 'SPEED_UP' && <SpeedUpBanner speedMultiplier={speed} />}
        {phase === 'GAMEOVER' && <GameOverModal score={score} best={best} onRestart={start} />}
      </main>

      {/* RESULT 동안은 판정 순간의 길이로 멎어 있고, 도화선이 다 타서 끝났으면 펑 */}
      <BombTimer
        ratio={phase === 'PLAYING' ? ratio : phase === 'RESULT' ? frozenRatio : 1}
        active={phase === 'PLAYING'}
        exploded={phase === 'RESULT' && timedOut}
      />
    </div>
  );
}

function Lobby({ best, onStart }: { best: number; onStart: () => void }) {
  return (
    // 화면 어디든 탭하면 시작. button 은 블록 요소를 담을 수 없어 div 로 둔다 (키보드 시작은 컨트롤러가 듣는다).
    <div
      data-testid="lobby"
      onClick={onStart}
      className="flex h-full w-full cursor-pointer flex-col items-center gap-5 overflow-y-auto px-6 py-6 text-center sm:justify-center"
    >
      <div className="flex items-center gap-3">
        <Zap aria-hidden className="size-14 fill-rush-yellow text-rush-yellow drop-shadow-[0_4px_0_rgba(0,0,0,0.4)]" />
        <h1 className="text-[clamp(3rem,10vw,6rem)] leading-none font-black tracking-tight text-rush-yellow drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]">
          MicroRush
        </h1>
      </div>
      <p className="max-w-md text-base text-white/70">
        3초짜리 마이크로게임이 쉴 새 없이 이어진다. 지시어를 읽고, 바로 해내고, 다음으로. 하트 {RUSH.hearts}개가
        전부 사라지면 끝.
      </p>

      <ul className="grid w-full max-w-4xl grid-cols-2 gap-2 text-left text-xs sm:grid-cols-3 sm:text-sm">
        {MICROGAMES.map((g) => (
          <li key={g.id} className="rounded-2xl border-2 border-white/15 bg-white/5 px-3 py-2 sm:px-4 sm:py-3">
            <div className="text-base font-black text-rush-cyan sm:text-lg">{g.verb}</div>
            <div className="text-white/70">{g.description}</div>
          </li>
        ))}
      </ul>

      <div className="animate-blink flex items-center gap-2 rounded-full bg-rush-pink px-6 py-3 text-lg font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.35)]">
        <Play aria-hidden className="size-5 fill-current" /> SPACE / 탭하여 시작
      </div>

      <p className="text-xs text-white/50">
        <Gamepad2 aria-hidden className="mr-1 inline size-4" />
        조작: Space · 클릭 · 탭 = 누르기 / ← → · A D · 마우스 · 드래그 = 이동 / M = 음소거
        {best > 0 && <span className="ml-3 font-black text-rush-yellow">BEST {best}</span>}
      </p>
    </div>
  );
}
