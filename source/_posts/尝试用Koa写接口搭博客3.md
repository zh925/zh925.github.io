---
title: 尝试用Koa写接口搭博客（3）- 用户模块
date: 2020-06-26 18:52:58
categories: 
    - [node, 尝试用Koa写接口搭博客]
tags: 
    - node
    - koa
    - sequelize
---

这章主要内容是用户模块的开发，从开始到结束一整套流程需要做的所有事都会记录下来，可能有点不完善，待后续完善后再回来补上。这一章还是后台部分，等后面的章节会尝试在项目中加入页面渲染的部分。

<!--more-->

## 处理请求体(koa-bodyparser)

在使用post，put等请求时，node获取请求体的参数比较麻烦，写法如下

```typescript
router.post('/', async (ctx) => {
    const postData = await parsePostData(ctx);
});

function parsePostData(ctx) {
    return new Promise((resolve) => {
        let postData = '';
        ctx.req.addListener('data', (data) => {
            postData += data;
        });
        ctx.req.on('end', () => {
            parseQueryStr(resolve(postData))
        });
    });
}

function parseQueryStr(queryStr) {
    return queryStr.split('&').reduce((postData, query) => {
        const [key, value] = query.split('=')
        postData[key] = value
        return postData
    }, {});
}
```

现在比较通用的解决方案是使用 koa-bodyparser 代替，koa-bodyparser 是一个在处理程序之前，对请求体进行解析的一个中间件，使用 koa-bodyparser 后，会帮解析出请求体，并存在上下文中(ctx.request.body)。安装依赖

```
cnpm i koa-bodyparser -S
```

在 src/app.ts 中引入

```typescript
// src/app.ts
import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import router from './router';
import errorHandler from './middleware/errorHandler';

router.get('/', (ctx, next) => {
    ctx.body = 'hello world';
});

const app = new Koa();

app.use(errorHandler);
app.use(bodyParser());

app
    .use(router.route())
    .use(router.allowedMethods());

app.listen(3000);

console.log('app started at port 3000...');
```

在用户模块中，密码用到了 md5 加密，用户id 使用了 uuid 生成，用户token使用 jsonwebtoken 生成，因此需要安装以下依赖包

```
cnpm i jsonwebtoken uuid crypto-js -S
```

在 src/config.ts 中预置我们用于jwt的加密密钥

## 数据模型

业务最开始的工作当然是定义模型啦，首先在 src/model/User.ts 中定义用户表模型，因为我对于typescript也只是一个新手，所以在开始前还是花了点时间，看了sequelize官方对于typescript写法的文档，以及在网络上查了很久sequelize对typescript的支持，才写了代码，不确定是否是正确的写法

```typescript
// src/model/User.ts
import {Model, CHAR, STRING, ENUM, BuildOptions} from 'sequelize';
import sequelize from '../db';

enum Gender {
    Male = 'MALE',
    Female = 'FEMALE'
}

class UserModel extends Model {
    public uid!: string;
    public nickname!: string;
    public password!: string;
    public phone: string;
    public email: string;
    public avatarUrl: string;
    public gender: Gender;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt:Date
}

type UserModelStatic = typeof Model & {
    new (values?: object, options?: BuildOptions): UserModel;
}

const User = <UserModelStatic>sequelize.define('User', {
    uid: {
        type: CHAR(36),
        allowNull: false,
        primaryKey: true
    },
    phone: {
        type: CHAR(11),
        allowNull: false,
        unique: true
    },
    password: {
        type: CHAR(32),
        allowNull: false
    },
    email: {
        type: STRING
    },
    nickname: {
        type: STRING(8)
    },
    avatarUrl: {
        type: STRING
    },
    gender: {
        type: ENUM('MALE', 'FEMALE')
    }
}, {
    tableName: 'rz_user',
    timestamps: true,
    paranoid: true
});

export default User;
```

## 路由映射

接着在 src/router/user.ts 中增加路由映射，处理注册及登录的路由

```typescript
// src/router/user.ts
import * as Router from 'koa-router';
const router = new Router();
import controller from '../controller';

router.post('/register', controller.user.register);
router.post('/login', controller.user.login);
router.get('/info/:uid', controller.user.getUserInfo);

export default router
```

并添加到 src/router/index.ts 中，修改后代码如下

```typescript
// src/router/index.ts
import * as Router from 'koa-router';
const router = new Router();
import user from './user';

router.prefix('/api');
router.use('/user', user.routes());

export default router;
```

为注册及登录添加 controller

```typescript
// src/controller/user.ts
export default {
    async register(ctx) {
    },
    async login(ctx) {
    }
}
```

在 src/controller/index.ts 中统一暴露

```typescript
import user from './user';

export default {
    user
}
```

## 业务处理（controller 及 service）

在[第一章](/2020/05/31/尝试用Koa写接口搭博客1/#目的)的时候已经说过了，controller主要是为了把请求的参数解析出来，交由service处理，最后返回数据。

在[第二章](/2020/06/26/尝试用Koa写接口搭博客2/#预置业务错误对象)中，已经预置了一些业务错误的对象。

### service

先写service，我理解的service是比较具体的一些事务处理（可能有误），代码如下

```typescript
// src/service/userService.ts
import User from "../model/User";
import * as ErrorConstants from "../common/errorConstants";
import { secret } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { MD5 } from 'crypto-js'
import * as jwt from 'jsonwebtoken';

export default {
    async create(ctx) {
        const { body } = ctx.request;
        User.create({
            uid: this.getUuid(),
            nickname: body.username,
            password: MD5(body.password).toString(),
            phone: body.phone,
            email: body.email,
            avatarUrl: body.avatarUrl,
            gender: body.gender
        });
    },
    getUuid() {
        return uuidv4().replace(/-/g, '');
    },
    async findByPhone(phone) {
        return User.findOne({
            where: { phone }
        });
    },
    login(user, password) {
        if (user.password !== MD5(password).toString()) {
            throw ErrorConstants.PASSWORD_ERROR;
        }
        return jwt.sign({
            uid: user.uid,
            phone: user.phone
        }, secret);
    },
    getUserInfo(uid) {
        return User.findOne({
            where: {
                uid
            },
            attributes: [
                'uid',
                'phone',
                'email',
                'avatarUrl',
                'nickname',
                'gender',
                'createdAt',
                'updatedAt',
                'deletedAt'
            ]
        })
    }
}
```

### controller

接着是补充 controller 的代码，补充后代码如下

```typescript
import userService from '../service/userService';
import * as ErrorConstants from "../common/errorConstants";

export default {
    async register(ctx) {
        const hasUser = await userService.findByPhone(ctx.request.body.phone);
        if (hasUser) {
            throw ErrorConstants.USER_EXISTS;
        } else {
            const data = await userService.create(ctx);
            ctx.status = 200;
            ctx.body = {
                code: 200,
                data: data,
                msg: ''
            };
        }
    },
    async login(ctx) {
        const { body } = ctx.request;
        const user = await userService.findByPhone(body.phone);
        if (!user) {
            throw ErrorConstants.USER_NOT_EXISTS;
        }
        const token = userService.login(user, body.password);
        ctx.status = 200;
        ctx.body = {
            code: 200,
            data: {
                uid: user.uid,
                token
            },
            msg: ''
        }
    },
    async getUserInfo(ctx) {
        const { uid } = ctx.params;
        const user = await userService.getUserInfo(uid);
        if (!user) {
            throw ErrorConstants.USER_NOT_EXISTS;
        }
        ctx.status = 200;
        ctx.body = {
            code: 200,
            data: {
                ...user.dataValues
            },
            msg: ''
        }
    }
}
```

这样就完成了用户模块的后台接口了。为了杜绝我的摸鱼行为，所以提前给下一章定一个小目标，暂时定为页面渲染的，这样才算是把整个用户模块给写完。
