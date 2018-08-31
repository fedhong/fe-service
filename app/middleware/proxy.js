const request = require('request')
const requestPromise = require('request-promise')
const passThrough = require('stream').PassThrough;
const server = require('../config/server')

function _ignorePath(path = '') {
    return path.replace(/(^\/+|\/+$)/g, '')
}

function _getApiUrl(ctx) {
    let apiUrl = null
    server.getConf().some(item => {
        const reg = new RegExp(`^/${_ignorePath(item.location)}(?:/|$)`)
        if (reg.test(ctx.path)) {
            const domain = _ignorePath(item.proxy_pass)
            const url = _ignorePath(item.transmit_location ? ctx.url : ctx.url.replace(`/${_ignorePath(item.location)}/`, '/'))
            apiUrl = `${domain}/${url}`
            return true
        }
        return false
    })
    return apiUrl
}

async function _startProxy(ctx, apiUrl) {

    const transHeaders = Object.assign(ctx.request.headers, { 'host': apiUrl.split('/')[2] })
    
    // 删除content-length
    delete transHeaders['content-length']
    
    const parsedBody = getParsedBody(ctx)

    const options = {
        url: apiUrl,
        method: ctx.request.method,
        headers: transHeaders,
        encoding: null,
        body: parsedBody
    }
   
    ctx.body = request(options).on('error', error => {
        console.error(error)
    }).on('response', response => {
        ctx.status = response.statusCode
        for(let key in response.headers) {
            // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
            if(key != 'transfer-encoding'){
                ctx.set(key, response.headers[key])
            }            
        }
    }).pipe(passThrough())    
     /*
    if(ctx.request.method == 'GET'){
        ctx.body = request(options).on('error', error => {
            console.error(error)
        }).on('response', response => {
            ctx.status = response.statusCode
            for(let key in response.headers) {
                ctx.set(key, response.headers[key])
            }
        }).pipe(passThrough())
    }else{
        await new Promise((resolve, reject) => {
            request.post(options, (error, response, body) => {
                for(let key in response.headers) {
                    // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
                    if(key != 'transfer-encoding'){
                        ctx.set(key, response.headers[key])
                    }   
                }
                ctx.status = response.statusCode
                ctx.body = response.body
                resolve()
            })
        }) 
    }
    */
    
    function getParsedBody(ctx) {
        let body = ctx.request.body
        if (body === undefined || body === null || Object.keys(body).length === 0) {
            return undefined
        }
        var contentType = ctx.request.header['content-type']
        if (!Buffer.isBuffer(body) && typeof body !== 'string') {
            if (contentType && contentType.indexOf('json') !== -1) {
                body = JSON.stringify(body)
            }else{
                const params = []
                Object.keys(body).forEach(key => {
                    params.push(`${key}=${body[key]}`)
                })
                body = params.join('&')
            }
        }
        return body
    }
}

module.exports = async (ctx, next) => {

    const apiUrl = _getApiUrl(ctx)

    if (apiUrl) {
        console.log(`${ctx.url} -> ${apiUrl}`)
        await _startProxy(ctx, apiUrl)
    } else {
        console.log(`${ctx.url} -> Not found`)
        await next()
    }
}