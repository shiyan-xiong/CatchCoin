// 游戏状态
const gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    highScore: localStorage.getItem('catchCoinHighScore') || 0,
    speed: 1, // 1-10整数
    gameStartTime: null,
    missedCoins: 0,
    totalPausedTime: 0,
    lastPauseTime: null
};

// 主题配置
const themes = {
    grassland: {
        pageBg: '#b0deefff', // 天空蓝
        gameAreaBg: '#a7f1a788', // 半透明柔和草地绿
        textColor: '#2F4F2F', // 深绿
        accentColor: '#FFD700', // 金色
        iconColor: '#1E3A26' // 深绿
    },
    lavender: {
        pageBg: '#E6E6FA', // 淡紫
        gameAreaBg: '#DDA0DD88', // 半透明薰衣草紫
        textColor: '#4B0082', // 暗紫
        accentColor: '#8A2BE2', // 中紫
        iconColor: '#2E1065' // 深紫
    },
    night: {
        pageBg: '#0c0c0bff', // 黑色
        gameAreaBg: '#1a1a1a88', // 半透明深灰
        textColor: '#FFFFFF', // 白色
        accentColor: '#FFD700', // 金色
        iconColor: '#E0E0E0' // 浅灰
    },
    daydream: {
        pageBg: '#9fd4f0ff', // 淡蓝
        gameAreaBg: '#f2e5bae9', // 半透明米白
        textColor: '#369ef3ff', // 钢蓝
        accentColor: '#FF69B4', // 粉红
        iconColor: '#6A5ACD' // 蓝紫
    }
};

// DOM 元素
const gameCanvas = document.getElementById('gameCanvas');
const plate = document.getElementById('plate');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const speedEl = document.getElementById('speed');
const missedCoinsEl = document.getElementById('missedCoins');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const restartBtn = document.getElementById('restartBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const pageBgColorInput = document.getElementById('pageBgColor');
const bgColorInput = document.getElementById('bgColor');
const gameArea = document.querySelector('.game-area');
const body = document.body;
const themeButtons = document.querySelectorAll('.theme-btn');
const iconBtns = document.querySelectorAll('.icon-btn');
const labels = document.querySelectorAll('.label');

// 盘子位置
let platePosition = 50; // 百分比
let mouseX = null; // 鼠标X坐标

// 掉落物品数组
const fallingItems = [];

// 初始化
function init() {
    updateHighScore();
    loadBackgroundColors();
    loadTheme();
    setupEventListeners();
    startGameLoop();
    updatePlayPauseButton();
    updateIconColors();
    // 确保设置面板一开始不显示
    settingsPanel.classList.remove('open');
    // 确保游戏结束面板一开始不显示
    const gameOverModal = document.getElementById('gameOverModal');
    if (gameOverModal) {
        gameOverModal.style.display = 'none';
    }
}

// 设置事件监听器
function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    restartBtn.addEventListener('click', restartGame);
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettings.addEventListener('click', toggleSettings);
    pageBgColorInput.addEventListener('input', changePageBackgroundColor);
    bgColorInput.addEventListener('input', changeBackgroundColor);
    
    // 主题按钮
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 鼠标控制盘子 - 使用requestAnimationFrame优化流畅度
    gameCanvas.addEventListener('mousemove', (e) => {
        if (gameState.isRunning && !gameState.isPaused) {
            const rect = gameCanvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
        }
    });
    
    gameCanvas.addEventListener('mouseleave', () => {
        mouseX = null;
    });
    
    // 点击外部关闭设置面板
    document.addEventListener('click', (e) => {
        // 如果设置面板是打开的，并且点击的不是设置面板内部或设置按钮
        if (settingsPanel.classList.contains('open')) {
            const isClickInsidePanel = settingsPanel.contains(e.target);
            const isClickOnSettingsBtn = settingsBtn.contains(e.target);
            
            if (!isClickInsidePanel && !isClickOnSettingsBtn) {
                toggleSettings();
            }
        }
    });
    
    // 重新开始游戏按钮事件监听
    const restartGameBtn = document.getElementById('restartGameBtn');
    restartGameBtn.addEventListener('click', () => {
        const gameOverModal = document.getElementById('gameOverModal');
        gameOverModal.style.display = 'none';
        restartGame();
    });
}



// 更新盘子位置
function updatePlatePosition() {
    plate.style.left = platePosition + '%';
    plate.style.transform = 'translateX(-50%)';
}

// 切换开始/暂停
function togglePlayPause() {
    if (!gameState.isRunning) {
        // 开始新游戏
        gameState.score = 0;
        gameState.speed = 1;
        gameState.missedCoins = 0;
        gameState.gameStartTime = Date.now();
        gameState.totalPausedTime = 0;
        gameState.lastPauseTime = null;
        clearFallingItems();
        updateScore();
        updateMissedCoins();
        updateSpeed();
        gameState.isRunning = true;
        gameState.isPaused = false;
    } else {
        // 暂停/继续
        gameState.isPaused = !gameState.isPaused;
        
        if (gameState.isPaused) {
            // 记录暂停开始时间
            gameState.lastPauseTime = Date.now();
        } else {
            // 计算暂停持续时间并累加到总暂停时间
            if (gameState.lastPauseTime) {
                gameState.totalPausedTime += (Date.now() - gameState.lastPauseTime);
                gameState.lastPauseTime = null;
            }
        }
    }
    updatePlayPauseButton();
    updateButtonStates();
}



// 更新开始/暂停按钮图标
function updatePlayPauseButton() {
    if (!gameState.isRunning) {
        // 显示播放图标
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.disabled = false;
    } else if (gameState.isPaused) {
        // 显示播放图标（继续）
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.disabled = false;
    } else {
        // 显示暂停图标
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playPauseBtn.disabled = false;
    }
}

// 重玩游戏
function restartGame() {
    // 清除当前游戏状态
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.speed = 1;
    gameState.missedCoins = 0;
    gameState.gameStartTime = null;
    gameState.totalPausedTime = 0;
    gameState.lastPauseTime = null;
    
    clearFallingItems();
    updateScore();
    updateMissedCoins();
    updateSpeed();
    
    // 直接开始新的一局
    gameState.score = 0;
    gameState.speed = 1;
    gameState.missedCoins = 0;
    gameState.gameStartTime = Date.now();
    gameState.isRunning = true;
    gameState.isPaused = false;
    
    updatePlayPauseButton();
    updateButtonStates();
}

// 更新按钮状态
function updateButtonStates() {
    if (!gameState.isRunning) {
        // 游戏未开始
        playPauseBtn.disabled = false;
        restartBtn.disabled = true;
    } else if (gameState.isPaused) {
        // 游戏暂停
        playPauseBtn.disabled = false;
        restartBtn.disabled = false;
    } else {
        // 游戏进行中
        playPauseBtn.disabled = false;
        restartBtn.disabled = false;
    }
}

// 清除所有掉落物品
function clearFallingItems() {
    // 安全移除所有物品
    while (fallingItems.length > 0) {
        const item = fallingItems.pop();
        if (item && item.element && item.element.parentNode) {
            try {
                item.element.remove();
            } catch (error) {
                // 忽略DOM移除错误
            }
        }
    }
    // 清空数组
    fallingItems.length = 0;
}

// 创建掉落物品
function createFallingItem() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const types = ['big-coin', 'small-coin', 'stone'];
    const weights = [0.25, 0.45, 0.3]; // 大金币25%，小金币45%，石头30%
    
    const random = Math.random();
    let type = 'small-coin';
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            type = types[i];
            break;
        }
    }
    
    const item = document.createElement('div');
    item.className = `falling-item ${type}`;
    
    // 获取物品尺寸
    let itemWidth = 25;
    let itemHeight = 25;
    if (type === 'big-coin') {
        itemWidth = 40;
        itemHeight = 40;
    } else if (type === 'stone') {
        itemWidth = 35;
        itemHeight = 35;
    }
    // 确保物品完全显示在游戏区域内
    const canvasWidth = gameCanvas.offsetWidth;
    // 计算物品左上角的x坐标，确保物品完全显示在游戏区域内
    const itemLeft = Math.random() * (canvasWidth - itemWidth);
    item.style.left = itemLeft + 'px';
    item.style.top = '-' + itemHeight + 'px';
    
    gameCanvas.appendChild(item);
    
    fallingItems.push({
        element: item,
        type: type,
        x: itemLeft + (itemWidth / 2), // 记录物品中心x坐标，用于碰撞检测
        y: -itemHeight,
        width: itemWidth,
        height: itemHeight,
        speed: 2 * Math.pow(1.3, gameState.speed - 1) // 速度随等级指数增长：等级1=2，等级2=2.6，等级3=3.38，等级4=4.39，等级5=5.71
    });
}

// 更新掉落物品
function updateFallingItems() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // 预计算不变的值，减少循环内计算开销
    const canvasHeight = gameCanvas.offsetHeight;
    // 调整盘子的有效碰撞区域，使检测更宽松
    const plateTop = canvasHeight - 100; // 盘子顶部位置
    const plateBottom = canvasHeight - 20; // 盘子底部位置
    const plateCenterX = (platePosition / 100) * gameCanvas.offsetWidth;
    const plateWidth = 120; // 盘子有效碰撞宽度
    const plateLeft = plateCenterX - plateWidth / 2;
    const plateRight = plateCenterX + plateWidth / 2;
    
    // 处理掉出画布的物品，先标记后统一移除，减少数组操作开销
    const itemsToRemove = [];
    
    // 缓存数组长度，避免在循环中重复计算
    const itemsLength = fallingItems.length;
    for (let i = 0; i < itemsLength; i++) {
        const item = fallingItems[i];
        
        // 检查物品是否已被处理
        if (item.isHandled) {
            itemsToRemove.push(i);
            continue;
        }
        
        // 更新位置
        item.y += item.speed;
        
        // 使用缓存的物品尺寸，避免重复获取
        const itemWidth = item.width;
        const itemHeight = item.height;
        
        // 计算物品边界
        const itemLeft = item.x - (itemWidth / 2);
        const itemRight = item.x + (itemWidth / 2);
        const itemBottom = item.y + itemHeight;
        
        // 碰撞检测
        let shouldRemove = false;
        
        // 所有物品的碰撞检测：与盘子有重叠即判定接住
        if (itemBottom >= plateTop && item.y <= plateBottom) {
            // 检查水平方向是否重叠
            if (itemRight >= plateLeft && itemLeft <= plateRight) {
                // 接住了
                handleCatch(item);
                shouldRemove = true;
            }
        }
        
        // 检查是否掉落到底部
        if (item.y > canvasHeight) {
            // 统计漏接的金币
            if (item.type === 'big-coin' || item.type === 'small-coin') {
                // 大金币漏接算2分，小金币漏接算1分
                if (item.type === 'big-coin') {
                    gameState.missedCoins += 2;
                } else {
                    gameState.missedCoins++;
                }
                updateMissedCoins();
                
                // 检查游戏结束条件
                if (gameState.missedCoins >= 50) {
                    gameOver();
                    return; // 游戏结束后立即返回，不再处理后续物品
                }
            }
            shouldRemove = true;
        }
        
        if (shouldRemove) {
            itemsToRemove.push(i);
        } else {
            // 直接更新DOM样式，减少属性访问
            item.element.style.top = `${item.y}px`;
        }
    }
    
    // 统一处理需要移除的物品，从后往前移除，避免索引混乱
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        const index = itemsToRemove[i];
        // 安全检查：确保索引有效
        if (index >= 0 && index < fallingItems.length) {
            const item = fallingItems[index];
            // 移除DOM元素
            if (item.element && item.element.parentNode) {
                item.element.remove();
            }
            // 从数组中移除
            fallingItems.splice(index, 1);
        }
    }
}

// 游戏结束处理
function gameOver() {
    // 停止游戏
    gameState.isRunning = false;
    gameState.isPaused = false;
    
    // 显示自定义游戏结束弹窗
    const gameOverModal = document.getElementById('gameOverModal');
    const finalScoreEl = document.getElementById('finalScore');
    finalScoreEl.textContent = gameState.score;
    gameOverModal.style.display = 'flex';
    
    // 清除所有掉落物品
    clearFallingItems();
    
    // 更新界面
    updateScore();
    updateSpeed();
    updatePlayPauseButton();
    updateButtonStates();
}

// 处理接住物品
function handleCatch(item) {
    let points = 0;
    
    if (item.type === 'big-coin') {
        points = 2;
    } else if (item.type === 'small-coin') {
        points = 1;
    } else if (item.type === 'stone') {
        points = -1;
    }
    
    gameState.score = Math.max(0, gameState.score + points);
    updateScore();
    
    // 显示得分动画
    showScorePopup(item.x, item.y, points);
    
    // 不需要在这里移除物品，updateFallingItems函数会统一处理
    // 只需要标记物品为已处理
    item.isHandled = true;
}

// 显示得分弹窗
function showScorePopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = `score-popup ${points > 0 ? 'positive' : 'negative'}`;
    popup.textContent = points > 0 ? `+${points}` : `${points}`;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
    gameCanvas.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 1000);
}

// 更新得分
function updateScore() {
    scoreEl.textContent = gameState.score;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('catchCoinHighScore', gameState.highScore);
        updateHighScore();
    }
}

// 更新最高分
function updateHighScore() {
    highScoreEl.textContent = gameState.highScore;
}

// 更新速度
function updateSpeed() {
    speedEl.textContent = Math.round(gameState.speed);
}

// 更新漏接金币
function updateMissedCoins() {
    missedCoinsEl.textContent = gameState.missedCoins;
}

// 增加速度
function increaseSpeed() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const now = Date.now();
    const pausedTime = gameState.totalPausedTime + (gameState.lastPauseTime ? (now - gameState.lastPauseTime) : 0);
    const actualGameTime = now - gameState.gameStartTime - pausedTime;
    const elapsedMinutes = actualGameTime / (1000 * 60);
    
    // 计算目标速度：每2.5分钟增加1级，最高5级
    const targetSpeed = Math.min(5, Math.floor(elapsedMinutes / 2.5) + 1);
    
    if (gameState.speed !== targetSpeed) {
        gameState.speed = targetSpeed;
        updateSpeed();
    }
}

// 切换设置面板
function toggleSettings() {
    const isOpen = settingsPanel.classList.toggle('open');
    if (isOpen) {
        // 设置面板打开，隐藏设置按钮
        settingsBtn.style.display = 'none';
    } else {
        // 设置面板关闭，显示设置按钮
        settingsBtn.style.display = 'flex';
    }
}

// 应用主题
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    
    body.style.background = theme.pageBg;
    gameArea.style.background = theme.gameAreaBg;
    body.style.color = theme.textColor;
    
    // 设置CSS变量，用于主题颜色
    document.documentElement.style.setProperty('--accent-color', theme.accentColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    
    // 更新图标颜色
    iconBtns.forEach(btn => {
        btn.style.color = theme.iconColor;
        const icon = btn.querySelector('.icon');
        if (icon) {
            icon.style.fill = 'currentColor';
        }
    });
    
    // 更新标签颜色
    labels.forEach(label => {
        label.style.color = theme.accentColor;
    });
    
    // 更新设置按钮图标颜色
    const settingsIcon = settingsBtn.querySelector('svg');
    if (settingsIcon) {
        settingsIcon.setAttribute('stroke', theme.iconColor);
    }
    
    // 更新所有文字颜色
    const allTextElements = document.querySelectorAll('#score, #highScore, #speed, #missedCoins');
    allTextElements.forEach(el => {
        el.style.color = theme.textColor;
    });
    
    // 保存主题
    localStorage.setItem('catchCoinTheme', themeName);
    localStorage.setItem('catchCoinPageBgColor', theme.pageBg);
    localStorage.setItem('catchCoinBgColor', theme.gameAreaBg);
    
    // 更新颜色选择器
    pageBgColorInput.value = theme.pageBg;
    bgColorInput.value = theme.gameAreaBg;
}

// 更新图标颜色（根据背景亮度自动调整）
function updateIconColors() {
    const computedStyle = window.getComputedStyle(body);
    const bgColor = computedStyle.backgroundColor;
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        const iconColor = brightness > 128 ? '#333' : '#fff';
        iconBtns.forEach(btn => {
            const currentTheme = localStorage.getItem('catchCoinTheme');
            if (!currentTheme) {
                btn.style.color = iconColor;
                const icon = btn.querySelector('.icon');
                if (icon) {
                    icon.style.fill = 'currentColor';
                    icon.style.stroke = 'currentColor';
                }
            }
        });
        
        // 设置按钮图标颜色
        const settingsIcon = settingsBtn.querySelector('svg');
        if (settingsIcon) {
            settingsIcon.setAttribute('stroke', iconColor);
        }
    }
}

// 加载主题
function loadTheme() {
    const savedTheme = localStorage.getItem('catchCoinTheme');
    if (savedTheme && themes[savedTheme]) {
        applyTheme(savedTheme);
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === savedTheme) {
                btn.classList.add('active');
            }
        });
    }
}

// 改变网页背景颜色
function changePageBackgroundColor(e) {
    const color = e.target.value;
    body.style.background = color;
    localStorage.setItem('catchCoinPageBgColor', color);
    localStorage.removeItem('catchCoinTheme'); // 清除主题
    themeButtons.forEach(btn => btn.classList.remove('active'));
    updateIconColors();
}

// 改变游戏区域背景颜色
function changeBackgroundColor(e) {
    const color = e.target.value;
    gameArea.style.background = color;
    localStorage.setItem('catchCoinBgColor', color);
    localStorage.removeItem('catchCoinTheme'); // 清除主题
    themeButtons.forEach(btn => btn.classList.remove('active'));
}

// 加载保存的背景颜色
function loadBackgroundColors() {
    const savedTheme = localStorage.getItem('catchCoinTheme');
    if (!savedTheme) {
        const savedPageColor = localStorage.getItem('catchCoinPageBgColor');
        if (savedPageColor) {
            body.style.background = savedPageColor;
            pageBgColorInput.value = savedPageColor;
        }
        
        const savedColor = localStorage.getItem('catchCoinBgColor');
        if (savedColor) {
            gameArea.style.background = savedColor;
            bgColorInput.value = savedColor;
        }
    }
}

// 平滑更新盘子位置
function smoothUpdatePlate() {
    if (mouseX !== null && gameState.isRunning && !gameState.isPaused) {
        const rect = gameCanvas.getBoundingClientRect();
        platePosition = (mouseX / rect.width) * 100;
        platePosition = Math.max(5, Math.min(95, platePosition));
        updatePlatePosition();
    }
    requestAnimationFrame(smoothUpdatePlate);
}

// 游戏主循环
function startGameLoop() {
    let lastTime = Date.now();
    let itemSpawnTimer = 0;
    // 调整物品生成间隔为500ms，避免生成太快导致性能问题
    const itemSpawnInterval = 300; // 每0.5秒生成一个物品
    
    function gameLoop() {
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        
        if (gameState.isRunning && !gameState.isPaused) {
            // 生成物品
            itemSpawnTimer += deltaTime;
            if (itemSpawnTimer >= itemSpawnInterval) {
                createFallingItem();
                itemSpawnTimer = 0;
            }
            
            // 更新掉落物品
            updateFallingItems();
            
            // 增加速度
            increaseSpeed();
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
    smoothUpdatePlate(); // 启动盘子平滑更新
}

// 初始化游戏
init();

