import type { Session } from './types';

const STORAGE_KEY = 'focus-fork:sessions';

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session): Session[] {
  const sessions = loadSessions();
  const withoutCurrent = sessions.filter((item) => item.id !== session.id);
  const next = [session, ...withoutCurrent].slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
