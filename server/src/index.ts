import Koa from 'koa';
import KoaRouter from 'koa-router';

const server = new Koa();
const router = new KoaRouter();

router.get('/', async ctx => {
  ctx.response = 'welcome to reduct';
})

server.listen()
