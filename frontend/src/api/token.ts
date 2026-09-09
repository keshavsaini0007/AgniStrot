// Central JWT token storage — single source of truth for auth headers + socket.
const TOKEN_KEY = 'agnistrot_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

// ── Cached session user (kept in sync with the token) ────────────────────
const USER_KEY = 'agnistrot_user';

export const getCachedUser = <T>(): T | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const setCachedUser = <T>(user: T): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
};

export const clearSession = (): void => {
  clearToken();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
};