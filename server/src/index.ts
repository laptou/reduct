import Koa from 'koa';
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

KoaPassport.use(new SamlStrategy({
  path: '/login/callback',
  entryPoint: 'https://shibidp-test.cit.cornell.edu/idp/profile/SAML2/Redirect/SSO',
  issuer: 'reduct',
  name: 'saml',
}, (profile: SamlProfile, callback: SamlVerifiedCallback) => {
  console.log('verified');
}));

server.use(KoaBodyParser());
server.use(KoaSession(server));
server.use(KoaPassport.initialize());
server.use(KoaPassport.session());

const router = new KoaRouter();

router.get('/',
  KoaPassport.authenticate('saml'),
  ctx => {
    ctx.response.body = 'welcome to reduct';
  }
);

router.post('/login/callback',
  KoaPassport.authenticate('saml', {
    failureRedirect: '/',
    failureFlash: true,
  }),
  ctx => {
    ctx.redirect('/');
  }
);

server.use(router.routes());
server.listen(process.env.PORT || 8080);
