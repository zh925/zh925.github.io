---
title: JavaScript的并发模型，事件循环，微任务及运行时
date: 2023-05-05 15:56:56
categories:
    - [JavaScript]
tags: 
    - JavaScript
    - Event Loop
    - microtask
---

这一篇起初是想把事件循环和微任务给过一遍，后面看文档和材料的时候，发现现在网络上的文章比较笼统，还是得要把标题的这几个概念一起理清楚，才能更好的理解事件循环和微任务这一块的内容。

<!-- more -->

# 并发模型

JavaScript 有一个基于事件循环的并发模型，事件循环负责执行代码、收集和处理事件以及执行队列中的子任务。

## 栈

函数调用形成的由若干帧组成的栈

```javascript
function foo(b) {
    let a = 10
    return a + b + 10
}

function bar(x) {
    let y = 3
    return foo(x * y)
}

console.log(bar(7))
```

当调用bar时，会创建一个帧并压入栈中。帧包含了bar的参数和局部变量。当bar调用foo时。创建第二帧并压入栈，放在第一帧上，帧包含了foo的参数和局部变量。当foo执行完毕并返回时，第二帧被弹出栈，当bar也执行完毕并返回时，第一帧也被弹出，此时栈被清空。

## 堆

对象被分配在堆中，堆是用来表示一大块（通常是非结构化的）内存区域的计算技术语。

## 消息队列

待处理消息的消息队列，每一个消息都关联着一个用以处理这个消息的回调函数。

在事件循环期间的某个时刻，运行时会从最先进入队列的消息开始处理队列中的消息。被处理的消息会被转移出队列，并作为输入参数来调用与之关联的函数。正如前面所提到的，调用一个函数总是会为其创造一个新的栈帧。

函数的处理会一直进行到执行栈再次为空为止；然后事件循环将会处理队列中的下一个消息。

## 事件循环

事件循环一般按照类似如下的方式被实现

```javascript
while (queue.waitForMessage()) {
    queue.processNextMessage()
}
```

queue.waitForMessage()会同步地等待消息到达。

### 执行至完成

每一个消息完整地执行后，其他消息才会被执行。带来的特性：当一个函数执行时，它不会被抢占，只有在它运行完毕之后才会去运行任何其他的代码，才能修改这个函数操作的数据。缺点在于，当一个消息需要太长时间才能处理完毕时，Web应用程序就无法处理与用户的交互。

### 添加消息

在浏览器中，每当一个事件发生并且有一个事件监听器绑定在该事件上时，一个消息就会被添加进消息队列。如果没有事件监听器，这个时间将会丢失。所以当一个带有点击事件处理器的元素被点击时，就会像其他时间一样产生一个类似的消息。

## 永不阻塞

JavaScript 的事件循环模型与许多其他语言不同的一个非常有趣的特性是，它永不阻塞。处理 I/O 通常通过事件和回调来执行，所以当一个应用正等待一个 IndexedDB 查询返回或者一个 XHR 请求返回时，它仍然可以处理其他事情，比如用户输入。

# 微任务与运行时

本质上JavaScript是一门单线程语言。随着电脑性能提升，找到一种突破传统单线程语言限制的方法变得很有必要。自从setTimeout和setInterval加入webAPI后，浏览器提供的JavaScript环境就已经逐渐开始包含了任务安排、多线程应用开发等强大的特性。

## JavaScript 执行上下文

当一段JavaScript代码在运行的时候，它实际上是运行在执行上下文中的。下面3钟类型的代码会创建一个新的执行上下文：

- 全局上下文是为运行代码主体而创建的执行上下文。也就是说它是为那些存在于JavaScript函数之外的任何代码而创建的。

- 每个函数会在执行的时候创建自己的执行上下文。这个上下文就是通常说的“本地上下文”。

- 使用eval函数也会创建一个新的执行上下文。

每一个上下文的本质都是一种作用域的层级。每个代码段开始执行的时候都会创建一个新的上下文来运行它，并且在代码退出的时候销毁掉。

```javascript
let outputElem = document.getElementById("output");

let userLanguages = {
  "Mike": "en",
  "Teresa": "es"
};

function greetUser(user) {
  function localGreeting(user) {
    let greeting;
    let language = userLanguages[user];

    switch(language) {
      case "es":
        greeting = `¡Hola, ${user}!`;
        break;
      case "en":
      default:
        greeting = `Hello, ${user}!`;
        break;
    }
    return greeting;
  }
  outputElem.innerHTML += localGreeting(user) + "<br>\r";
}

greetUser("Mike");
greetUser("Teresa");
greetUser("Veronica");
```
这段程序代码包含了三个执行上下文，其中有些会在程序运行的过程中多次创建和销毁。每个上下文创建的时候会被推入执行上下文栈。当退出的时候，它会从上下文栈中移除。

- 程序开始运行时，全局上下文就会被创建好。

    - 当执行到 greetUser("Mike") 的时候会为 greetUser() 函数创建一个它的上下文。这个执行上下文会被推入执行上下文栈中。

        - 当 greetUser() 调用 localGreeting()的时候会为该方法创建一个新的上下文。并且在 localGreeting() 退出的时候它的上下文也会从执行栈中弹出并销毁。程序会从栈中获取下一个上下文并恢复执行，也就是从 greetUser() 剩下的部分开始执行。

        - greetUser() 执行完毕并退出，其上下文也从栈中弹出并销毁。

    - 当 greetUser("Teresa") 开始执行时，程序又会为它创建一个上下文并推入栈顶。

        - 当 greetUser() 调用 localGreeting()的时候另一个上下文被创建并用于运行该函数。当 localGreeting() 退出的时候它的上下文也从栈中弹出并销毁。 greetUser() 得到恢复并继续执行剩下的部分。

        - greetUser() 执行完毕并退出，其上下文也从栈中弹出并销毁。

    - 然后执行到 greetUser("Veronica") 又再为它创建一个上下文并推入栈顶。

        - 当 greetUser() 调用 localGreeting()的时候，另一个上下文被创建用于执行该函数。当 localGreeting()执行完毕，它的上下文也从栈中弹出并销毁。

        - greetUser() 执行完毕退出，其上下文也从栈中弹出并销毁。

- 主程序退出，全局执行上下文从执行栈中弹出。此时栈中所有的上下文都已经弹出，程序执行完毕。

以这种方式来使用执行上下文，使得每个程序和函数都能够拥有自己的变量和其他对象。每个上下文还能够额外的跟踪程序中下一行需要执行的代码以及一些对上下文非常重要的信息。以这种方式来使用上下文和上下文栈，使得我们可以对程序运行的一些基础部分进行管理，包括局部和全局变量、函数的调用与返回等。

关于递归函数——即多次调用自身的函数，需要特别注意：每次递归调用自身都会创建一个新的上下文。这使得 JavaScript 运行时能够追踪递归的层级以及从递归中得到的返回值，但这也意味着每次递归都会消耗内存来创建新的上下文。

## JavaScript运行时

JavaScript运行时实际上维护了一组用于执行JavaScript代码的代理。每个代理由执行上下文、主线程、一组可能创建用于执行worker的额外的线程集合、一个任务队列一级一个微任务队列构成。除了主线程之外，其他组成部分对该代理都是唯一的。

### 事件循环

每个代理都是由事件循环驱动的，事件循环负责收集事件（用户或非用户事件），然后排列任务以便在合适的时候执行回调。在这里有一个比较重要的点，就是他会先执行处于等待中的任务（宏任务），然后是微任务，然后在开始下一次循环之前执行一些必要的渲染和绘制操作。这一段实际上就是执行上文中消息队列的操作，只是这里将任务分解成任务（宏任务）与微任务。

### 任务与微任务

任务是指计划由标准的机制执行的JavaScript，如程序初始化，事件触发的会掉等。在我们的代码中可以简单的理解为某一行JavaScript语句。添加任务的方式除了使用事件，还可以使用 setTimeout() 或者 setInterval()来添加。

任务队列和微任务队列的区别：

- 在每一次事件循环开始迭代的时候，运行时都会执行在任务队列中的每个任务。在每次迭代开始之后加入到队列中的任务需要在下一次跌迭代开始之后才会被执行。

- 每次当一个任务退出且执行上下文为空的是，微任务队列中的每一个微任务会被依次执行。不同的是它会等到微任务队列为空才会停止执行，即便中途有微任务加入。

也就是说，当事件循环开始之后，新加入到任务队列的任务不会在本次事件循环中被执行；而新加入到微任务队列中的微任务会在本次事件循环中被执行，直到微任务队列为空才会停止。

微任务可以解决代码阻塞或者进入无限循环，导致的浏览器卡死的问题。通过将代码安排在下一次事件循环开始之前运行而不是必须要等到下一次开始之后才执行。

添加微任务的方式：

- queueMicrotask()

- setTimeout()

- setInterval()

- promise

*** 对于事件循环中的微任务队列及执行，可以参考文章：[tasks、microtasks、queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/) ***

# 例子

```javascript
async function async1() {
    console.log('async1 start')
    await async2()
    console.log('async1 end')
}

async function async2() {
    console.log('async2')
}

console.log('script start')
setTimeout(function() {
    console.log('setTimeout')
}, 0)
async1()
new Promise(function (resolve) {
    console.log('promise1')
    resolve()
}).then(function() {
    console.log('promise2')
}).then(function() {
    console.log('promise3')
})
console.log('script end')

/**
 * 执行结果：
 * script start
 * async1 start
 * async2
 * promise1
 * script end
 * async1 end
 * promise2
 * promise3
 * setTimeout
 */
```


```javascript
function func1() {
    console.log('func1 start')
    return new Promise(resolve => {
        resolve('ok')
    })
}

function func2() {
    console.log('func2 start')
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('OK')
        }, 10)
    })
}

console.log(1)
setTimeout(async() => {
    console.log(2)
    await func1()
    console.log(3)
}, 20)
for(let i = 0; i < 90000000;i++) {}
console.log(4)
func1().then(result => {
    console.log(5)
})
func2().then(result => {
    console.log(6)
})
setTimeout(() => {
    console.log(7)
}, 0)
console.log(8)

/**
 * 执行结果：
 * 1
 * 4
 * func1 start
 * func2 start
 * 8
 * 5
 * 7
 * 2
 * func1 start
 * 3
 * 6
 */
```
