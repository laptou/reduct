export const environment = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
export const useRemoteLogging = environment === 'prod' || (process.env.REDUCT_REMOTE_LOGGING === 'true');
