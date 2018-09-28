const Koa = require('koa')
const koaBody = require('koa-body')
const compose = require('koa-compose')
const interceptor = require('./app/middleware/interceptor')
const statics = require('./app/middleware/static')
const proxy = require('./app/middleware/proxy')
const notfound = require('./app/middleware/notfound')
const test = require('./app/controller/test')

const app = new Koa()

const middlewares = compose([
    interceptor,
    statics,
    koaBody({
        multipart: true,
        formidable: {
            keepExtensions: true
        }
    }),
    test,
    proxy,
    notfound
]);
app.use(middlewares);

app.listen(3001)