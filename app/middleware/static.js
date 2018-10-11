const send = require('koa-send')
const conf = require('../config/constants')

module.exports = async function (ctx, next) {

    let opts = {
        root : conf.STATIS_PATH,
        index : conf.DEFAULT_INDEX
    }
    
    let done = false

    if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
            done = await send(ctx, ctx.path, opts)
        } catch (err) {
            if (err.status !== 404) {
                throw err
            }
        }
    }

    if (!done) {
        await next()
    }
}