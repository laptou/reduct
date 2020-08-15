
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

// derived from https://it.cornell.edu/shibboleth/shibboleth-faq
const NETID_URN = 'urn:oid:0.9.2342.19200300.100.1.1';

const LOGIN_PATH = '/auth/login';
const CALLBACK_PATH_SAML = '/auth/saml/callback';

KoaPassport.use(new SamlStrategy({
  path: CALLBACK_PATH_SAML,
  entryPoint: 'https://shibidp-test.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO',
  issuer: 'reduct',
  name: 'saml',
}, (profile: SamlProfile, callback: SamlVerifiedCallback) => {
  const netId = profile[NETID_URN];
  callback(null, { netId });
}));

KoaPassport.serializeUser(({ netId }: {netId: string}, callback) => {
  callback(null, netId);
});

KoaPassport.deserializeUser((netId: string, callback) => {
  callback(null, { netId });
});

export function initializeAuth(server: Koa): void {
  server.keys = ['secret key, change me before deploying'];
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
