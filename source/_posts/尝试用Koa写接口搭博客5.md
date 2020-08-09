---
title: 尝试用Koa写接口搭博客（5）- 请求响应日志
date: 2020-08-09 21:42:23
categories: 
    - [node, 尝试用Koa写接口搭博客]
tags: 
    - node
    - koa
    - sequelize
---

之前在开发的时候，一直觉得我的模型定义应该是有问题的，要不然就是sequelize对于typescript的支持有问题，在重新看了sequelize文档之后发现确实是我写的有问题，所以这个月主要是对模型的定义有了一些改动。然后中途还发现了一个WebComponent的UI库——[shoelace](https://shoelace.style/)，于是把页面上的某一些组件改用成shoelace，但是因为这个库现在还不够完善，完全替换可能还需要一些时间，所以页面上的开发就暂时停滞了。然后就是从开始到现在一直心心念念的日志了，这一章最主要的内容就是请求响应的日志记录。

<!-- more -->

## 日志库 —— log4js-node

在百度搜了一圈之后发现现在大部分人推荐的都是用的这个[log4js-node](https://github.com/log4js-node/log4js-node)，于是只看了一遍文档和示例的我就开始了。先安装

```
cnpm i log4js-node -S
```

安装之后，增加配置项，我把之前的配置文件给改了一下，可以到[项目地址](https://github.com/zh925/ruozhi-blog)查看最新的文件。关于log4js-node的配置项如下：

```typescript
// src/config/log.ts
import { Configuration } from 'log4js'
import * as path from 'path'

const config: Configuration = {
    appenders: {
        console: {
            type: 'console'
        },
        response: {
            type: 'dateFile',
            filename: path.resolve(__dirname, '../../log/response/response'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true,
            encoding: 'utf-8',
            maxLogSize: 1000,
            numBackups: 3,
            path: ('../log/app'),
            layout: {
              type: 'basic'
            }
        },
        errorFiles: {
            type: 'dateFile',
            filename: path.resolve(__dirname, '../../log/error/error'),
            pattern: 'yyyy-MM-dd.log',
            alwaysIncludePattern: true,
            encoding: 'utf-8',
            maxLogSize: 1000,
            numBackups: 3,
            path: ('../log/error'),
            layout: {
              type: 'basic'
            }
        }
    },
    categories: {
        default: { appenders: [ 'console', 'response' ], level: 'all' },
        error: { appenders: ['errorFiles', 'console'], level: 'error' },
    }
}

export default config
```

这里的配置项主要是参照官方给的示例修改的。这里的appenders可以看作是配置每一个日志记录的地点，categories就是配置每一个日志记录的类型。

categories的配置规则是，当调用该类对应配置的level（包含all, info, error, debug, trace, warn, fatal, mark等）时，把日志记录到对应配置的appenders内，而这里的appenders既是配置的appenders的每一项。

## 封装记录日志的中间件

在src/middlewares中新建log4js.ts文件，这个中间件主要是用来处理请求和响应的日志的。代码如下：

```typescript
import * as log4js from 'log4js'
import config from '../config'

log4js.configure(config.log)

const logger = log4js.getLogger()
const errorLogger = log4js.getLogger('error')

export default async(ctx, next) => {
    const startTime = new Date();
    await next();
    const duration = new Date().getTime() - startTime.getTime();
    const { request, body } = ctx;
    const logHeader = `\n==================== Request Start ====================\n`;
    const logFooter = `\n===================== Request End =====================\n`;
    const logMsg = 
    `${logHeader}
    Client IP:       ${ctx.ip}
    Request:         ${request.method} ${request.url}
    ResponseTime:    ${duration}
    Response Status: ${ctx.status}
    Request Header:  ${JSON.stringify(request.header)}
    Request Body:    ${request.method === 'GET' ? JSON.stringify(ctx.params) : JSON.stringify(request.body)}
    Response Body:   ${JSON.stringify(body)}
    ${logFooter}`
    if (ctx.status === 200 && body.code === 200) {
        logger.info(logMsg);
    } else {
        errorLogger.error(logMsg);
    }
}
```

然后在app中引入：

```typescript
// app.ts
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as render from 'koa-ejs'
import * as serve from 'koa-static'
import * as path from 'path'
import logger from './middleware/log4js'

import router from './router'
import errorHandler from './middleware/errorHandler'

const app = new Koa()

app.use(serve(path.resolve(__dirname, 'static')))
render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'layout',
    viewExt: 'ejs',
    cache: false,
    debug: true
})
app.use(bodyParser())

app.use(async (ctx, next) => {
    ctx.state = ctx.state || {}
    ctx.state.now = new Date()
    ctx.state.ip = ctx.ip
    ctx.state.render = {
        header: true,
        footer: true
    }
    return next()
})


app.use(logger)
app.use(errorHandler)

app.use(router.routes())
    .use(router.allowedMethods())


app.listen(3000)

console.log('app started at port 3000...')
```

这样就把日志模块给搞定了，整个项目的基础架子也算是真正意义上的完成了。
