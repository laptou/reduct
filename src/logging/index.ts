import type { Middleware } from 'redux';

export const logMiddleware: Middleware = (api) => (next) => (act) => next(act);
