
import { promises as fs, readFileSync } from 'fs';
import { resolve, join } from 'path';

import type {
  Context, default as Koa, DefaultState, Middleware,
} from 'koa';
import KoaPassport from 'koa-passport';
import KoaSession from 'koa-session';
import KoaTreeRouter from 'koa-tree-router';
import {
  Profile as SamlProfile, Strategy as SamlStrategy,
  VerifiedCallback as SamlVerifiedCallback,
} from 'passport-saml';

import { IS_HTTPS, USE_TEST_AUTHENTICATION, ENV, PUBLIC_URI } from './config';

const { readFile, writeFile } = fs;

// derived from https://it.cornell.edu/shibboleth/shibboleth-faq
const NETID_URN = 'urn:oid:0.9.2342.19200300.100.1.1';

const LOGIN_PATH = '/auth/login';
const CALLBACK_PATH_SAML = '/auth/saml/callback';
const CALLBACK_URL_SAML = ENV === 'prod'
  ? join(PUBLIC_URI, CALLBACK_PATH_SAML)
  : undefined;
const CALLBACK_PROTOCOL_SAML = IS_HTTPS ? 'https://' : 'http://';
const ENTRYPOINT_SAML = USE_TEST_AUTHENTICATION
  ? 'https://shibidp-test.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO'
  : 'https://shibidp.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO';
const CERT_IDP_SAML_PATH = USE_TEST_AUTHENTICATION
  ? resolve(__dirname, '../cert/cornell-idp-test.cer')
  : resolve(__dirname, '../cert/cornell-idp.cer');

const strategy = new SamlStrategy({
  callbackUrl: CALLBACK_URL_SAML,
  path: CALLBACK_PATH_SAML,
  protocol: CALLBACK_PROTOCOL_SAML,
  entryPoint: ENTRYPOINT_SAML,
  cert: readFileSync(CERT_IDP_SAML_PATH, 'utf-8'),
  signatureAlgorithm: 'sha256',
  issuer: 'reduct',
  name: 'saml',
}, (profile: SamlProfile, callback: SamlVerifiedCallback) => {
  const netId = profile[NETID_URN];
  callback(null, { netId });
});

KoaPassport.use(strategy);

KoaPassport.serializeUser(({ netId }: {netId: string}, callback) => {
  callback(null, netId);
});

KoaPassport.deserializeUser((netId: string, callback) => {
  callback(null, { netId });
});

export async function initializeAuth(server: Koa): Promise<void> {
  // write IDP metadata to file
  const meta = strategy.generateServiceProviderMetadata(null, null);
  await writeFile(resolve(__dirname, '../meta/idp.xml'), meta);

  // __dirname does not normally work in ES modules, but TypeScript converts all
  // of this into CJS anyway
  const secret = await readFile(resolve(__dirname, '../secret/session.base64'), 'utf-8');

  server.keys = [secret];
  server.use(KoaSession({}, server));
  server.use(KoaPassport.initialize());
  server.use(KoaPassport.session());

  const authRouter = new KoaTreeRouter<DefaultState, Context>();

  authRouter.get(
    LOGIN_PATH,
    KoaPassport.authenticate('saml')
  );

  authRouter.post(
    CALLBACK_PATH_SAML,
    KoaPassport.authenticate('saml', {
      failureRedirect: LOGIN_PATH,
      successRedirect: '/',
    })
  );

  server.use(authRouter.routes());
}

export const authMiddleware: Middleware<any, Context> = (ctx, next) => {
  if (ctx.isAuthenticated()) {
    return next();
  } else {
    ctx.redirect(LOGIN_PATH);
  }
};
