export const ENV = process.env.NODE_ENV === 'development' ? 'dev' : 'prod';
export const USE_REMOTE_LOGGING = ENV === 'prod'
  ? (process.env.REDUCT_REMOTE_LOGGING !== 'false')
  : (process.env.REDUCT_REMOTE_LOGGING === 'true');
export const USE_HTTPS = process.env.REDUCT_USE_HTTPS === 'true';
export const IS_HTTPS = ENV === 'prod' || USE_HTTPS;
export const GENERATE_SAML_METADATA = process.env.REDUCT_SAML_META === 'true';
export const USE_AUTHENTICATION = process.env.REDUCT_NO_AUTH !== 'true';
export const USE_TEST_AUTHENTICATION = process.env.REDUCT_PROD_AUTH !== 'true';
export const PUBLIC_URI = 'https://reduct-285602.uc.r.appspot.com/';
