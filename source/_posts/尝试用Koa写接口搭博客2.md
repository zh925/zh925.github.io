---
title: 尝试用Koa写接口搭博客（2）- 错误处理
date: 2020-06-26 03:08:47
updated: 2020-06-26 21:30:00
categories: 
    - [node, 尝试用Koa写接口搭博客]
tags: 
    - node
    - sequelize
---

端午安康鸭！摸了大半个月的鱼，总算是开始写第二章了，这一章主要是记录一下错误处理。（原本想要连同第一个业务接口一起记录下来，写到一半发现内容太多，影响浏览，因此分为两章，分别记录。）原计划是会更新比较多章节的，但是因为这大半个月过的很憋屈，因为是边学边写，项目进展不大，所以就只能一点点更新了。

<!--more-->

## 错误基类

在错误处理这一部分，做了挺多功课的。最开始的时候想着先不做那么多，只是一个练手的项目，直接在业务接口里面写，后来发现这样做的话代码可读性很差，加上自己还是有那么一点点追求的，最主要是重复代码会特别多，于是放弃了这种想法。最开始是看了一下[express的官方示例](https://www.expressjs.com.cn/guide/error-handling.html)以及[koa的官方示例](https://github.com/koajs/koa/blob/master/docs/error-handling.md)，可能是因为是同一个团队开发出来的，所以都是用中间件解决。最终，结合在网络上找到的各种实现方式，我将错误处理封装成以下这样

在 src/common/httpException.ts 中封装了一个基础的错误类，代码如下

```typescript
// src/common/httpException.ts
class HttpException extends Error {
    constructor(errCode = 500, msg = '服务器异常', data = {}) {
        super();
        this.msg = msg;
        this.errCode = errCode;
        this.data = data;
        Object.setPrototypeOf(this, HttpException.prototype);
    }
    public msg: string;
    public errCode: number;
    public data: any;
}

export default HttpException;
```

## 错误处理中间件

接着在 src/middleware/errorHandler.ts 封装了一个处理错误的中间件，代码如下

```typescript
// src/middleware/errorHandler.ts
import HttpException from "../common/httpException";

export default async function errorHandler(ctx,next) {
    try {
        await next();
    } catch (err) {
        if (err instanceof HttpException) {
            ctx.status = 200;
            ctx.body = {
                errCode: err.errCode,
                errMsg: err.msg,
                data: err.data || {}
            };
        } else {
            ctx.status = 200;
            ctx.body = {
                errCode: 500,
                errMsg: err.message,
                data: {}
            };
        }
    }
}

```

接着在 src/app 内引入中间件，修改后 app.ts 代码如下

```typescript
// src/app.ts
import * as Koa from 'koa';
import router from './router';
import errorHandler from './middleware/errorHandler';

router.get('/', (ctx, next) => {
    ctx.body = 'hello world';
});

const app = new Koa();

app.use(errorHandler);

app
    .use(router.route())
    .use(router.allowedMethods());

app.listen(3000);

console.log('app started at port 3000...');
```

## 预置业务错误对象

这样最基础的一个错误处理就封装完了，之后再在 src/errorConstants 封装一些业务的错误对象就可以了，代码如下

```typescript
// src/errorConstants
import HttpException from "./httpException";

export const USER_EXISTS = new HttpException(400, '用户已存在');
export const USER_NOT_EXISTS = new HttpException(400, '用户不存在');
export const PASSWORD_ERROR = new HttpException(400, '密码错误');
```

这样，当在代码中抛出异常时，会进入到errorHandler中处理报错，并且向客户端返回
