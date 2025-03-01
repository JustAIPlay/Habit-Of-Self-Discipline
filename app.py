from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from feishu_api import FeishuAPI
from config import Config
import os

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)

# 初始化飞书API
feishu_api = FeishuAPI()

# 在应用启动时进行配置验证
print('开始应用初始化...')
Config.validate_config()
print('应用初始化完成')

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """获取任务列表"""
    print('收到获取任务列表请求')
    try:
        tasks = feishu_api.get_tasks()
        print(f'成功获取任务列表，返回{len(tasks)}个任务')
        return jsonify({
            'code': 0,
            'data': tasks
        })
    except Exception as e:
        error_msg = str(e)
        print(f'获取任务列表失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

@app.route('/api/all-data', methods=['GET'])
def get_all_data():
    """获取所有数据（任务、进度、奖励）"""
    print('收到获取所有数据请求')
    try:
        all_data = feishu_api.get_all_data()
        print('成功获取所有数据')
        return jsonify({
            'code': 0,
            'data': all_data
        })
    except Exception as e:
        error_msg = str(e)
        print(f'获取所有数据失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

@app.route('/api/tasks/<record_id>', methods=['PUT'])
def update_task(record_id):
    """更新任务状态"""
    print(f'收到更新任务请求，任务ID: {record_id}')
    try:
        fields = request.json.get('fields', {})
        print(f'更新字段: {fields}')
        updated_task = feishu_api.update_task(record_id, fields)
        print('任务更新成功')
        return jsonify({
            'code': 0,
            'data': updated_task
        })
    except Exception as e:
        error_msg = str(e)
        print(f'更新任务失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

@app.route('/api/user/progress', methods=['GET'])
def get_user_progress():
    """获取用户进度信息"""
    print('收到获取用户进度请求')
    try:
        # 获取任务列表
        tasks = feishu_api.get_tasks()
        
        # 计算进度数据
        completed_tasks = [task for task in tasks if task['fields'].get('completed', False)]
        total_tasks = len(tasks)
        completed_count = len(completed_tasks)
        
        # 计算当前等级（每完成3个任务提升一级）
        current_level = (completed_count // 3) + 1
        
        # 计算连续打卡天数（简化版本）
        streak_days = len(set(task['fields'].get('completion_time', '').split('T')[0] 
                           for task in completed_tasks if task['fields'].get('completion_time')))
        
        # 计算总星星数（每完成一个任务得一颗星）
        total_stars = completed_count
        
        progress_data = {
            'current_level': current_level,
            'streak_days': streak_days,
            'total_stars': total_stars,
            'completed_tasks': completed_count,
            'total_tasks': total_tasks
        }
        
        print(f'成功获取用户进度: {progress_data}')
        return jsonify({
            'code': 0,
            'data': progress_data
        })
    except Exception as e:
        error_msg = str(e)
        print(f'获取用户进度失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

@app.route('/api/rewards', methods=['GET'])
def get_rewards():
    """获取奖励列表"""
    print('收到获取奖励列表请求')
    try:
        rewards = feishu_api.get_rewards()
        print(f'成功获取奖励列表，返回{len(rewards)}个奖励')
        return jsonify({
            'code': 0,
            'data': rewards
        })
    except Exception as e:
        error_msg = str(e)
        print(f'获取奖励列表失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

if __name__ == '__main__':
    app.run(debug=True)