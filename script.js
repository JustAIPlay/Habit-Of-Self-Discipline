// 初始化API基础URL
const API_BASE_URL = 'http://localhost:5000/api';

// 本地存储键名
const STORAGE_KEYS = {
    USER_PROGRESS: 'user_progress',
    TASKS: 'tasks',
    LAST_FETCH_TIME: 'last_fetch_time',
    NETWORK_STATUS: 'network_status'
};

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟

// 网络状态
let isOnline = navigator.onLine;

// 监听网络状态变化
window.addEventListener('online', () => {
    isOnline = true;
    hideError();
    refreshAllData();
    showToast('网络已连接，数据已更新');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showError('网络已断开，使用缓存数据');
});

// 显示加载状态
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
    }
}

// 隐藏加载状态
function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
    }
}

// 显示错误提示
function showError(message) {
    // 检查是否已存在错误提示，避免重复显示
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.textContent = message || '操作失败，请稍后重试';
        return;
    }
    
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-message';
    errorContainer.textContent = message || '操作失败，请稍后重试';
    
    document.body.appendChild(errorContainer);
    
    // 3秒后自动消失
    setTimeout(() => {
        hideError();
    }, 3000);
}

// 隐藏错误提示
function hideError() {
    const errorContainer = document.querySelector('.error-message');
    if (errorContainer) {
        errorContainer.classList.add('fade-out');
        setTimeout(() => {
            if (errorContainer.parentNode) {
                document.body.removeChild(errorContainer);
            }
        }, 500);
    }
}

// 显示成功提示
function showSuccess(title, message) {
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-icon">✓</div>
        <div class="success-title">${title || '操作成功'}</div>
        <div class="success-content">${message || ''}</div>
    `;
    document.body.appendChild(successMessage);
    
    // 3秒后自动消失
    setTimeout(() => {
        successMessage.classList.add('fade-out');
        setTimeout(() => {
            if (successMessage.parentNode) {
                document.body.removeChild(successMessage);
            }
        }, 500);
    }, 3000);
}

// 显示轻提示
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 2秒后自动消失
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 2000);
}

// 通用数据获取函数，支持缓存
async function fetchData(url, storageKey, processData) {
    if (!isOnline) {
        const cachedData = localStorage.getItem(storageKey);
        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            } catch (e) {
                console.warn(`缓存数据解析失败: ${storageKey}`, e);
            }
        }
        showError('网络已断开，无法获取最新数据');
        return null;
    }
    
    // 检查缓存
    const cachedData = localStorage.getItem(storageKey);
    const lastFetchTime = localStorage.getItem(STORAGE_KEYS.LAST_FETCH_TIME);
    const now = Date.now();
    
    // 如果有缓存且未过期，使用缓存数据
    if (cachedData && lastFetchTime && (now - parseInt(lastFetchTime)) < CACHE_EXPIRY) {
        try {
            return JSON.parse(cachedData);
        } catch (e) {
            console.warn(`缓存数据解析失败: ${storageKey}`, e);
            // 解析失败，继续获取新数据
        }
    }
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result.code === 0) {
            // 更新缓存
            localStorage.setItem(storageKey, JSON.stringify(result.data));
            localStorage.setItem(STORAGE_KEYS.LAST_FETCH_TIME, now.toString());
            return result.data;
        } else {
            throw new Error(result.message || '请求失败');
        }
    } catch (error) {
        console.error(`API请求失败: ${url}`, error);
        // 如果有缓存，在请求失败时使用缓存
        if (cachedData) {
            showToast('使用缓存数据，请检查网络连接');
            try {
                return JSON.parse(cachedData);
            } catch (e) {
                console.warn(`缓存数据解析失败: ${storageKey}`, e);
            }
        }
        throw error;
    }
}

// 获取用户进度
async function fetchUserProgress() {
    const progressContainer = document.querySelector('.progress-container');
    showLoading(progressContainer);
    
    try {
        const progress = await fetchData(
            `${API_BASE_URL}/user/progress`, 
            STORAGE_KEYS.USER_PROGRESS
        );
        
        if (progress) {
            updateProgressDisplay(progress);
        }
    } catch (error) {
        showError('获取进度信息失败: ' + error.message);
    } finally {
        hideLoading(progressContainer);
    }
}

// 更新进度显示
function updateProgressDisplay(progress) {
    document.querySelector('.level-value').textContent = progress.current_level;
    document.querySelector('.level:nth-child(2) .level-value').textContent = 
        progress.total_stars;
}

// 更新任务状态
async function updateTaskStatus(recordId, isCompleted) {
    if (!isOnline) {
        showError('网络已断开，无法更新任务状态');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    '任务完成状态': isCompleted ? '已完成' : '未完成',
                    completion_time: isCompleted ? new Date().toISOString() : null
                }
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            // 更新成功后刷新任务列表和用户进度
            showToast(isCompleted ? '任务已完成' : '任务已取消');
            refreshAllData();
        } else {
            showError('更新任务失败: ' + result.message);
        }
    } catch (error) {
        showError('网络请求失败，请检查网络连接');
    }
}

// 打卡功能
async function checkIn() {
    if (!isOnline) {
        showError('网络已断开，无法执行打卡');
        return;
    }
    
    const checkInButton = document.querySelector('.check-in-button');
    
    // 禁用按钮，防止重复点击
    if (checkInButton) {
        checkInButton.disabled = true;
        checkInButton.textContent = '打卡中...';
    }
    
    // 先执行宝石飞行动画，在API请求前触发
    createGemFlyAnimation();
    
    // 计算动画完成所需的总时间
    const lastGemDelay = selectedTaskIds.length * 150; // 最后一个宝石的延迟
    const animationTime = 1500; // 动画时间（与CSS中的transition时间一致）
    const totalAnimationTime = lastGemDelay + animationTime; // 总动画时间
    
    // 记录API请求开始时间
    const apiStartTime = Date.now();
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task_ids: selectedTaskIds
            })
        });
        const result = await response.json();
        
        // 立即恢复按钮状态
        if (checkInButton) {
            checkInButton.disabled = false;
            checkInButton.textContent = '今日打卡';
        }
        
        if (result.code === 0) {
            // 计算显示成功提示的延迟时间
            // 如果API响应时间小于动画时间，则等待动画完成后再显示提示
            // 如果API响应时间大于动画时间，则立即显示提示
            const extraDelay = 1000; // 额外添加1秒等待时间
            const apiResponseTime = Date.now() - apiStartTime;
            const delayForSuccess = Math.max(0, totalAnimationTime - apiResponseTime) + extraDelay;
            
            setTimeout(() => {
                // 使用自定义成功提示
                showSuccess('打卡成功！', result.data.reward_message);
                
                // 清除缓存，强制刷新数据
                clearAllCache();
                refreshAllData();
            }, delayForSuccess);
        } else {
            showError(result.message || '打卡失败，请确保完成所有任务');
        }
    } catch (error) {
        showError('打卡失败，请稍后重试');
        // 发生错误时也要恢复按钮状态
        if (checkInButton) {
            checkInButton.disabled = false;
            checkInButton.textContent = '今日打卡';
        }
    }
}

// 获取任务列表
async function fetchTasks() {
    const taskContainer = document.querySelector('.task-container');
    showLoading(taskContainer);
    
    try {
        const tasks = await fetchData(
            `${API_BASE_URL}/tasks`, 
            STORAGE_KEYS.TASKS
        );
        
        if (tasks) {
            updateTasksDisplay(tasks);
        }
    } catch (error) {
        showError('获取任务失败: ' + error.message);
    } finally {
        hideLoading(taskContainer);
    }
}

// 更新任务显示
// 本地存储键名 - 任务折叠状态
const TASK_FOLD_STATUS = 'task_fold_status';
// 选中的任务ID列表
let selectedTaskIds = [];

function updateTasksDisplay(tasks) {
    const taskContainer = document.querySelector('.task-container');
    if (!taskContainer) {
        console.error('未找到任务容器元素');
        return;
    }

    // 清空现有任务列表
    taskContainer.innerHTML = '';

    // 获取保存的折叠状态，如果没有则初始化
    let foldStatus;
    try {
        foldStatus = JSON.parse(localStorage.getItem(TASK_FOLD_STATUS)) || {};
    } catch (e) {
        foldStatus = {};
    }
    
    // 首次加载时，默认设置生活任务和纪律任务为折叠状态，学习任务为展开状态
    if (Object.keys(foldStatus).length === 0) {
        foldStatus = {
            '生活任务': true,
            '纪律任务': true,
            '学习任务': false,
            '奖励': false,
            '其他': false
        };
        localStorage.setItem(TASK_FOLD_STATUS, JSON.stringify(foldStatus));
    }

    // 按任务类型分组
    const tasksByType = tasks.reduce((acc, task) => {
        const type = task.fields['任务类型'] || '其他';
        if (!acc[type]) acc[type] = [];
        acc[type].push(task);
        return acc;
    }, {});

    // 创建任务卡片
    Object.entries(tasksByType).forEach(([type, typeTasks]) => {
        const card = document.createElement('div');
        // 根据任务类型设置对应的样式类名
        let cardClassName = 'card';
        switch (type) {
            case '纪律任务':
                cardClassName += ' discipline';
                break;
            case '生活任务':
                cardClassName += ' daily';
                break;
            case '学习任务':
                cardClassName += ' study';
                break;
            case '奖励':
                cardClassName += ' rewards';
                break;
            default:
                cardClassName += ' other';
        }
        card.className = cardClassName;
        
        // 创建可点击的标题区域
        const titleArea = document.createElement('div');
        titleArea.className = 'card-header';
        titleArea.innerHTML = `
            <div class="card-title">${type}</div>
            <div class="fold-icon">${foldStatus[type] ? '▼' : '▲'}</div>
        `;
        
        // 添加标题点击事件
        titleArea.addEventListener('click', () => {
            const tasksContainer = card.querySelector('.tasks-container');
            const foldIcon = titleArea.querySelector('.fold-icon');
            
            // 切换折叠状态
            foldStatus[type] = !foldStatus[type];
            localStorage.setItem(TASK_FOLD_STATUS, JSON.stringify(foldStatus));
            
            if (foldStatus[type]) {
                tasksContainer.classList.add('folded');
                foldIcon.textContent = '▼';
            } else {
                tasksContainer.classList.remove('folded');
                foldIcon.textContent = '▲';
            }
        });
        
        card.appendChild(titleArea);
        card.appendChild(document.createElement('div')).className = 'planet-decoration';
        
        // 创建任务容器
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks-container';
        if (foldStatus[type]) {
            tasksContainer.classList.add('folded');
        }
        
        // 添加任务项
        typeTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.dataset.taskId = task.record_id;
            
            // 检查任务是否已被选中
            const isSelected = selectedTaskIds.includes(task.record_id);
            
            // 检查任务完成状态
            const isCompleted = task.fields['任务完成状态'] === '是' || task.fields['已完成'];
            
            const stars = '💎'.repeat(task.fields['星星数量'] || 0);
            taskElement.innerHTML = `
                <div class="checkbox ${isSelected ? 'selected' : ''} ${isCompleted ? 'checked disabled' : ''}"></div>
                <div class="task-content">
                    <div class="task-text">
                        <span class="task-name">${task.fields['任务名称']}</span>
                        ${task.fields['任务描述'] ? `<span class="task-description"> - ${task.fields['任务描述']}</span>` : ''}
                        ${isCompleted ? '<span class="task-completed">（已打卡）</span>' : ''}
                    </div>
                </div>
                <div class="stars">${stars}</div>
            `;

            // 添加任务点击事件 - 修改为选择任务而非立即更新状态
            const checkbox = taskElement.querySelector('.checkbox');
            if (!isCompleted) { // 只有未完成的任务才能被选中
                checkbox.addEventListener('click', () => {
                    // 切换选中状态
                    const taskId = task.record_id;
                    if (selectedTaskIds.includes(taskId)) {
                        // 取消选中
                        selectedTaskIds = selectedTaskIds.filter(id => id !== taskId);
                        checkbox.classList.remove('selected');
                    } else {
                        // 选中任务
                        selectedTaskIds.push(taskId);
                        checkbox.classList.add('selected');
                    }
                    
                    // 更新打卡按钮状态
                    updateCheckInButtonStatus();
                });
            } else {
                // 对于已完成的任务，添加禁用样式并确保不能被点击选择
                checkbox.classList.add('disabled');
                taskElement.classList.add('completed-task');
            }

            tasksContainer.appendChild(taskElement);
        });
        
        card.appendChild(tasksContainer);
        taskContainer.appendChild(card);
    });

    // 更新进度条
    const completedTasks = tasks.filter(task => task.fields['任务完成状态'] === '是' || task.fields['已完成']);
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    document.querySelector('.progress').style.width = `${completionRate}%`;
    document.querySelector('.progress-container p').textContent = 
        `已完成今日任务的 ${Math.round(completionRate)}%`;
        
    // 更新打卡按钮状态
    updateCheckInButtonStatus();
}

// 更新打卡按钮状态
function updateCheckInButtonStatus() {
    const checkInButton = document.querySelector('.check-in-button');
    if (checkInButton) {
        if (selectedTaskIds.length > 0) {
            checkInButton.textContent = `打卡 (${selectedTaskIds.length}项任务)`;
            checkInButton.classList.add('active');
        } else {
            checkInButton.textContent = '今日打卡';
            checkInButton.classList.remove('active');
        }
    }
}

// 打卡功能 - 修改为提交选中的任务
async function checkIn() {
    if (!isOnline) {
        showError('网络已断开，无法执行打卡');
        return;
    }
    
    // 如果没有选中任何任务，提示用户
    if (selectedTaskIds.length === 0) {
        showError('请至少选择一项已完成的任务进行打卡');
        return;
    }
    
    const checkInButton = document.querySelector('.check-in-button');
    
    // 禁用按钮，防止重复点击
    if (checkInButton) {
        checkInButton.disabled = true;
    }
    
    // 先触发宝石飞行动画
    createGemFlyAnimation();
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': 'default_user' // 可以从本地存储或其他地方获取用户ID
            },
            body: JSON.stringify({
                task_ids: selectedTaskIds
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            // API请求成功后立即显示成功提示
            showSuccess('打卡成功！', result.data.reward_message);
            
            // 清除选中的任务ID
            selectedTaskIds = [];
            
            // 清除缓存，强制刷新数据
            clearAllCache();
            refreshAllData();
        } else {
            showError(result.message || '打卡失败，请稍后重试');
        }
    } catch (error) {
        showError('打卡失败，请稍后重试');
    } finally {
        // 恢复按钮状态
        if (checkInButton) {
            checkInButton.disabled = false;
            checkInButton.textContent = '今日打卡';
        }
    }
}

// 创建宝石飞行动画
function createGemFlyAnimation() {
    // 获取蓝宝石数量显示区域的位置
    const gemCountElement = document.querySelector('.level:nth-child(2) .level-value');
    if (!gemCountElement) return;
    
    const targetRect = gemCountElement.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;
    
    // 为每个选中的任务创建飞行宝石
    selectedTaskIds.forEach(taskId => {
        const taskElement = document.querySelector(`.task[data-task-id="${taskId}"]`);
        if (!taskElement) return;
        
        // 获取任务中的宝石数量
        const starsElement = taskElement.querySelector('.stars');
        if (!starsElement) return;
        
        const starsText = starsElement.textContent;
        const gemCount = starsText.length;
        
        // 获取任务元素的位置
        const taskRect = taskElement.getBoundingClientRect();
        const startX = taskRect.left + starsElement.offsetLeft + starsElement.offsetWidth / 2;
        const startY = taskRect.top + starsElement.offsetTop + starsElement.offsetHeight / 2;
        
        // 为每个宝石创建动画
        for (let i = 0; i < gemCount; i++) {
            // 创建宝石元素
            const gem = document.createElement('div');
            gem.className = 'flying-gem';
            gem.textContent = '💎';
            gem.style.left = `${startX}px`;
            gem.style.top = `${startY}px`;
            
            // 添加到文档中
            document.body.appendChild(gem);
            
            // 添加一点随机延迟，使动画更自然
            setTimeout(() => {
                // 设置目标位置，触发动画
                gem.style.left = `${targetX}px`;
                gem.style.top = `${targetY}px`;
                gem.classList.add('animate');
                
                // 动画结束后移除元素
                setTimeout(() => {
                    if (gem.parentNode) {
                        document.body.removeChild(gem);
                    }
                }, 1500);
            }, i * 150); // 每个宝石延迟不同时间开始动画
        }
    });
}

// 清除所有缓存
function clearAllCache() {
    localStorage.removeItem(STORAGE_KEYS.USER_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.LAST_FETCH_TIME);
}

// 刷新所有数据
// 获取所有数据（任务、进度、奖励）
async function fetchAllData() {
    const taskContainer = document.querySelector('.task-container');
    const progressContainer = document.querySelector('.progress-container');
    
    showLoading(taskContainer);
    showLoading(progressContainer);
    
    try {
        const allData = await fetchData(
            `${API_BASE_URL}/all-data`,
            'all_data'
        );
        
        if (allData) {
            // 更新任务列表
            updateTasksDisplay(allData.tasks);
            
            // 更新进度信息
            updateProgressDisplay(allData.progress);
            
            // 如果有奖励数据，可以在这里处理
            if (allData.rewards && allData.rewards.length > 0) {
                updateRewardsDisplay(allData.rewards);
            }
            
            return allData;
        }
    } catch (error) {
        showError('获取数据失败: ' + error.message);
        // 如果获取所有数据失败，尝试分别获取任务和进度
        try {
            await Promise.all([fetchTasks(), fetchUserProgress()]);
        } catch (e) {
            console.error('备用数据获取也失败:', e);
        }
    } finally {
        hideLoading(taskContainer);
        hideLoading(progressContainer);
    }
}

// 更新奖励显示
function updateRewardsDisplay(rewards) {
    const rewardContainer = document.querySelector('.reward-container');
    if (!rewardContainer) return;
    
    rewardContainer.innerHTML = '';
    
    // 获取当前用户的星星数
    const currentStars = parseInt(document.querySelector('.level:nth-child(2) .level-value').textContent) || 0;
    
    rewards.forEach(reward => {
        // 获取奖励所需星星数
        const requiredStars = parseInt(reward.fields['所需星星数'] || reward.fields['stars_required'] || 0);
        // 检查是否已兑换
        const isRedeemed = reward.fields['是否已兑换'] === '是';
        // 检查星星是否足够
        const hasEnoughStars = currentStars >= requiredStars;
        // 获取奖励描述
        const rewardDescription = reward.fields['奖励描述'] || reward.fields['reward_description'] || '暂无描述';
        
        const rewardItem = document.createElement('div');
        rewardItem.className = 'reward-item';
        
        // 根据状态添加不同的类名
        if (isRedeemed) {
            rewardItem.classList.add('redeemed');
        } else if (!hasEnoughStars) {
            rewardItem.classList.add('insufficient');
        } else {
            rewardItem.classList.add('available');
        }
        
        // 根据奖励名称选择合适的图标
        let rewardIcon = '🎁';
        const rewardName = reward.fields['奖励名称'] || reward.fields['reward_name'] || '';
        
        // 娱乐奖励图标
        if (rewardName.includes('动画片')) {
            rewardIcon = '📺';
        } else if (rewardName.includes('游戏')) {
            rewardIcon = '🎮';
        }
        // 户外活动图标
        else if (rewardName.includes('公园')) {
            rewardIcon = '🌳';
        } else if (rewardName.includes('自行车')) {
            rewardIcon = '🚲';
        }
        // 特殊奖励图标
        else if (rewardName.includes('玩具')) {
            rewardIcon = '🎯';
        } else if (rewardName.includes('游乐园')) {
            rewardIcon = '🎡';
        }
        
        rewardItem.innerHTML = `
            <div class="reward-icon">${rewardIcon}</div>
            <div class="reward-text">${rewardName || '未命名奖励'}</div>
            <div class="reward-cost">${requiredStars}💎</div>
            ${isRedeemed ? '<div class="reward-status">已兑换</div>' : ''}
            <div class="reward-tooltip">${rewardDescription}</div>
        `;
        
        // 只有未兑换且星星足够的奖励才能点击兑换
        if (!isRedeemed && hasEnoughStars) {
            rewardItem.addEventListener('click', () => {
                showRedeemConfirmation(reward, currentStars);
            });
        }
        
        rewardContainer.appendChild(rewardItem);
    });
}

// 显示兑换确认对话框
function showRedeemConfirmation(reward, currentStars) {
    // 创建确认对话框
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    
    const rewardName = reward.fields['奖励名称'] || reward.fields['reward_name'] || '未命名奖励';
    const requiredStars = parseInt(reward.fields['所需星星数'] || reward.fields['stars_required'] || 0);
    
    confirmDialog.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-title">确认兑换</div>
            <div class="confirm-message">
                <p>你确定要兑换「${rewardName}」吗？</p>
                <p>需要消耗 ${requiredStars} 颗星星</p>
                <p>兑换后剩余: ${currentStars - requiredStars} 颗星星</p>
            </div>
            <div class="confirm-buttons">
                <button class="cancel-button">取消</button>
                <button class="confirm-button">确认兑换</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // 添加按钮事件
    const cancelButton = confirmDialog.querySelector('.cancel-button');
    const confirmButton = confirmDialog.querySelector('.confirm-button');
    
    // 取消按钮
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(confirmDialog);
    });
    
    // 确认按钮
    confirmButton.addEventListener('click', async () => {
        // 禁用按钮，防止重复点击
        confirmButton.disabled = true;
        confirmButton.textContent = '兑换中...';
        
        try {
            await redeemReward(reward.record_id, currentStars);
            document.body.removeChild(confirmDialog);
        } catch (error) {
            // 恢复按钮状态
            confirmButton.disabled = false;
            confirmButton.textContent = '确认兑换';
            showError(error.message || '兑换失败，请重试');
        }
    });
}

// 兑换奖励API调用
async function redeemReward(rewardId, currentStars) {
    if (!isOnline) {
        throw new Error('网络已断开，无法兑换奖励');
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/rewards/redeem`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reward_id: rewardId,
                current_stars: currentStars
            })
        });
        
        const result = await response.json();
        
        if (result.code === 0) {
            // 兑换成功，显示成功消息
            showSuccess('兑换成功', result.data.message);
            
            // 更新星星数量显示
            document.querySelector('.level:nth-child(2) .level-value').textContent = 
                result.data.remaining_stars;
            
            // 刷新奖励列表
            refreshAllData();
            
            // 创建星星飞走的动画
            createStarsFlyAnimation(result.data.stars_spent);
            
            return result.data;
        } else {
            throw new Error(result.message || '兑换失败');
        }
    } catch (error) {
        console.error('兑换奖励失败:', error);
        throw error;
    }
}

// 创建星星飞走的动画
function createStarsFlyAnimation(starsCount) {
    // 获取星星数量显示元素的位置
    const starsElement = document.querySelector('.level:nth-child(2) .level-value');
    if (!starsElement) return;
    
    const starsRect = starsElement.getBoundingClientRect();
    
    // 星星起始位置（从星星数量显示位置开始）
    const startX = starsRect.left + starsRect.width / 2;
    const startY = starsRect.top + starsRect.height / 2;
    
    // 目标位置（奖励区域中心）
    const rewardsCard = document.querySelector('.card.rewards');
    if (!rewardsCard) return;
    
    const rewardsRect = rewardsCard.getBoundingClientRect();
    const targetX = rewardsRect.left + rewardsRect.width / 2;
    const targetY = rewardsRect.top + rewardsRect.height / 2;
    
    // 创建星星元素并添加动画
    for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.className = 'flying-star';
        star.textContent = '💎';
        star.style.left = `${startX}px`;
        star.style.top = `${startY}px`;
        
        document.body.appendChild(star);
        
        // 添加随机延迟
        setTimeout(() => {
            // 设置目标位置，触发动画
            star.style.left = `${targetX}px`;
            star.style.top = `${targetY}px`;
            star.classList.add('animate');
            
            // 动画结束后移除元素
            setTimeout(() => {
                if (star.parentNode) {
                    document.body.removeChild(star);
                }
            }, 1000);
        }, i * 100);
    }
}

// 修改刷新所有数据的函数，优先使用fetchAllData
async function refreshAllData() {
    // 尝试使用单一API获取所有数据
    try {
        await fetchAllData();
    } catch (error) {
        // 如果失败，回退到分别获取数据
        console.warn('获取所有数据失败，回退到分别获取:', error);
        await Promise.all([
            fetchTasks(),
            fetchUserProgress()
        ]);
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 获取初始数据
    refreshAllData();
    
    // 为打卡按钮添加事件
    const checkInButton = document.querySelector('.check-in-button');
    if (checkInButton) {
        checkInButton.addEventListener('click', checkIn);
    }
    
    // 初始化网络状态
    if (!navigator.onLine) {
        showToast('当前处于离线状态，使用缓存数据');
    }
});

// 定期刷新数据（智能刷新：仅在页面活跃且网络连接时）
let refreshInterval;
let lastUserActivity = Date.now();
const REFRESH_INTERVAL = 60000; // 1分钟
const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5分钟无操作视为不活跃

// 监听用户活动
function resetUserActivity() {
    lastUserActivity = Date.now();
}

// 添加用户活动监听
['mousemove', 'keydown', 'click', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, resetUserActivity, { passive: true });
});

// 启动智能刷新
function startSmartRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        const now = Date.now();
        // 仅在页面活跃且有网络连接时刷新
        if (isOnline && (now - lastUserActivity < INACTIVITY_THRESHOLD)) {
            refreshAllData();
        }
    }, REFRESH_INTERVAL);
}

// 启动智能刷新
startSmartRefresh();