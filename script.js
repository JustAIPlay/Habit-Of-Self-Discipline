// 初始化API基础URL
const API_BASE_URL = 'http://localhost:5000/api';

// 获取用户进度
async function fetchUserProgress() {
    console.log('开始获取用户进度...');
    try {
        const response = await fetch(`${API_BASE_URL}/user/progress`);
        const result = await response.json();
        if (result.code === 0) {
            console.log('成功获取用户进度:', result.data);
            updateProgressDisplay(result.data);
        } else {
            console.error('获取用户进度失败:', result.message);
        }
    } catch (error) {
        console.error('API请求失败:', error);
    }
}

// 更新进度显示
function updateProgressDisplay(progress) {
    console.log('更新进度显示:', progress);
    document.querySelector('.level-value').textContent = progress.current_level;
    document.querySelector('.level:nth-child(2) .level-value').textContent = 
        progress.streak_days + '天';
    document.querySelector('.level:nth-child(3) .level-value').textContent = 
        progress.total_stars;
}

// 更新任务状态
async function updateTaskStatus(recordId, isCompleted) {
    console.log(`开始更新任务状态: ID=${recordId}, 完成状态=${isCompleted}`);
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
            console.log('任务状态更新成功');
            // 更新成功后刷新任务列表和用户进度
            fetchTasks();
            fetchUserProgress();
        } else {
            console.error('更新任务失败:', result.message);
        }
    } catch (error) {
        console.error('API请求失败:', error);
    }
}

// 打卡功能
async function checkIn() {
    console.log('开始执行打卡...');
    try {
        const response = await fetch(`${API_BASE_URL}/user/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result = await response.json();
        if (result.code === 0) {
            console.log('打卡成功:', result.data);
            alert(`恭喜你完成今日打卡！${result.data.reward_message}`);
            fetchUserProgress();
        } else {
            console.warn('打卡失败:', result.message);
            alert(result.message || '打卡失败，请确保完成所有任务');
        }
    } catch (error) {
        console.error('打卡失败:', error);
        alert('打卡失败，请稍后重试');
    }
}

// 获取任务列表
async function fetchTasks() {
    console.log('开始获取任务列表...');
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        const result = await response.json();
        if (result.code === 0) {
            console.log('成功获取任务列表:', result.data);
            updateTasksDisplay(result.data);
        } else {
            console.error('获取任务失败:', result.message);
        }
    } catch (error) {
        console.error('API请求失败:', error);
    }
}

// 更新任务显示
function updateTasksDisplay(tasks) {
    console.log('开始更新任务显示...');
    const taskContainer = document.querySelector('.task-container');
    if (!taskContainer) {
        console.error('未找到任务容器元素');
        return;
    }

    // 清空现有任务列表
    taskContainer.innerHTML = '';

    // 按任务类型分组
    const tasksByType = tasks.reduce((acc, task) => {
        const type = task.fields['任务类型'] || '其他';
        if (!acc[type]) acc[type] = [];
        acc[type].push(task);
        return acc;
    }, {});

    console.log('任务分组结果:', tasksByType);

    // 创建任务卡片
    Object.entries(tasksByType).forEach(([type, typeTasks]) => {
        console.log(`创建${type}类型的任务卡片，包含${typeTasks.length}个任务`);
        const card = document.createElement('div');
        // 根据任务类型设置对应的样式类名
        let cardClassName = 'card';
        switch (type) {
            case '遵守纪律':
                cardClassName += ' discipline';
                break;
            case '日常生活':
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

        // 设置卡片标题和内容
        if (type === '奖励') {
            card.innerHTML = `
                <div class="card-title">嘉奖的奖励</div>
                <div class="planet-decoration"></div>
                <div class="reward-container"></div>
            `;
            // 添加奖励项
            const rewardContainer = card.querySelector('.reward-container');
            typeTasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'task';
                taskElement.dataset.taskId = task.record_id;
                
                const stars = '★'.repeat(task.fields['星星数量'] || 0);
                taskElement.innerHTML = `
                    <div class="checkbox ${task.fields['已完成'] ? 'checked' : ''}"></div>
                    <div class="task-text">${task.fields['任务名称']}</div>
                    <div class="stars">${stars}</div>
                `;

                rewardContainer.appendChild(taskElement);
            });
        } else {
            card.innerHTML = `
                <div class="card-title">${type}</div>
                <div class="planet-decoration"></div>
            `;
            // 添加任务项
            typeTasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'task';
                taskElement.dataset.taskId = task.record_id;
                
                const stars = '★'.repeat(task.fields['星星数量'] || 0);
                taskElement.innerHTML = `
                    <div class="checkbox ${task.fields['已完成'] ? 'checked' : ''}"></div>
                    <div class="task-text">${task.fields['任务名称']}</div>
                    <div class="stars">${stars}</div>
                `;

                // 添加任务点击事件
                const checkbox = taskElement.querySelector('.checkbox');
                checkbox.addEventListener('click', () => {
                    const isCompleted = checkbox.classList.contains('checked');
                    console.log(`任务${task.record_id}被点击，当前状态: ${isCompleted}`);
                    updateTaskStatus(task.record_id, !isCompleted);
                });

                card.appendChild(taskElement);
            });
        }

        taskContainer.appendChild(card);
    });

    // 更新进度条
    const completedTasks = tasks.filter(task => task.fields['已完成']);
    const completionRate = (completedTasks.length / tasks.length) * 100;
    console.log(`任务完成率: ${completionRate}%`);
    document.querySelector('.progress').style.width = `${completionRate}%`;
    document.querySelector('.progress-container p').textContent = 
        `已完成今日任务的 ${Math.round(completionRate)}%`;
}

// 获取奖励列表
async function fetchRewards() {
    console.log('开始获取奖励列表...');
    try {
        const response = await fetch(`${API_BASE_URL}/rewards`);
        const result = await response.json();
        if (result.code === 0) {
            console.log('成功获取奖励列表:', result.data);
            updateRewardsDisplay(result.data);
        } else {
            console.error('获取奖励失败:', result.message);
        }
    } catch (error) {
        console.error('API请求失败:', error);
    }
}

// 更新奖励显示
function updateRewardsDisplay(rewards) {
    console.log('开始更新奖励显示...');
    const rewardContainer = document.querySelector('.reward-container');
    if (!rewardContainer) {
        console.error('未找到奖励容器元素');
        return;
    }

    // 清空现有奖励列表
    rewardContainer.innerHTML = '';

    // 添加奖励项
    rewards.forEach(reward => {
        const rewardElement = document.createElement('div');
        rewardElement.className = 'task';
        rewardElement.dataset.rewardId = reward.record_id;
        
        const stars = '★'.repeat(reward.fields['星星数量'] || 0);
        rewardElement.innerHTML = `
            <div class="checkbox ${reward.fields['已完成'] ? 'checked' : ''}"></div>
            <div class="task-text">${reward.fields['奖励名称']}</div>
            <div class="stars">${stars}</div>
        `;

        // 添加奖励点击事件
        const checkbox = rewardElement.querySelector('.checkbox');
        checkbox.addEventListener('click', () => {
            const isCompleted = checkbox.classList.contains('checked');
            console.log(`奖励${reward.record_id}被点击，当前状态: ${isCompleted}`);
            updateTaskStatus(reward.record_id, !isCompleted);
        });

        rewardContainer.appendChild(rewardElement);
    });
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');
    // 获取初始数据
    fetchTasks();
    fetchUserProgress();
    fetchRewards();
    
    // 为打卡按钮添加事件
    document.querySelector('.button').addEventListener('click', checkIn);
});

// 定期刷新数据
setInterval(() => {
    console.log('执行定期数据刷新...');
    fetchTasks();
    fetchUserProgress();
    fetchRewards();
}, 30000); // 每30秒刷新一次