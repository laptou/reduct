import { v4 as uuid } from 'uuid';
import * as Sentry from '@sentry/react';

interface LogEntry {
  /**
   * The action that the user did. This can be an in-game action like
   * 'game:undo' or 'game:step', or a non-gameplay action like 'pref:sound'
   */
  action: string;

  /**
   * Timestamp for this action.
   */
  timestamp: Date;

  /**
   * UUID for the current session.
   */
  sessionId: string;

  [extra: string]: any;
}

// attempt to upload logs every 30 seconds
const UPLOAD_INTERVAL = 30 * 1000;

const sessionId = uuid();
let pendingLogTimer: NodeJS.Timeout | null = null;
const pendingLogEntries: LogEntry[] = [];

async function trySendLogs() {
  if (pendingLogEntries.length === 0) return;

  const sendingLogEntries = pendingLogEntries.splice(0, Math.min(pendingLogEntries.length, 10));
  const body = JSON.stringify(sendingLogEntries);

  try {
    await fetch('/logs/action', {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch {
    pendingLogEntries.unshift(...sendingLogEntries);
  }
}

export function startLogging() {
  stopLogging();

  pendingLogTimer = setInterval(() => void trySendLogs(), UPLOAD_INTERVAL);
}

export function stopLogging() {
  if (pendingLogTimer !== null)
    clearInterval(pendingLogTimer);

  pendingLogTimer = null;
}

export function flushLogs() {
  void trySendLogs();
}

export function log(action: string, extra: Record<Exclude<string, 'timestamp' | 'level' | 'action'>, any> = {}) {
  pendingLogEntries.push({
    action,
    sessionId,
    timestamp: new Date(),
    ...extra,
  });

  Sentry.addBreadcrumb({
    message: action,
    type: 'action',
    data: Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, JSON.stringify(value)])),
    level: Sentry.Severity.Info,
  });
}
