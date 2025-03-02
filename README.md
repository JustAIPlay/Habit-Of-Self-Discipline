# 自律星球

一个帮助用户培养自律习惯、追踪日常任务完成情况的Web应用。

## 功能特点

- 任务管理：支持生活、学习、纪律等多种类型的任务分类
- 进度追踪：实时显示任务完成进度和统计数据
- 奖励机制：完成任务可获得星星，累积星星可兑换奖励
- 离线支持：具备本地数据缓存功能，离线状态下也可查看任务
- 数据同步：在线时自动同步数据，确保数据及时更新

## 技术架构

### 前端
- 原生JavaScript实现，无框架依赖
- 响应式设计，支持多种设备访问
- 本地存储实现离线功能
- 实时数据同步和状态管理

### 后端
- Python Flask框架
- 飞书多维表格API作为数据存储
- RESTful API设计
- CORS跨域支持

## 快速开始

### 环境要求
- Python 3.7+
- 飞书开放平台账号
- 现代浏览器（支持localStorage）

### 安装步骤

1. 克隆项目到本地
```bash
git clone [项目地址]
cd 自律星球
```

2. 安装依赖
```bash
pip install flask flask-cors requests
```

3. 配置飞书API
- 复制`config.example.py`为`config.py`
- 在飞书开放平台创建应用并获取相关密钥
- 在`config.py`中填入以下信息：
  - FEISHU_APP_ID：飞书应用ID
  - FEISHU_APP_SECRET：飞书应用密钥
  - BASE_ID：多维表格ID
  - TASK_TABLE_ID：任务表ID

4. 初始化数据
```bash
python init_tasks.py  # 初始化任务数据
python init_rewards.py  # 初始化奖励数据
```

5. 启动应用
```bash
python app.py
```

访问 http://localhost:5000 即可使用应用

## 使用说明

### 任务管理
- 任务按类型分组显示（生活任务、学习任务、纪律任务等）
- 点击任务前的复选框可标记完成/取消完成
- 点击分组标题可展开/折叠该类型的任务列表

### 进度追踪
- 顶部显示当前等级和累计星星数
- 进度条实时显示今日任务完成比例

### 数据同步
- 在线状态下自动同步数据
- 离线时可查看缓存的任务数据
- 网络恢复后自动同步最新数据

### 注意事项
- 首次使用需完成飞书API配置
- 建议使用现代浏览器访问以获得最佳体验
- 定期备份`config.py`中的配置信息

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。在提交代码前，请确保：

- 代码符合项目的编码规范
- 新功能有完整的测试覆盖
- 文档已更新并反映最新变更

## 许可证

本项目采用MIT许可证，详见LICENSE文件。