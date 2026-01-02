import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm";

const ANSWERS = [
    // --- 肯定类 ---
    "是的", "毫无疑问", "绝对可以", "放手一搏", "结果是乐观的",
    "机会来了", "你会成功的", "值得尝试", "现在就是最好的时机",
    "相信你的直觉", "勇往直前", "没错", "正如你所愿",
    "这就是你要的答案", "运气站在你这边", "去行动吧",
    "不要犹豫", "你会得到支持的", "当然", "前景一片光明",
    "好事将近", "你想要的都会来", "勇敢一点", "非常有可能",
    "不要怀疑自己", "肯定会顺利", "你应该去做",
    
    // --- 否定类 ---
    "不要做", "还是算了", "结果可能不尽人意", "现在还不是时候",
    "太冒险了", "请三思", "不要冲动", "最好不要",
    "你需要放弃这个念头", "别浪费时间了", "不太可能",
    "会有阻碍", "不是个好主意", "请保持现状", "你需要等待",
    "时机不对", "成功率很低", "建议你放弃", "不太适合你",
    "这不是最好的选择", "可能会失望", "请谨慎考虑",
    
    // --- 建议/中立类 ---
    "再等等看", "也许吧", "你需要更多信息", "问问你信任的人",
    "时间会告诉你答案", "保持耐心", "大笑置之", "专注于当下",
    "不要在这个问题上纠结", "换个角度思考", "顺其自然",
    "你需要休息一下", "别想太多", "保持灵活", "从长计议",
    "留意身边的信号", "不要被情绪左右", "重新评估一下",
    "听从内心的声音", "让它过去吧", "你需要从头开始",
    "保持警惕", "享受过程", "答案就在你心中", "放慢脚步",
    "先观察一下", "不要急于决定", "给自己一些时间",
    "换个方向试试", "你会找到答案的", "一切都是最好的安排",
    "相信过程", "不要过分担心", "跟随你的心"
];

const CARD_SPACING = 260; 
const SCROLL_SPEED_MULTIPLIER = 0.25; 
const MAX_ROTATION = 50;
const CENTER_SCALE = 1.0;
const SIDE_SCALE = 0.85;
const SIDE_OPACITY = 0.5;
const MAX_DEPTH = 250; 

let handLandmarker = undefined;
let lastVideoTime = -1;
let scrollPosition = 0;
let scrollVelocity = 0;
let isRevealing = false;
let isResetPending = false;
let resetTimer = null;
let lastGesture = "NONE";
let lastGestureFrame = 0;
let gestureConfidence = 0;
let handXRelative = 0.5;
let isLoopRunning = false;
let isPaused = false; // 新增：暂停滑动状态

// DOM
const video = document.getElementById("webcam");
const carousel = document.getElementById("carousel");
const cursor = document.getElementById("hand-cursor");
const overlay = document.getElementById("overlay");
const statusText = document.getElementById("status-text");
const startBtn = document.getElementById("start-btn");

const vibrate = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
};

async function init() {
    initCards();
    initParticles();
    
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        statusText.innerHTML = "READY";
        startBtn.style.display = "block";
    } catch (e) {
        statusText.innerHTML = "ERROR: " + e;
    }
}

function initCards() {
    ANSWERS.forEach((ans, i) => {
        const container = document.createElement('div');
        container.className = 'card-container';
        container.dataset.floatOffset = (i % 8) * 0.5; // 存储浮动偏移用于呼吸效果

        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${i}`;

        const faceBack = document.createElement('div');
        faceBack.className = 'face back';

        const faceFront = document.createElement('div');
        faceFront.className = 'face front';
        faceFront.innerHTML = `
            <div class="corner-dec top-left"></div>
            <div class="corner-dec top-right"></div>
            <div class="corner-dec bottom-left"></div>
            <div class="corner-dec bottom-right"></div>
            <div class="answer-text">${ans.replace(/\n/g, '<br>')}</div>
        `;

        card.appendChild(faceBack);
        card.appendChild(faceFront);
        container.appendChild(card);
        carousel.appendChild(container);
    });
}

async function enableCam() {
    if (!handLandmarker) return;
    startBtn.style.display = 'none';
    statusText.innerText = "OPENING EYE...";
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play();
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 800);
        
        if (!isLoopRunning) {
            isLoopRunning = true;
            requestAnimationFrame(predictWebcam);
        }
        renderCarousel();
    } catch (err) {
        alert("Camera required.");
    }
}

async function predictWebcam() {
    const startTimeMs = performance.now();
    if (video.currentTime > 0 && lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
            processLandmarks(results.landmarks[0]);
        } else {
            handXRelative = 0.5;
            cursor.classList.remove("active");
        }
    }
    requestAnimationFrame(predictWebcam);
}

function processLandmarks(landmarks) {
    handXRelative = 1 - landmarks[9].x; 
    const y = landmarks[9].y;
    
    cursor.style.left = `${handXRelative * window.innerWidth}px`;
    cursor.style.top = `${y * window.innerHeight}px`;
    cursor.classList.add("active");

    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    let extendedFingers = 0;
    
    tips.forEach(idx => {
        const tip = landmarks[idx];
        const pip = landmarks[idx - 2];
        if (Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > Math.hypot(pip.x - wrist.x, pip.y - wrist.y)) {
            extendedFingers++;
        }
    });

    const currentGesture = extendedFingers >= 3 ? "OPEN_PALM" : (extendedFingers <= 1 ? "FIST" : "OTHER");
    
    const now = performance.now();
    const frameGap = now - lastGestureFrame;
    
    if (currentGesture === lastGesture) {
        gestureConfidence = Math.min(gestureConfidence + frameGap * 0.03, 1);
    } else {
        gestureConfidence = Math.max(gestureConfidence - frameGap * 0.2, 0);
    }
    lastGestureFrame = now;
    lastGesture = currentGesture;
    
    if (currentGesture === "FIST" && !isRevealing && !isResetPending) {
        if (gestureConfidence > 0.6) {
            const snapTarget = Math.round(scrollPosition);
            scrollPosition = snapTarget;
            scrollVelocity = 0;
            isRevealing = true;
            cursor.classList.add("grabbing");
            vibrate(50);
        }
    }
    
    if (currentGesture === "OPEN_PALM" && isRevealing) {
        if (!isResetPending) {
            isResetPending = true;
            
            if (resetTimer) clearTimeout(resetTimer);
            
            resetTimer = setTimeout(() => {
                if (currentGesture === "OPEN_PALM" && gestureConfidence > 0.5) {
                    resetCardState();
                }
                isResetPending = false;
            }, 150);
        }
        cursor.classList.remove("grabbing");
    } else if (currentGesture === "OTHER") {
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
        isResetPending = false;
        if (currentGesture === "OPEN_PALM") {
            cursor.classList.remove("grabbing");
        }
    }
}

function resetCardState() {
    isRevealing = false;
    isPaused = true; // 返回后进入暂停状态
    scrollVelocity = 0;

    const cards = document.querySelectorAll('.card-container');
    cards.forEach(container => {
        container.style.display = '';
        container.style.opacity = '';
        container.style.zIndex = '';
        container.style.transform = '';

        const cardInner = container.querySelector('.card');
        cardInner.style.transform = '';
        cardInner.style.boxShadow = '';
        cardInner.style.filter = '';

        const answerText = container.querySelector('.answer-text');
        if (answerText) {
            answerText.style.opacity = '0';
            answerText.style.transform = 'scale(0.8)';
        }
    });
}

function renderCarousel() {
    const deadZone = 0.12;
    let inputDelta = 0;

    if (handXRelative > 0.5 + deadZone) inputDelta = (handXRelative - (0.5 + deadZone)) * SCROLL_SPEED_MULTIPLIER;
    else if (handXRelative < 0.5 - deadZone) inputDelta = (handXRelative - (0.5 - deadZone)) * SCROLL_SPEED_MULTIPLIER;

    // 暂停状态：只有当手移动到左边或右边（超出死区）才解除暂停
    if (isPaused) {
        if (Math.abs(inputDelta) > 0.01) {
            isPaused = false; // 解除暂停，开始滑动
        } else {
            inputDelta = 0; // 保持静止
        }
    }

    if (isRevealing) {
        const snapTarget = Math.round(scrollPosition);
        scrollPosition = snapTarget;
        scrollVelocity = 0;
    } else {
        scrollVelocity += (inputDelta - scrollVelocity) * 0.06;
        scrollPosition += scrollVelocity;
    }

    const skewAngle = -scrollVelocity * 25;
    const blurAmount = Math.min(Math.abs(scrollVelocity) * 12, 6);
    const parallaxOffset = scrollVelocity * -60;

    // 呼吸效果：基于时间的正弦波，周期4秒
    const time = performance.now() / 1000;

    const cards = document.querySelectorAll('.card-container');
    const totalCards = cards.length;

    cards.forEach((container, i) => {
        const cardInner = container.querySelector('.card');
        const answerText = container.querySelector('.answer-text');

        let offset = i - scrollPosition;
        while (offset > totalCards / 2) offset -= totalCards;
        while (offset < -totalCards / 2) offset += totalCards;

        const absOffset = Math.abs(offset);
        const isCenter = absOffset < 0.5;
        const isNearCenter = absOffset < 2.5;

        if (absOffset > 6) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';

        const scale = isCenter ? CENTER_SCALE : Math.max(SIDE_SCALE, 1 - absOffset * 0.08);
        const opacity = isCenter ? 1 : Math.max(0.35, 1 - absOffset * 0.2);

        const rotateY = isCenter ? 0 : (offset < 0 ? 45 : -45);

        const translateX = offset * CARD_SPACING;
        const translateZ = isCenter ? 0 : -absOffset * MAX_DEPTH;

        // 呼吸浮动：每张卡片有不同的相位偏移
        const floatOffset = parseFloat(container.dataset.floatOffset) || 0;
        const floatY = Math.sin((time + floatOffset) * (2 * Math.PI / 4)) * 8; // 周期4秒，振幅8px

        container.style.opacity = opacity;
        container.style.zIndex = isCenter ? 1000 : Math.floor(500 - absOffset * 50);

        if (isRevealing && isCenter) {
            container.style.transform = `translateX(${translateX}px) translateY(${floatY}px) translateZ(200px) rotateY(0deg) scale(1.5)`;
            container.style.zIndex = '1000';

            cardInner.style.transform = 'rotateY(180deg)';
            cardInner.style.boxShadow = '0 4px 0 #5c4b38, 0 8px 0 #5c4b38, 0 12px 0 #5c4b38, 0 16px 20px rgba(92,75,56,0.6)';
            cardInner.style.filter = 'none';

            if(answerText) {
                answerText.style.opacity = '1';
                answerText.style.transform = 'scale(1)';
            }
        } else {
            container.style.transform = `translateX(${translateX}px) translateY(${floatY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;

            cardInner.style.transform = `rotateY(0deg) scale(${scale}) skewX(${skewAngle})`;

            if (isNearCenter) {
                cardInner.style.boxShadow = '0 2px 0 #111, 0 4px 0 #111, 0 6px 0 #111, 0 8px 15px rgba(0,0,0,0.5)';
            } else {
                cardInner.style.boxShadow = '0 2px 0 #111, 0 4px 0 #111, 0 6px 0 #111, 0 8px 15px rgba(0,0,0,0.5)';
            }

            cardInner.style.filter = Math.abs(scrollVelocity) > 0.06 ? `blur(${blurAmount}px)` : 'none';

            if(answerText) {
                answerText.style.opacity = '0';
                answerText.style.transform = 'scale(0.8)';
            }
        }
    });

    renderParticles(parallaxOffset);
    requestAnimationFrame(renderCarousel);
}

let particles = [];
let particleCanvas, particleCtx;

function initParticles() {
    particleCanvas = document.getElementById('particle-canvas');
    particleCtx = particleCanvas.getContext('2d');
    
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
    
    particles = Array.from({length: 80}, () => ({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        speed: Math.random() * 0.5 + 0.1,
        size: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? '#c084fc' : '#22d3ee',
        baseX: Math.random() * particleCanvas.width
    }));

    requestAnimationFrame(animateParticles);
}

function renderParticles(parallaxOffset) {
    if (!particleCtx) return;
    
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    particles.forEach(p => {
        p.x = p.baseX + parallaxOffset;
        if (p.x < 0) p.x += particleCanvas.width;
        if (p.x > particleCanvas.width) p.x -= particleCanvas.width;
        
        particleCtx.fillStyle = p.color;
        particleCtx.globalAlpha = 0.5;
        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        particleCtx.fill();
    });
}

function animateParticles() {
    if (!particleCtx) return;
    
    particles.forEach(p => {
        p.y += p.speed;
        if (p.y > particleCanvas.height) {
            p.y = 0;
            p.baseX = Math.random() * particleCanvas.width;
        }
    });
    
    requestAnimationFrame(animateParticles);
}

startBtn.addEventListener('click', enableCam);
init();
