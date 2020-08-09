---
title: 尝试用Koa写接口搭博客（4）- 登录注册页面
date: 2020-07-11 17:54:26
categories: 
    - [node, 尝试用Koa写接口搭博客]
tags: 
    - node
    - koa
    - sequelize
---

根据上一章立下的flag，这一章毫无疑问是搞定服务端渲染。在摸了两个星期鱼后，我终于摸了登录注册页出来。因为在写这这一部分代码的过程中修改了部分之前的代码，因为过去的也有点久了，忘记有哪些改动点了，所以这章的代码可能会有点不一样，我会把代码托管到[github](https://github.com/zh925/ruozhi-blog)上。

<!--more-->

## 模板引擎

考虑了很久，最终决定用官方示例里的[ejs](https://ejs.co/)，在这里用到koa官方提供的依赖[koa-ejs](https://github.com/koajs/ejs)。

```
cnpm i koa-ejs -S
cnpm i @types/koa-ejs -D
```

接着在src/app中增加配置：

```typescript
import * as render from 'koa-ejs';
render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'layout',
    viewExt: 'ejs',
    cache: false,
    debug: true
})
```

在src/views下新建文件`layout.ejs`，用作全局的模板。在这里引入了jq，bootstrap，并且放了一个全局的alert用于报错。代码如下：

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="//cdn.bootcdn.net/ajax/libs/twitter-bootstrap/4.5.0/css/bootstrap.min.css">

    <script src="//cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="//cdn.bootcdn.net/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
    <script src="//cdn.bootcdn.net/ajax/libs/twitter-bootstrap/4.5.0/js/bootstrap.min.js"></script>
    <title><%= title ? title + ' - Ruozhi\'s Blog' : 'Ruozhi\'s Blog' %></title>
</head>
<body>
    <div class="alert alert-danger alert-global fade" role="alert">
        <span class="alert-content"></span>
    </div>
    <%- body %>
</body>

<style>
    .alert-global {
        width: 80%;
        margin: 20px auto;
    }
</style>
</html>
```

## 静态资源

配置好模板引擎后，在项目中需要用上静态文件，例如图片，样式文件，脚本等，所有在这里引入 koa-static 处理静态文件的引用问题，安装：

```
cnpm i koa-static -S
cnpm i @types/koa-static -D
```

接着在 src/app.ts 中增加配置

```typescript
import * as serve from 'koa-static'
app.use(serve(path.resolve(__dirname, 'static')))
```

在src目录下创建static文件夹存放静态文件

## 公共js

现在用习惯了mvvm的框架，所以按着mvvm的开发习惯，在src/static/js/common.js中做了一些基础设施的准备：

```javascript
;(function () {
    window.request = {} // 存放请求方法
    const _ajax = $.ajax
    $.ajax = function(opts) { // 重新封装了ajax，用起来会舒服一些
        const onAjaxError = (res) => {
            switch (res.errCode) {
                default:
                    _.alert(res.errMsg)
            }
        }
        _ajax({
            ...opts,
            success(res) {
                if (res.code !== 200) {
                    onAjaxError(res)
                    opts.error && opts.error(res)
                    return
                }
                opts.success && opts.success(res)
            },
            error(res) {
                opts.error && opts.error(res)
            },
            conplete(res) {
                opts.complete && opts.complete(res)
            },
        })
    }

    const _ = window._ || {} // 存放一些工具方法
    _.isPhone = (phone) =>  /^[1](([3][0-9])|([4][0,1,4-9])|([5][0-3,5-9])|([6][2,5,6,7])|([7][0-8])|([8][0-9])|([9][0-3,5-9]))[0-9]{8}$/.test(phone)
    _.isEmail = (email) => /^[a-z0-9A-Z]+[- | a-z0-9A-Z . _]+@([a-z0-9A-Z]+(-[a-z0-9A-Z]+)?\\.)+[a-z]{2,}$/.test(email)

    let timeId = null
    _.alert = function(message) { // 全局alert的方法
        const alertBox = $('.alert-global')
        alertBox.find('.alert-content').html(message)
        alertBox.addClass('show')
        clearInterval(timeId)
        timeId = setInterval(function() {
            alertBox.removeClass('show')
            clearInterval(timeId)
        }, 2000)
    }
    window._ = _
})()
```

在src/static/js/api/user.js中，封装了用户模块所涉及到的接口：

```javascript
request.userLogin = function(data, opts) {
    $.ajax({
        url: '/api/user/login',
        method: 'POST',
        data,
        ...opts
    })
}

request.userRegister = function(data, opts) {
    $.ajax({
        url: '/api/user/register',
        method: 'POST',
        data,
        ...opts
    })
}
```

接着在 src/views/layout.ejs的head中引入common.js

```html
<script src="/js/common.js"></script>
```

## 路由映射

在开始写页面前，需要先配置好路由映射到页面文件。在src/router下新建viewRouter.ts，代码如下

```typescript
import * as Router from 'koa-router';
const router = new Router();

router.get('/login', async (ctx) => {
    await ctx.render('user/login', {
        title: '登录'
    })
})
router.get('/register', async (ctx) => {
    await ctx.render('user/register', {
        title: '注册'
    })
})

export default router;
```

接着修改src/router/index.ts，修改后代码如下

```typescript
import * as Router from 'koa-router';
import api from './api';
import viewRouter from './viewRouter';

const router = new Router();

router.use(api.routes());
router.use(viewRouter.routes());

export default router;
```

## 登录注册页面

### 注册页面

首先是注册的页面，在src/views/user下创建register.ejs，代码如下：

```html
<div class="container">
    <div class="card">
        <div class="card-body">
            <h3 class="card-title">注册</h3>
            <form class="needs-validation register-form" novalidate>
                <div class="form-group">
                    <label for="phone">手机号码</label>
                    <input
                        class="form-control"
                        type="text"
                        name="phone"
                        maxlength="11"
                        placeholder="请输入手机号码"
                        required
                        pattern="^1[3456789]\d{9}$"
                    >
                    <div class="invalid-feedback">
                        请输入正确的手机号码
                    </div>
                </div>
                <div class="form-group">
                    <label for="nickname">昵称</label>
                    <input
                        class="form-control"
                        type="text"
                        name="nickname"
                        placeholder="请输入昵称"
                        maxlength="8"
                        required
                    >
                    <div class="invalid-feedback">
                        请输入最多8位的昵称
                    </div>
                </div>
                <div class="form-group">
                    <label for="email">邮箱（可选）</label>
                    <input
                        class="form-control"
                        type="text"
                        name="email"
                        placeholder="请输入邮箱"
                    >
                    <div class="invalid-feedback">
                        请输入正确的邮箱
                    </div>
                </div>
                <div class="form-group">
                    <label for="gender">性别</label>
                    <select class="custom-select" name="gender">
                        <option selected value="">暂不选择</option>
                        <option value="MALE">先生</option>
                        <option value="FEMALE">女士</option>
                      </select>
                </div>
                <div class="form-group">
                    <label for="password">密码</label>
                    <input class="form-control" name="password" type="password" minlength="8" placeholder="请输入密码" required>
                    <div class="invalid-feedback">
                        请输入至少8位的密码
                    </div>
                </div>
                <div class="form-group">
                    <label for="repassword">重复密码</label>
                    <input class="form-control" name="repassword" type="password" placeholder="请输入重复密码" required>
                    <div class="invalid-feedback">
                        请输入重复密码
                    </div>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-primary btn btn-register" type="submit">
                        <span class="loading spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        注册
                    </button>
                    <a href="/login" class="btn btn-link btn-login">
                        登录
                    </a>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="/js/api/user.js"></script>
<script>
$(function() {
    const registerBtn = $('.btn-register')
    const registerForm = $('.register-form')

    /**
     * 注册表单提交
     */
     registerForm.on('submit', function(e) {
        e.preventDefault()
        this.classList.add('was-validated')
        if (!this.checkValidity()) {
            return
        }
        registerBtn.attr('disabled', true)
        registerRequestFunc()
    })

    /**
     * 用户注册
     */
    function registerRequestFunc() {
        const formData = registerForm.serializeArray().reduce((data, item) => {
            data[item.name] = item.value
            return data
        }, {})
        if (!formData.gender) {
            delete formData.gender
        }
        request.userRegister(formData, {
            success(res) {
                if (res.code !== 200) {
                    return
                }
                window.location.replace('/login')
            },
            complete(res) {
                registerBtn.removeAttr('disabled')
            }
        })
    }
})
</script>

<style>
    body {
        width: 100%;
        height: 100vh;
        background: #b8e5f8 url(/images/login_bg.png) no-repeat center / cover;
    }
    .card {
        min-width: 400px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .loading {
        display: none
    }
    .btn-register:disabled .loading {
        display: inline-block;
    }
</style>
```

### 登陆页面

在src/views/user下创建login.ejs，代码如下

```html
<div class="container">
    <div class="card">
        <div class="card-body">
            <h3 class="card-title">登录</h3>
            <form class="needs-validation login-form" novalidate>
                <div class="form-group">
                    <label for="phone">手机号码</label>
                    <input name="phone" type="text" class="form-control" placeholder="请输入手机号码" required>
                    <div class="invalid-feedback">
                        请输入手机号码
                    </div>
                </div>
                <div class="form-group">
                    <label for="passsword">密码</label>
                    <input name="password" type="password" class="form-control" placeholder="请输入密码" required>
                    <div class="invalid-feedback">
                        请输入密码
                    </div>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-primary btn-login" type="submit">
                        <span class="loading spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        登录
                    </button>
                    <a href="/register" class="btn btn-link btn-register">
                        注册
                    </a>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="/js/api/user.js"></script>
<script>
$(function() {
    const loginBtn = $('.btn-login')
    $('.login-form').on('submit', function(e) {
        e.preventDefault()
        this.classList.add('was-validated')
        if(!this.checkValidity()) {
            return
        }
        loginBtn.attr('disabled', true)
        loginSubmit.call(this)
    })

    /**
     * 登录表单提交
     */
    function loginSubmit() {
        const formData = $(this).serializeArray().reduce((data, item) => {
            data[item.name] = item.value
            return data
        }, {})
        request.userLogin(formData, {
            complete() {
                loginBtn.removeAttr('disabled')
            }
        })
    }
})
</script>

<style>
    body {
        width: 100%;
        height: 100vh;
        background: #b8e5f8 url(/images/login_bg.png) no-repeat center / cover;
    }
    .card {
        min-width: 400px;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    .loading {
        display: none
    }
    .btn-login:disabled .loading {
        display: inline-block;
    }
</style>
```

## 体验

如果之前是看着第一二三章的代码写过来的，可能会在路由部分有报错，我已经把源码托管到github上，可以参照github的代码进行修改。

这样登陆注册的功能就写完了，在本机想要体验调试的话，需要先准备好[mysql](https://dev.mysql.com/downloads/mysql/)。

运行 npm run init-db 初始化数据库。

单纯调试接口可以使用[postman](https://www.postman.com/)进行调试。

## 下一步计划

有一件事一直想要做但是一直没有做，就是日志输出，到现在为止项目内还没有集成日志的模块，因为一直在纠结（日志的中间件实在有点多），暂时还没有太多的时间去逐一的了解他们的不同处，接下来我会开始往这个方面努力，在下一章把日志的模块补上，然后就是设计一下博文的功能了。
