import { v4 as uuid } from 'uuid';

interface LogEntry {
  /**
   * The action that the user did. This can be an in-game action like
   * 'game:undo' or 'game:step', or a non-gameplay action like 'pref:sound'
   */
  action: string;

  /**
   * Metadata giving more info about the user's action.
   */
  meta: {
    /**
     * Unix timestamp for this action.
     */
    timestamp: number;

    /**
     * UUID for the current session.
     */
    sessionId: string;
  } & Record<string, any>;
}

// attempt to upload logs every 30 seconds
const UPLOAD_INTERVAL = 30 * 1000;

const sessionId = uuid();
let pendingLogTimer: NodeJS.Timeout | null = null;
const pendingLogEntries: LogEntry[] = [];

export function startLogging() {
  stopLogging();

  pendingLogTimer = setInterval(async () => {
    if (pendingLogEntries.length === 0) return;

    const sendingLogEntries = pendingLogEntries.splice(0, pendingLogEntries.length);
    const body = JSON.stringify(sendingLogEntries);

    try {
      await fetch('/logs/action', {
        method: 'POST',
        body,
      });
    } catch {
      pendingLogEntries.unshift(...sendingLogEntries);
    }
  }, UPLOAD_INTERVAL);
}

export function stopLogging() {
  if (pendingLogTimer !== null)
    clearInterval(pendingLogTimer);

  pendingLogTimer = null;
}

export function log(action: string, meta: Record<string, any>) {
  pendingLogEntries.push({
    action,
    meta: {
      sessionId,
      timestamp: +new Date(),
      ...meta,
    },
  });
}
