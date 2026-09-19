/**
 * LocalStorage 영속화 — 최고 점수와 설정(음소거).
 * 저장소는 언제든 실패할 수 있다(사생활 보호 모드 · 용량 · 깨진 값). 모든 접근은 try/catch 로 감싸고,
 * 읽은 값은 반드시 정제하며, 쓰기에 실패해도 게임은 메모리 값으로 계속 돈다.
 */

export const BEST_KEY = 'microrush:best:v1';
export const SETTINGS_KEY = 'microrush:settings:v1';

export interface Settings {
  muted: boolean;
}

export const DEFAULT_SETTINGS: Settings = { muted: false };

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** 최고 점수. 없거나 깨졌으면 0 */
export function loadBest(): number {
  const n = Number(read(BEST_KEY));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function saveBest(best: number): boolean {
  return write(BEST_KEY, String(Math.max(0, Math.floor(best))));
}

/** 어떤 값이 들어와도 유효한 Settings 로 만든다 */
export function sanitizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  return { muted: r.muted === true };
}

export function loadSettings(): Settings {
  const text = read(SETTINGS_KEY);
  if (text === null) return { ...DEFAULT_SETTINGS };
  try {
    return sanitizeSettings(JSON.parse(text));
  } catch {
    return { ...DEFAULT_SETTINGS }; // 깨진 JSON 은 없는 것으로 친다
  }
}

export function saveSettings(settings: Settings): boolean {
  return write(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
}
