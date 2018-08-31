const fs = require('fs')

module.exports = {
    getConf : function(){
        try{
            let f = fs.readFileSync(__dirname + '/server.json', 'UTF-8')
            return JSON.parse(f)
        }catch(e) {
            throw new Error('获取Config失败：' + e.message)
        }
    }
}