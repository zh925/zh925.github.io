var defaultOptions = {
    el: 'canvas.fireworks',
    particuleNum: 20,
    colors: ['#FF1461', '#18FF92', '#5A87FF', '#FBF38C']
};
function randomInt(min, max) {
    return Math.floor(Math.random() * (max + 1 - min) + min);
}
function setCanvasSize(canvasEl) {
    canvasEl.width = window.innerWidth * 2;
    canvasEl.height = window.innerHeight * 2;
    canvasEl.style.width = window.innerWidth + 'px';
    canvasEl.style.height = window.innerHeight + 'px';
    canvasEl.style.pointerEvents = 'none';
    canvasEl.getContext('2d').scale(2, 2);
}
function fireworks(options) {
    if (options === void 0) { options = defaultOptions; }
    var canvasEl = typeof options.el === 'string' ? document.querySelector(options.el) : options.el;
    if (!canvasEl || canvasEl.nodeName.toLowerCase() !== 'canvas') {
        throw new Error('未找到canvas元素');
    }
    setCanvasSize(canvasEl);
    window.addEventListener('resize', () => {
        setCanvasSize(canvasEl);
    })
    var pointerX = 0;
    var pointerY = 0;
    var particuleNum = options.particuleNum;
    var colors = options.colors;
    var ctx = canvasEl.getContext('2d');
    var tap = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    var particules = [];
    function setParticuleDirection(x, y) {
        var length = randomInt(50, 180);
        var angle = randomInt(0, 360) * Math.PI / 180;
        var direction = [-1, 1][randomInt(0, 1)];
        var xlength = Math.cos(angle) * length * direction;
        var ylength = Math.sin(angle) * length * direction;
        return {
            x: x + xlength,
            y: y + ylength,
            length: length
        };
    }
    function createParticule(x, y) {
        var color = colors[randomInt(0, colors.length - 1)];
        var radius = randomInt(8, 16);
        var endPoint = setParticuleDirection(x, y);
        return {
            x: x,
            y: y,
            color: color,
            direction: endPoint,
            radius: radius,
            currentRadius: radius
        };
    }
    function calcParticuleCoords(particule) {
        var direction = particule.direction;
        var x = particule.x + (direction.x - pointerX) / 500 * elapsed;
        var y = particule.y + (direction.y - pointerY) / 500 * elapsed;
        var length = Math.sqrt(Math.pow(Math.abs(x - pointerX), 2) + Math.pow(Math.abs(y - pointerY), 2));
        if (length > direction.length) {
            x = direction.x;
            y = direction.y;
        }
        return { x: x, y: y };
    }
    var startTimeStamp = 0;
    var elapsed;
    var done = true;
    function drawStep(timestamp) {
        done = false;
        if (!startTimeStamp) {
            startTimeStamp = timestamp;
        }
        elapsed = timestamp - startTimeStamp;
        ctx.clearRect(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);
        for (var i = 0; i < particules.length; i++) {
            var particule = particules[i];
            var direction = particule.direction;
            var coord = calcParticuleCoords(particule);
            var radius = Math.max(particule.radius - particule.radius / 500 * elapsed, 0);
            ctx.beginPath();
            ctx.arc(coord.x, coord.y, radius, 0, 2 * Math.PI, true);
            ctx.fillStyle = particule.color;
            ctx.fill();
            if ((coord.x === direction.x && coord.y === direction.y) || radius === 0) {
                particules.splice(i, 1);
                i--;
            }
        }
        if (elapsed > 1000 || particules.length === 0) {
            particules.splice(0);
            done = true;
        }
        else {
            requestAnimationFrame(drawStep);
        }
    }
    document.addEventListener(tap, function (e) {
        if (!done) {
            return;
        }
        pointerX = e.clientX || e.touches[0].clientX;
        pointerY = e.clientY || e.touches[0].clientY;
        startTimeStamp = 0;
        elapsed = null;
        for (var i = 0; i < particuleNum; i++) {
            particules.push(createParticule(pointerX, pointerY));
        }
        requestAnimationFrame(drawStep);
    });
}
fireworks();
