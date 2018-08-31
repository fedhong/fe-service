const fs = require('fs')

module.exports = async (ctx, next) => {
    const start = Date.now()
    
    try{
        //Path容错
        ctx.path = ctx.path.replace(/\/+/g, '/')
        await next()		
	}catch(e){
        console.error(ctx.href)
        console.error(e.stack)
        ctx.status = e.status || 500
        ctx.body = e.message       
	}
    
    const ms = Date.now() - start
    console.log(`${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`)
}