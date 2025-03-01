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
        progress.streak_days + '天';
    document.querySelector('.level:nth-child(3) .level-value').textContent = 
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
                    completed: isCompleted,
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
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (result.code === 0) {
            // 使用自定义成功提示
            showSuccess('打卡成功！', result.data.reward_message);
            
            // 清除缓存，强制刷新数据
            clearAllCache();
            refreshAllData();
        } else {
            showError(result.message || '打卡失败，请确保完成所有任务');
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
            
            const stars = '★'.repeat(task.fields['星星数量'] || 0);
            taskElement.innerHTML = `
                <div class="checkbox ${task.fields['已完成'] ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-text">
                        <span class="task-name">${task.fields['任务名称']}</span>
                        ${task.fields['任务描述'] ? `<span class="task-description"> - ${task.fields['任务描述']}</span>` : ''}
                    </div>
                </div>
                <div class="stars">${stars}</div>
            `;

            // 添加任务点击事件
            const checkbox = taskElement.querySelector('.checkbox');
            checkbox.addEventListener('click', () => {
                const isCompleted = checkbox.classList.contains('checked');
                updateTaskStatus(task.record_id, !isCompleted);
            });

            tasksContainer.appendChild(taskElement);
        });
        
        card.appendChild(tasksContainer);
        taskContainer.appendChild(card);
    });

    // 更新进度条
    const completedTasks = tasks.filter(task => task.fields['已完成']);
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    document.querySelector('.progress').style.width = `${completionRate}%`;
    document.querySelector('.progress-container p').textContent = 
        `已完成今日任务的 ${Math.round(completionRate)}%`;
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
    
    rewards.forEach(reward => {
        const rewardItem = document.createElement('div');
        rewardItem.className = 'reward-item';
        rewardItem.innerHTML = `
            <div class="reward-icon">🎁</div>
            <div class="reward-text">${reward.fields['奖励名称'] || reward.fields['reward_name'] || '未命名奖励'}</div>
            <div class="reward-cost">${reward.fields['所需星星数'] || reward.fields['stars_required'] || 0}★</div>
        `;
        
        rewardContainer.appendChild(rewardItem);
    });
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