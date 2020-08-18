export const environment = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
export const useRemoteLogging = environment === 'prod' || (process.env.REDUCT_REMOTE_LOGGING === 'true');
export const useHttps = environment === 'prod' && (process.env.REDUCT_NO_HTTPS !== 'true');
export const useAuthentication = process.env.REDUCT_NO_AUTH !== 'true';
