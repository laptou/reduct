import Koa, { Context, DefaultState } from 'koa';
import KoaRouter from 'koa-router';
import KoaSession from 'koa-session';
import KoaPassport from 'koa-passport';
import KoaBodyParser from 'koa-bodyparser';
import {
  Strategy as SamlStrategy,
  Profile as SamlProfile,
  VerifiedCallback as SamlVerifiedCallback,
} from 'passport-saml';

const server = new Koa();
server.keys = ['secret key, change me before deploying'];

// derived from https://it.cornell.edu/shibboleth/shibboleth-faq
const NETID_URN = 'urn:oid:0.9.2342.19200300.100.1.1';

KoaPassport.use(new SamlStrategy({
  path: '/login/callback',
  entryPoint: 'https://shibidp-test.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO',
  issuer: 'reduct',
  name: 'saml',
}, (profile: SamlProfile, callback: SamlVerifiedCallback) => {
  console.log('verified');
  const netId = profile[NETID_URN];
  callback(null, { netId });
}));

KoaPassport.serializeUser(({ netId }: {netId: string}, callback) => {
  callback(null, netId);
});

KoaPassport.deserializeUser((netId: string, callback) => {
  callback(null, { netId });
});

server.use(KoaBodyParser());
server.use(KoaSession({}, server));
server.use(KoaPassport.initialize());
server.use(KoaPassport.session());

const router = new KoaRouter<DefaultState, Context>();

router.get('/login', KoaPassport.authenticate('saml'));

router.post(
  '/login/callback',
  KoaPassport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/login',
  }),
);

router.use((ctx, next) => {
  if (ctx.isAuthenticated()) {
    return next();
  } else {
    ctx.redirect('/login');
  }
});

router.get(
  '/',
  ctx => {
    ctx.response.body = `welcome ${JSON.stringify(ctx.state.user)}`;
  }
);

server.use(router.routes());
server.listen(process.env.PORT || 8080);
