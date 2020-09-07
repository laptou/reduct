import { promises as fs, readFileSync } from 'fs';
import { resolve } from 'path';
import { resolve as resolveUri } from 'url';

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

import { serverLogger } from './logging/server';
import {
  IS_HTTPS, USE_TEST_AUTHENTICATION, ENV, PUBLIC_URI, GENERATE_SAML_METADATA,
} from './config';

const { readFile, writeFile } = fs;

// derived from https://it.cornell.edu/shibboleth/shibboleth-faq
const NETID_URN = 'urn:oid:0.9.2342.19200300.100.1.1';

const LOGIN_PATH = '/auth/login';
const SAML_CALLBACK_PATH = '/auth/saml/callback';
const SAML_CALLBACK_URI = ENV === 'prod'
  ? resolveUri(PUBLIC_URI, SAML_CALLBACK_PATH)
  : undefined;
const SAML_CALLBACK_PROTOCOL = IS_HTTPS ? 'https://' : 'http://';
const SAML_ENTRYPOINT = USE_TEST_AUTHENTICATION
  ? 'https://shibidp-test.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO'
  : 'https://shibidp.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO';
const SAML_IDP_CERT_PATH = USE_TEST_AUTHENTICATION
  ? resolve(__dirname, '../cert/cornell-idp-test.cer')
  : resolve(__dirname, '../cert/cornell-idp.cer');
const SAML_PUBLIC_CERT_PATH = resolve(__dirname, '../secret/saml-cert.pem');
const SAML_PRIVATE_KEY_PATH = resolve(__dirname, '../secret/saml-key.pem');

const strategy = new SamlStrategy({
  callbackUrl: SAML_CALLBACK_URI,
  path: SAML_CALLBACK_PATH,
  protocol: SAML_CALLBACK_PROTOCOL,
  entryPoint: SAML_ENTRYPOINT,
  cert: readFileSync(SAML_IDP_CERT_PATH, 'utf-8'),
  decryptionPvk: readFileSync(SAML_PRIVATE_KEY_PATH, 'utf-8'),
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
  if (GENERATE_SAML_METADATA) {
    const signingCert = await readFile(SAML_PUBLIC_CERT_PATH, 'utf-8');
    // write IDP metadata to file
    const meta = strategy.generateServiceProviderMetadata(signingCert);
    await writeFile(resolve(__dirname, '../meta/idp.xml'), meta);
    serverLogger.info('wrote SAML metadata');
  }

  // __dirname does not normally work in ES modules, but TypeScript converts all
  // of this into CJS anyway
  const secret = await readFile(resolve(__dirname, '../secret/session.base64'), 'utf-8');

  server.keys = [secret];
  server.use(KoaSession({}, server));
  server.use(KoaPassport.initialize());
  server.use(KoaPassport.session());

  serverLogger.info(`using ${USE_TEST_AUTHENTICATION ? 'test' : 'prod'} SAML server`);

  const authRouter = new KoaTreeRouter<DefaultState, Context>();

  authRouter.get(
    LOGIN_PATH,
    KoaPassport.authenticate('saml')
  );

  authRouter.post(
    SAML_CALLBACK_PATH,
    KoaPassport.authenticate('saml', {
      failureRedirect: LOGIN_PATH,
      successRedirect: '/',
    })
  );

  authRouter.get(
    '/auth/me',
    ctx => {
      if (!ctx.isAuthenticated()) {
        ctx.response.status = 401;
        return;
      }

      ctx.response.body = ctx.state.user.netId;
    }
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
