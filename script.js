// 初始化本地存储数据
function initLocalStorage() {
    if (!localStorage.getItem('taskStatus')) {
        localStorage.setItem('taskStatus', JSON.stringify({
            completedTasks: [],
            level: 4,
            streak: 7,
            stars: 42
        }));
    }
    return JSON.parse(localStorage.getItem('taskStatus'));
}

// 更新任务状态
function updateTaskStatus(taskId, isChecked) {
    const status = initLocalStorage();
    if (isChecked) {
        if (!status.completedTasks.includes(taskId)) {
            status.completedTasks.push(taskId);
        }
    } else {
        status.completedTasks = status.completedTasks.filter(id => id !== taskId);
    }
    localStorage.setItem('taskStatus', JSON.stringify(status));
    updateProgress();
    updateLevelDisplay();
}

// 更新进度条
function updateProgress() {
    const status = initLocalStorage();
    const total = document.querySelectorAll('.checkbox').length;
    const completed = status.completedTasks.length;
    const percentage = Math.round((completed / total) * 100);
    
    document.querySelector('.progress').style.width = percentage + '%';
    document.querySelector('.progress-container p').textContent = 
        `已完成今日任务的 ${percentage}%`;
}

// 更新等级显示
function updateLevelDisplay() {
    const status = initLocalStorage();
    document.querySelector('.level-value').textContent = status.level;
    document.querySelector('.level:nth-child(2) .level-value').textContent = 
        status.streak + '天';
    document.querySelector('.level:nth-child(3) .level-value').textContent = 
        status.stars;
}

// 初始化任务状态
function initTasks() {
    const status = initLocalStorage();
    document.querySelectorAll('.checkbox').forEach((checkbox, index) => {
        if (status.completedTasks.includes(index)) {
            checkbox.classList.add('checked');
        }
        
        checkbox.addEventListener('click', function() {
            this.classList.toggle('checked');
            updateTaskStatus(index, this.classList.contains('checked'));
        });
    });
    updateProgress();
    updateLevelDisplay();
}

// 打卡功能
document.querySelector('.button').addEventListener('click', function() {
    const status = initLocalStorage();
    const total = document.querySelectorAll('.checkbox').length;
    const completed = status.completedTasks.length;
    
    if (completed === total) {
        status.streak += 1;
        status.stars += Math.floor(completed * 1.5);
        if (status.streak % 7 === 0) {
            status.level += 1;
        }
        localStorage.setItem('taskStatus', JSON.stringify(status));
        updateLevelDisplay();
        alert('恭喜你完成今日所有任务！获得额外奖励！');
    } else {
        alert('继续加油！完成所有任务可以获得额外奖励哦！');
    }
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTasks);