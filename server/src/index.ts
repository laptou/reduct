import Koa from 'koa';
import KoaRouter from 'koa-router';

const server = new Koa();
const router = new KoaRouter();

router.get('/', async ctx => {
  ctx.response.body = 'welcome to reduct';
});

server.listen(process.env.PORT || 8080);
