const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

/**
 * 协商缓存依赖的模块
 */
const etag = require('etag');//生成etag
const fresh = require('fresh');//用来协商缓存是否有效的判断

/**
 * 启动一个serve
 */
const server = http.createServer((req, res) => {
    let filePath, isHtml, needUpdate;
    const pathname = url.parse(req.url, true).pathname;

    //根据请求路径取文件绝对路径
    if (pathname === '/') {
        filePath = path.join(__dirname, '/index.html');
        isHtml = true;
    } else {
        filePath = path.join(__dirname, 'static', pathname);
        isHtml = false;
    }

    // 读取文件描述信息，用于计算etag及设置Last-Modified
    fs.stat(filePath, function (err, stat) {
        if (err) {
            res.writeHead(404, 'not found');
            res.end('<h1>404 Not Found</h1>');
            return
        }
        // 生成协商缓存参数，并写入response Header
        const lastModified = stat.mtime.toUTCString();//文件的最近修改时间
        const fileEtag = etag(stat);//生成文件内容的唯一标示
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('ETag', fileEtag);
        if (isHtml) {
            res.setHeader('Cache-Control', 'public, max-age=0');//禁止强制缓存，但需要进行协商缓存
            res.setHeader('Cache-Control', 'public, no-cache');//禁止强制缓存，但需要进行协商缓存
            // res.setHeader('Cache-Control', 'public, no-store');//禁止强制缓存，也禁止协商缓存

            // 根据请求头参数判断缓存是否是最新的,以此决定要不要更新
            needUpdate = !fresh(req.headers, {
                'etag': fileEtag,
                'last-modified': lastModified
            });
        } else {
            // 其他静态资源使用强缓存
            res.setHeader('Cache-Control', 'public, max-age=31536000, must-revalidate');
        }

        fs.readFile(filePath, 'utf-8', (err, fileContent) => {
            if (err) {
                res.writeHead(404, 'not found');
                res.end('<h1>404 Not Found</h1>');
            } else {
                if (isHtml && !needUpdate) {
                    res.statusCode = 304
                } else {
                    res.statusCode = 200
                    res.write(fileContent, 'utf-8')
                }
                res.end();
            }
        });

    });
});
server.listen(8080);
console.log('server is running on http://localhost:8080/');