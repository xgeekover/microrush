/**
 * Web Audio API 로 합성하는 효과음. 오디오 파일이 없다.
 *  - tick     : 째깍 (800Hz / 1200Hz 삼각파를 번갈아). ratio < 0.2 이면 'warn' 경고 비프로 바뀐다
 *  - success  : C5 → E5 → G5 사인파 징글
 *  - fail     : 톱니파 130 → 50Hz 하강 버즈 (로우패스로 둔탁하게) + 60Hz thump
 *  - alert    : 지시어 팝업의 묵직한 팝 (노이즈 버스트 + 낮은 사인 thump)
 *  - speedUp  : 사각파 상승 아르페지오 + 트릴 (8비트 치프튠)
 *  - gameOver : 하강 3음 삼각파
 *  - fusePop  : 도화선이 다 탔을 때의 작은 펑
 *
 * 브라우저 자동 재생 정책상 첫 사용자 입력 때 unlock() 으로 컨텍스트를 연다.
 * 모든 노드는 마스터 GainNode(0.6, 음소거면 0) 하나에 물리고, 끝나면 stop + disconnect 로 정리한다.
 * 컨텍스트가 없거나 음소거여도 `log` 에는 이벤트가 남는다 (검증용).
 */

export type SoundEvent = 'tick' | 'warn' | 'success' | 'fail' | 'alert' | 'speedUp' | 'gameOver' | 'fusePop';

export interface SoundLogEntry {
  event: SoundEvent;
  /** performance.now() 기준 ms */
  t: number;
  /** tick / warn 일 때 남은 시간 비율 (1 → 0) */
  ratio?: number;
}

/** 마스터 볼륨. 음소거면 0 */
const MASTER_GAIN = 0.6;
/** 이벤트 로그 링버퍼 크기 */
const LOG_LIMIT = 200;
/** 남은 비율이 이 아래면 째깍이 경고 비프로 바뀐다 */
const WARN_RATIO = 0.2;
/** 감쇠의 바닥 값 — exponentialRamp 는 0 에 닿을 수 없다 (-80dB) */
const FLOOR = 0.0001;
/** 기본 어택 길이(초). 클릭 노이즈를 피할 만큼만 짧게 */
const ATTACK = 0.003;
/** 릴리스 길이(초): 감쇠 끝에서 FLOOR 까지 마저 내려가는 짧은 꼬리 */
const RELEASE = 0.008;
/** 지수 감쇠가 dur 끝에서 도달하는 상대 레벨 (-40dB). 그 뒤 RELEASE 동안 FLOOR 까지 */
const DECAY_END = 0.01;

/**
 * resume/close 는 AudioContext 에만 있다. 검증용으로 OfflineAudioContext 도 주입받기 위해
 * 공통 조상 BaseAudioContext 에 선택 메서드로 얹어 본다.
 */
type AnyAudioContext = BaseAudioContext & {
  resume?: () => Promise<void>;
  close?: () => Promise<void>;
};

interface ToneSpec {
  type: OscillatorType;
  freq: number;
  /** 있으면 dur 동안 이 주파수까지 지수 글라이드 */
  glideTo?: number;
  /** 시작 지연(초) */
  at?: number;
  /** 들리는 길이(초). 이 시점에 -40dB 에 닿고 8ms 뒤 바닥이다 */
  dur: number;
  /** 피크 게인 (마스터 이전) */
  vol: number;
  /** 어택 길이(초). 기본 ATTACK */
  attack?: number;
  /** true 면 지수 감쇠 대신 플랫 서스테인 + 짧은 릴리스 (치프튠 느낌) */
  hold?: boolean;
  /** 있으면 lowpass BiquadFilter(cutoff Hz) 를 거친다 */
  lowpass?: number;
}

interface NoiseSpec {
  at?: number;
  dur: number;
  vol: number;
  lowpass?: number;
}

/**
 * 클릭 없는 볼륨 엔벌로프. FLOOR 에서 선형 어택으로 vol 까지 올린 뒤,
 *  - 기본: 지수 감쇠로 t0 + dur 에 -40dB(vol × DECAY_END), 이어서 RELEASE 동안 FLOOR 까지.
 *          즉 dur 는 "들리는 길이(-40dB 도달)" 다.
 *  - hold: 플랫 서스테인 뒤 RELEASE 동안 FLOOR 까지 — dur 안에서 끝나 다음 음과 겹치지 않는다 (치프튠 게이트).
 * 파라미터가 FLOOR 에 닿는 시각을 돌려준다 (소스 stop 시각용).
 */
function shapeEnvelope(param: AudioParam, t0: number, dur: number, vol: number, attack: number, hold: boolean): number {
  const tEnd = t0 + dur;
  param.setValueAtTime(FLOOR, t0);
  param.linearRampToValueAtTime(vol, t0 + attack);
  if (hold) {
    param.setValueAtTime(vol, Math.max(t0 + attack, tEnd - RELEASE));
    param.exponentialRampToValueAtTime(FLOOR, tEnd);
    return tEnd;
  }
  param.exponentialRampToValueAtTime(vol * DECAY_END, tEnd);
  param.exponentialRampToValueAtTime(FLOOR, tEnd + RELEASE);
  return tEnd + RELEASE;
}

export class SoundManager {
  private readonly createContext: () => BaseAudioContext;
  private ctx: AnyAudioContext | null = null;
  private master: GainNode | null = null;
  /** 노이즈 버스트용 화이트 노이즈 버퍼. 컨텍스트마다 한 번만 만든다 */
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  /** 째깍 토글. false = 800Hz, true = 1200Hz */
  private tickHigh = false;
  private readonly entries: SoundLogEntry[] = [];
  /** 검증용 이벤트 로그 (최근 200개). 음소거·컨텍스트 없음이어도 기록된다. 외부에서는 읽기만 */
  readonly log: ReadonlyArray<SoundLogEntry> = this.entries;

  /** @param createContext 컨텍스트 주입점 (검증에서 OfflineAudioContext 를 넘긴다). 기본은 new AudioContext() */
  constructor(createContext?: () => BaseAudioContext) {
    this.createContext = createContext ?? (() => new AudioContext());
  }

  /** 첫 사용자 입력에서 호출. 컨텍스트를 만들고, 멈춰 있으면 resume. 실패는 조용히 무시한다 */
  unlock(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const ctx: AnyAudioContext = this.createContext();
        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : MASTER_GAIN;
        master.connect(ctx.destination);
        this.ctx = ctx;
        this.master = master;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume?.().catch(() => undefined);
    } catch {
      this.ctx = null; // 오디오를 못 쓰는 환경이면 조용히 포기한다 (로그는 계속 남는다)
      this.master = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const { ctx, master } = this;
    if (!ctx || !master) return;
    // 마스터 게인을 20ms 에 걸쳐 옮겨 툭 소리를 피한다
    const now = ctx.currentTime;
    const gain = master.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(muted ? 0 : MASTER_GAIN, now + 0.02);
  }

  isMuted(): boolean {
    return this.muted;
  }

  dispose(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    void ctx?.close?.().catch(() => undefined);
  }

  /**
   * 째깍 한 번. ratio 1 → 0. 800Hz / 1200Hz 삼각파를 번갈아 낸다 (~35ms).
   * ratio < 0.2 이면 다급한 경고 비프 — 더 높고(1600Hz 사각파 + 옥타브 위) 두 배 길고 조금 크게.
   */
  tick(ratio: number): void {
    if (ratio < WARN_RATIO) {
      this.record('warn', ratio);
      this.tone({ type: 'square', freq: 1600, dur: 0.07, vol: 0.32 });
      this.tone({ type: 'square', freq: 3200, dur: 0.07, vol: 0.1 });
      return;
    }
    this.record('tick', ratio);
    const freq = this.tickHigh ? 1200 : 800;
    this.tickHigh = !this.tickHigh;
    this.tone({ type: 'triangle', freq, dur: 0.035, vol: 0.4 });
  }

  /**
   * 성공 징글: C5 → E5 → G5 사인파, 90ms 간격으로 순차. 마지막 음은 길게 남긴다.
   * @param delay 시작 지연(초) — 도화선 펑 뒤에 울려야 할 때 쓴다
   */
  success(delay = 0): void {
    this.record('success');
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) =>
      this.tone({ type: 'sine', freq, at: delay + i * 0.09, dur: i === notes.length - 1 ? 0.24 : 0.1, vol: 0.45 }),
    );
  }

  /** 실패: 톱니파 130 → 50Hz 하강 버즈 200ms 를 600Hz 로우패스로 둔탁하게, 아래에 60Hz 사인 thump */
  fail(delay = 0): void {
    this.record('fail');
    this.tone({ type: 'sawtooth', freq: 130, glideTo: 50, at: delay, dur: 0.2, vol: 0.55, lowpass: 600 });
    this.tone({ type: 'sine', freq: 60, at: delay, dur: 0.15, vol: 0.5, attack: 0.005 });
  }

  /** 지시어 팝업: 짧고 묵직한 팝 — 로우패스 노이즈 버스트 50ms + 150 → 60Hz 사인 thump 80ms */
  alert(): void {
    this.record('alert');
    this.noise({ dur: 0.05, vol: 0.5, lowpass: 1200 });
    this.tone({ type: 'sine', freq: 150, glideTo: 60, dur: 0.08, vol: 0.6 });
  }

  /** @deprecated alert() 로 이름이 바뀌었다. GameController 통합 전까지 남겨 둔 별칭 */
  verb(): void {
    this.alert();
  }

  /** SPEED UP: 사각파 상승 아르페지오(C5 E5 G5 C6 E6 G6, 음당 70ms) 뒤 G6 ↔ C7 트릴. 총 ~0.74s */
  speedUp(): void {
    this.record('speedUp');
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    const step = 0.07;
    arp.forEach((freq, i) => this.tone({ type: 'square', freq, at: i * step, dur: step, vol: 0.22, hold: true }));
    const trillAt = arp.length * step + 0.02;
    const trill = [1567.98, 2093.0, 1567.98, 2093.0];
    trill.forEach((freq, i) =>
      this.tone({
        type: 'square',
        freq,
        at: trillAt + i * 0.045,
        dur: i === trill.length - 1 ? 0.16 : 0.045,
        vol: 0.22,
        hold: i !== trill.length - 1, // 마지막 음만 여운을 남긴다
      }),
    );
  }

  /** 게임 오버: G4 → E4 → C4 하강 삼각파. 각 음이 살짝 아래로 미끄러지고 마지막 음은 길다 */
  gameOver(): void {
    this.record('gameOver');
    const notes = [392, 329.63, 261.63];
    notes.forEach((freq, i) =>
      this.tone({
        type: 'triangle',
        freq,
        glideTo: freq * 0.94,
        at: i * 0.32,
        dur: i === notes.length - 1 ? 0.7 : 0.36,
        vol: 0.4,
      }),
    );
  }

  /** 도화선이 0 이 되는 순간의 작은 펑: 아주 짧은 노이즈 + 220 → 70Hz 사인 팝 */
  fusePop(): void {
    this.record('fusePop');
    this.noise({ dur: 0.03, vol: 0.35, lowpass: 2500 });
    this.tone({ type: 'sine', freq: 220, glideTo: 70, dur: 0.06, vol: 0.4 });
  }

  /** 링버퍼에 이벤트를 남긴다. 200개를 넘으면 가장 오래된 것을 버린다 */
  private record(event: SoundEvent, ratio?: number): void {
    const t = performance.now();
    this.entries.push(ratio === undefined ? { event, t } : { event, t, ratio });
    if (this.entries.length > LOG_LIMIT) this.entries.shift();
  }

  /** 한 음. 컨텍스트가 없거나 음소거면 아무것도 만들지 않는다 */
  private tone(spec: ToneSpec): void {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t0 = ctx.currentTime + (spec.at ?? 0);
    const tEnd = t0 + spec.dur;

    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, t0);
    if (spec.glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(spec.glideTo, tEnd);

    const gain = ctx.createGain();
    const tSilent = shapeEnvelope(gain.gain, t0, spec.dur, spec.vol, spec.attack ?? ATTACK, spec.hold ?? false);

    this.route(ctx, master, osc, gain, spec.lowpass);
    osc.start(t0);
    osc.stop(tSilent + 0.005);
  }

  /** 화이트 노이즈 버스트 한 번 */
  private noise(spec: NoiseSpec): void {
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t0 = ctx.currentTime + (spec.at ?? 0);

    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx);

    const gain = ctx.createGain();
    const tSilent = shapeEnvelope(gain.gain, t0, spec.dur, spec.vol, 0.002, false);

    this.route(ctx, master, src, gain, spec.lowpass);
    src.start(t0);
    src.stop(tSilent + 0.005);
  }

  /** source → gain → (lowpass) → master 로 연결하고, 소스가 끝나면 전부 끊어 누수를 막는다 */
  private route(
    ctx: AnyAudioContext,
    master: GainNode,
    source: AudioScheduledSourceNode,
    gain: GainNode,
    lowpass: number | undefined,
  ): void {
    const chain: AudioNode[] = [source, gain];
    let tail: AudioNode = source.connect(gain);
    if (lowpass !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      filter.Q.value = 1;
      tail = tail.connect(filter);
      chain.push(filter);
    }
    tail.connect(master);
    source.onended = () => chain.forEach((node) => node.disconnect());
  }

  /** 0.2초짜리 화이트 노이즈 버퍼. 샘플레이트가 같으면 재사용한다 */
  private whiteNoise(ctx: BaseAudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) return this.noiseBuffer;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.2), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }
}
