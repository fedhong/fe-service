module.exports = async (ctx, next) => {
    ctx.status = 404
    ctx.body = 'Not Found'
}