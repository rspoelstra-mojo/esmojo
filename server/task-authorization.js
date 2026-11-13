// Absolute taakdelegatie: geen glijdende verlenging bij voortgang of herpogingen.
export const TASK_AUTHORIZATION_MS = 48 * 3600000;
export const LEGACY_TASK_AUTHORIZATION_MS = 24 * 3600000;
export function taskExpiresAt(state) {
  return Number.isFinite(state.startedAt) && state.expiresAt >= state.startedAt + LEGACY_TASK_AUTHORIZATION_MS && state.expiresAt <= state.startedAt + LEGACY_TASK_AUTHORIZATION_MS + 1000
    ? state.startedAt + TASK_AUTHORIZATION_MS : state.expiresAt;
}
