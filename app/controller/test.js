module.exports = async (ctx, next) => {

    if(ctx.path == '/redirect'){
        ctx.status = 302
        ctx.response.redirect('http://localhost:3001/ok')
        return
    }
    if(ctx.path == '/ok'){
        ctx.status = 200
        ctx.body = '{"res":"ok"}'
        return
    }

}