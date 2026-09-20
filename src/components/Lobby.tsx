import { Keyboard, Play, Pointer, Sparkles, Trophy, Zap } from 'lucide-react';
import { RUSH, SPEED_STEPS } from '../core/config';
import { MICROGAMES } from '../games/registry';
import { INPUT_LABELS } from '../games/types';

interface LobbyProps {
  best: number;
  onStart: () => void;
}

/**
 * 첫 화면. 위에서부터 제목 → 한 줄 설명 → 세 단계 → 게임 카탈로그 → 조작 안내이고,
 * 시작 버튼은 스크롤과 무관하게 항상 아래에 떠 있다 (폰에서 17장 카드 뒤에 숨지 않게).
 * 화면 어디를 눌러도 시작하되, 카탈로그 안은 읽는 곳이라 눌러도 시작하지 않는다.
 */
export function Lobby({ best, onStart }: LobbyProps) {
  return (
    <div
      data-testid="lobby"
      onClick={onStart}
      className="relative h-full w-full cursor-pointer overflow-y-auto overscroll-contain"
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col items-center gap-6 px-5 pt-6 pb-28 text-center sm:gap-8 sm:pt-10 lg:justify-center [@media(max-height:480px)]:gap-3 [@media(max-height:480px)]:pt-3">
        <header className="animate-rise flex flex-col items-center gap-3">
          <span className="chip">
            <Sparkles aria-hidden className="size-3.5 text-rush-yellow" />
            {MICROGAMES.length} microgames · 3 sec each
          </span>
          <h1 className="flex items-center gap-2 font-display text-[clamp(2.75rem,min(11vw,18vh),7rem)] leading-none tracking-tight sm:gap-3">
            <Zap aria-hidden className="size-[0.8em] fill-rush-yellow text-rush-yellow drop-shadow-[0_0_24px_rgba(255,214,10,0.55)]" />
            <span>
              <span className="text-gradient-hero">Micro</span>
              <span className="text-rush-yellow">Rush</span>
            </span>
          </h1>
          <p className="max-w-md text-balance text-base leading-relaxed text-rush-muted sm:text-lg [@media(max-height:480px)]:text-sm">
            지시어를 읽고, 3초 안에 해내고, 다음으로. 하트 {RUSH.hearts}개가 전부 사라지면 끝.
          </p>
        </header>

        {/* 세 단계 — 목록(li)은 게임 카탈로그에만 쓴다 (검증이 lobby 안 li 를 게임 수로 센다) */}
        <div className="animate-rise grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3 [@media(max-height:480px)]:hidden" style={{ animationDelay: '80ms' }}>
          <Step n={1} title="읽고" desc={`지시어 ${(RUSH.readyMs / 1000).toFixed(1)}초`} />
          <Step n={2} title="해내고" desc="3초 안에" />
          <Step n={3} title="다음!" desc={`${RUSH.stagesPerSpeedUp}판마다 ×${SPEED_STEPS[SPEED_STEPS.length - 1]}까지`} />
        </div>

        <section
          aria-label="마이크로게임 목록"
          onClick={(e) => e.stopPropagation()}
          className="animate-rise w-full cursor-default text-left"
          style={{ animationDelay: '160ms' }}
        >
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="font-display text-xl text-rush-ink">마이크로게임 {MICROGAMES.length}종</h2>
            <span className="text-xs text-rush-muted">매 판 무작위 · 최근 3개는 다시 안 나옴</span>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {MICROGAMES.map((g, i) => {
              const Icon = g.icon;
              return (
                <li
                  key={g.id}
                  className="glass animate-rise flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-white/10"
                  style={{ animationDelay: `${200 + i * 25}ms` }}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/8 text-rush-cyan">
                    <Icon aria-hidden className="size-5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-lg leading-none text-rush-ink">{g.verb}</span>
                      <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rush-muted">
                        {INPUT_LABELS[g.input]}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-rush-muted">{g.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="animate-rise flex flex-wrap items-center justify-center gap-2 text-xs text-rush-muted" style={{ animationDelay: '240ms' }}>
          <span className="chip normal-case tracking-normal">
            <Keyboard aria-hidden className="size-3.5" /> Space · Enter 누르기 &nbsp;·&nbsp; ← → / A D 이동 &nbsp;·&nbsp; 1~9 고르기 &nbsp;·&nbsp; M 음소거
          </span>
          <span className="chip normal-case tracking-normal">
            <Pointer aria-hidden className="size-3.5" /> 탭 누르기 &nbsp;·&nbsp; 드래그 이동
          </span>
        </div>
      </div>

      {/* 항상 보이는 시작 바 — 스크롤 컨테이너 안의 sticky 라 내용이 그 밑으로 지나간다 */}
      <div className="pointer-events-none sticky inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 bg-gradient-to-t from-rush-bg via-rush-bg/85 to-transparent px-5 pt-12 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          data-testid="start"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          className="btn-primary pointer-events-auto px-8 text-lg"
        >
          <Play aria-hidden className="size-5 fill-current" />
          시작하기
          <span className="kbd-hint">Space</span>
        </button>
        {best > 0 && (
          <span className="chip pointer-events-auto border-rush-yellow/40 text-rush-yellow" data-testid="lobby-best">
            <Trophy aria-hidden className="size-3.5" /> best {best}
          </span>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl px-2 py-3 sm:py-4">
      <span className="grid size-7 place-items-center rounded-full bg-rush-pink text-xs font-black text-white shadow-[0_0_18px_rgba(255,61,154,0.55)]">
        {n}
      </span>
      <span className="font-display text-lg leading-none text-rush-ink sm:text-xl">{title}</span>
      <span className="text-[11px] leading-tight text-rush-muted sm:text-xs">{desc}</span>
    </div>
  );
}
