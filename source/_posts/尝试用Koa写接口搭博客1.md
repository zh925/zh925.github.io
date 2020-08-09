---
title: 尝试用Koa写接口搭博客（1）- 基础架子
subtitle: 基础架子
date: 2020-05-31 22:19:25
updated: 2020-06-26 21:30:00
categories: 
    - [node, 尝试用Koa写接口搭博客]
tags: 
    - node
    - koa
    - sequelize
---

从很久之前一直有这个想法，因为太忙（懒），一直没有动手，这次终于把他落实到实际行动上。接下来打算用个把月的闲暇时间把这个项目做完，在这个过程中顺便做个记录。

## 为什么是Koa

刚开始萌生写node的时候纠结了很久，在原生node、express、koa和eggjs中徘徊了很久（主要还是纠结express还是koa），通过翻查各种资料，自己总结出以下结论（可能有误）。

express已经是一个非常完整的框架了，相比于koa的轻量级，express有着完整的路由和模板等实现的方案。而koa主要还是轻量，模块化程度更高，在主要功能上，算是对express的一种扩展，而且因为使用了新语法，所以不像express一样使用回调，而是利用async/await来消除毁掉陷阱。

加上我喜欢尝试这种模块化的东西，所以最终选择了koa，等项目后期基本完型后还打算折腾点，搬到eggjs上做尝试。

<!--more-->

## 项目基础搭建

这里用到的是Koa作为基础的框架，搭配[koa-router](https://github.com/koajs/router/blob/master/API.md)做路由映射，以及[body-parser](https://github.com/expressjs/body-parser#readme)处理post请求的参数。数据库方面使用mysql，搭配[sequelize](https://sequelize.org/v5/)这个[orm](http://www.ruanyifeng.com/blog/2019/02/orm-tutorial.html)框架。另外，为了折腾，还使用了[typescript](https://www.typescriptlang.org/)。**注意，本文章以记录为主，不会将上述提到的所有工具进行详细的讲解。**

```
mkdir koa-app
cd koa-app
npm init -y
npm i koa koa-router koa-bodyparser sequelize typescript ts-node --save
npm i @types/koa @types/koa-router @types/koa-parser --dev
```

接着，在koa-app下建立文件基础结构，如下

```
koa-app
    |-- src
        |-- controller // 控制器
        |-- db // 数据库定义
        |-- exception // 异常定义
        |-- middleware // 中间件
        |-- model // 数据库模型
        |-- router // 路由
        |-- service // 服务
        |-- views // 页面文件
        |-- app.ts // 程序入口
        |-- config.ts // 配置
    |-- initDb.ts // 创建数据库脚本
    |-- package.json
    
```

### 目的

这个目录结构主要还是参照现在业界Java比较常用的工程结构，也是和后台同事还有朋友了解学习了很多。

当访问接口时会先通过router映射到对应的controller，这里的controller是会把请求的参数解析出来，交由service处理，在Java的工程中，一般会多出dao和dto层，在这里我省略剩下model层，model层主要是定义数据库模型，service会调用model与数据库做交换，并且处理数据，最后给回controller，经由controller返回。

## 最基础的服务

现在目录结构已经明确下来，我们可以开始尝试写一个最基础的服务了。在 app.ts 内，输入以下代码：

```typescript
import * as Koa from 'koa';

const app = new Koa();

app.use(async (ctx, next) => {
    await next();
    ctx.response.body = 'text/html';
    ctx.response.body = '<h1>hello world</h1>';
})

app.listen(3000);

console.log('app started at port 3000...');
```

这样就搭建了一个最基础的服务，直接在浏览器打开[localhost:3000](localhost:3000)，就可以看到hello world。

## 路由处理

在 src/router 文件夹下，建立index.ts，并输入以下代码：

```typescript
import * as Router from 'koa-router';
const router = new Router();

export default router;
```

然后改造 src/app.ts 内的代码：

```typescript
import * as Koa from 'koa';
import router from './router';

router.get('/', (ctx, next) => {
    ctx.body = 'hello world';
});

const app = new Koa();

app
    .use(router.route())
    .use(router.allowedMethods());

app.listen(3000);

console.log('app started at port 3000...');
```

这里引入了一个路由的对象，但是还没有配置路由，等后续开始写具体业务的时候再添加。

## 数据库处理

在 src/config.ts 内，输入以下代码：

```typescript
import { Options } from "sequelize/types";

export const db: Options = {
    host: 'localhost',
    dialect: 'mysql',
    database: 'rz_blog',
    username: 'root',
    password: '123456',
    pool: {
        max: 5,
        min: 0,
        idle: 1000
    }
};

export default {
    db
};
```

接着在 src/db 文件夹下，创建index.ts，并输入以下代码：

```typescript
import { db } from '../config';
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(db.database, db.username, db.password, {
    host: db.host,
    dialect: db.dialect,
    pool: db.pool
});

export default sequelize;
```

这里创建了一个sequelize的对象实例，后续会在 src/model 文件夹下定义数据模型。

到这里业务开发中需要用到的基础的设施已经搭建的差不多了，还有一些额外的设施会在后续业务开发中需要时一起实现，例如：日志、错误处理以及页面渲染等。
