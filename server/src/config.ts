export const environment = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
export const useRemoteLogging = environment === 'prod' || (process.env.REDUCT_REMOTE_LOGGING === 'true');
export const useHttps = process.env.REDUCT_USE_HTTPS === 'true';
export const isHttps = environment === 'prod' || useHttps;
export const useAuthentication = process.env.REDUCT_NO_AUTH !== 'true';
export const useTestAuthentication = process.env.REDUCT_TEST_AUTH !== 'true';
