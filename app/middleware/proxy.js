const fs = require('fs')
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

function _getParsedBody(ctx) {

    const options = {}

    const files = ctx.request.files
    if (files && Object.keys(files).length > 0) {
        let formData = {}
        for (let key in files) {
            formData[key] = fs.createReadStream(files[key].path)
        }
        const body = ctx.request.body
        if (body && Object.keys(body).length > 0) {
            for (let key in body) {
                formData[key] = body[key]
            }
        }

        options.formData = formData
    } else {
        const body = ctx.request.body
        if (body && Object.keys(body).length > 0) {
            const contentType = ctx.request.header['content-type'] || ''
            if (~contentType.toLowerCase().indexOf('application/json')) {
                options.body = JSON.stringify(body)
            } else if (~contentType.toLowerCase().indexOf('application/x-www-form-urlencoded')) {
                const params = []
                Object.keys(body).forEach(key => {
                    params.push(`${key}=${body[key]}`)
                })
                options.form = params.join('&')
            } else {
                options.body = body
            }
        }
    }

    return options
}

async function _startProxy(ctx, apiUrl) {

    const transHeaders = Object.assign(ctx.request.headers, { 'host': apiUrl.split('/')[2] })

    // 删除content-length
    delete transHeaders['content-length']

    let options = {
        url: apiUrl,
        method: ctx.request.method,
        headers: transHeaders,
        encoding: null
    }

    options = Object.assign(options, _getParsedBody(ctx))

    await new Promise(resolve => {
        ctx.body = request(options).on('error', error => {
            console.error(error)
            resolve()
        }).on('response', response => {
            console.log(`${ctx.request.method} ${apiUrl} ${response.statusCode}`)
            ctx.status = response.statusCode
            for (let key in response.headers) {
                // http://stackoverflow.com/questions/35525715/http-get-parse-error-code-hpe-unexpected-content-length
                if (key != 'transfer-encoding') {
                    ctx.set(key, response.headers[key])
                }
            }
            resolve()
        }).pipe(passThrough())
    })

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