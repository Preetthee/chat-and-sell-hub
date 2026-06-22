// Lightweight client-side auth event logger. Logs to console with a stable
// prefix and keeps the most recent events in memory for in-app debugging.
type AuthLogEvent = {
  at: string;
  event: string;
  detail?: Record<string, unknown>;
};

const MAX = 50;
const buffer: AuthLogEvent[] = [];

export function logAuth(event: string, detail?: Record<string, unknown>) {
  const entry: AuthLogEvent = { at: new Date().toISOString(), event, detail };
  buffer.push(entry);
  if (buffer.length > MAX) buffer.shift();
  // Single, easily greppable prefix
  // eslint-disable-next-line no-console
  console.info(`[auth] ${event}`, detail ?? "");
}

export function getAuthLog(): readonly AuthLogEvent[] {
  return buffer;
}