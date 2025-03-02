from flask import Flask, jsonify, request, send_file, send_from_directory, session
from flask_cors import CORS
from feishu_api import FeishuAPI
from config import Config
from datetime import datetime
import os

app = Flask(__name__, static_url_path='', static_folder='.')
app.secret_key = os.urandom(24)  # 设置session密钥
CORS(app)

# 初始化飞书API
feishu_api = FeishuAPI()

# 在应用启动时进行配置验证
print('开始应用初始化...')
Config.validate_config()
print('应用初始化完成')

# 创建一个文件来存储上次重置日期，避免依赖session
RESET_DATE_FILE = 'last_reset_date.txt'

def get_last_reset_date():
    """从文件中获取上次重置日期"""
    try:
        if os.path.exists(RESET_DATE_FILE):
            with open(RESET_DATE_FILE, 'r') as f:
                return f.read().strip()
        return None
    except Exception as e:
        print(f'读取上次重置日期失败: {str(e)}')
        return None

def save_reset_date(date_str):
    """保存重置日期到文件"""
    try:
        with open(RESET_DATE_FILE, 'w') as f:
            f.write(date_str)
        print(f'已保存重置日期: {date_str}')
    except Exception as e:
        print(f'保存重置日期失败: {str(e)}')

@app.route('/')
def index():
    # 检查是否需要重置任务状态（每天首次访问时）
    today = datetime.now().strftime('%Y-%m-%d')
    last_reset_date = get_last_reset_date()
    
    if last_reset_date != today:
        print(f'检测到新的一天，上次重置日期: {last_reset_date}, 当前日期: {today}')
        try:
            reset_count = feishu_api.reset_tasks_status()
            print(f'已重置 {reset_count} 个任务的状态')
            # 更新最后重置日期
            save_reset_date(today)
        except Exception as e:
            print(f'重置任务状态失败: {str(e)}')
    
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
        # 只获取并传递任务状态字段
        is_completed = request.json.get('fields', {}).get('已完成', False)
        fields = {'任务完成状态': '是' if is_completed else '否'}
        print(f'更新字段: {fields}')
        updated_task = feishu_api.update_task(record_id, fields, is_progress=False)
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
@app.route('/api/user/checkin', methods=['POST'])
def user_checkin():
    """用户打卡功能 - 支持部分任务打卡和多次打卡"""
    print('收到用户打卡请求')
    try:
        # 获取任务列表
        tasks = feishu_api.get_tasks()
        
        # 获取用户选择的任务ID列表
        selected_task_ids = request.json.get('task_ids', [])
        print(f'用户选择的任务ID: {selected_task_ids}')
        
        # 如果没有选择任何任务，返回错误
        if not selected_task_ids:
            return jsonify({
                'code': 1,
                'message': '请至少选择一项已完成的任务进行打卡'
            }), 400
        
        # 筛选出用户选择的任务
        selected_tasks = [task for task in tasks if task['record_id'] in selected_task_ids]
        
        # 更新选中任务的完成状态
        for task in selected_tasks:
            task_id = task['record_id']
            # 将任务标记为已完成
            fields = {'任务完成状态': '是'}
            feishu_api.update_task(task_id, fields, is_progress=False)
            print(f'已将任务 {task_id} 标记为已完成')
        
        # 重新获取任务列表以获取最新状态
        updated_tasks = feishu_api.get_tasks()
        
        # 获取当前用户进度
        completed_tasks = [task for task in updated_tasks if task['fields'].get('已完成', False) or task['fields'].get('任务完成状态') == '是']
        total_tasks = len(updated_tasks)
        completed_count = len(completed_tasks)
        
        # 计算新的进度数据
        current_level = (completed_count // 3) + 1
        
        # 计算总星星数 - 累加每个已完成任务的星星数量
        total_stars = sum(int(task['fields'].get('星星数量', 1)) for task in completed_tasks)
        
        # 准备进度数据
        progress_data = {
            'current_level': current_level,
            'total_stars': total_stars,
            'completed_tasks': completed_count,
            'total_tasks': total_tasks
        }
        
        # 更新用户进度表 - 只传递当前选择的任务，而不是所有已完成的任务
        user_id = request.headers.get('X-User-ID', 'default_user')  # 从请求头获取用户ID
        # 更新selected_tasks以获取最新状态
        selected_tasks = [task for task in updated_tasks if task['record_id'] in selected_task_ids]
        feishu_api.update_user_progress(user_id, selected_tasks, progress_data)
        
        # 生成奖励消息
        reward_message = f'恭喜你完成了{len(selected_task_ids)}项任务！\n当前等级：{current_level}\n累计星星：{total_stars}颗'
        
        return jsonify({
            'code': 0,
            'data': {
                'reward_message': reward_message,
                'progress': progress_data
            }
        })
    except Exception as e:
        error_msg = str(e)
        print(f'用户打卡失败: {error_msg}')
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

@app.route('/api/rewards/redeem', methods=['POST'])
def redeem_reward():
    """兑换奖励"""
    print('收到兑换奖励请求')
    try:
        # 获取请求数据
        reward_id = request.json.get('reward_id')
        user_id = request.headers.get('X-User-ID', 'default_user')  # 从请求头获取用户ID
        current_stars = request.json.get('current_stars', 0)
        
        if not reward_id:
            return jsonify({
                'code': 1,
                'message': '缺少奖励ID'
            }), 400
        
        # 调用飞书API兑换奖励
        result = feishu_api.redeem_reward(reward_id, user_id, current_stars)
        
        print(f'成功兑换奖励: {reward_id}')
        return jsonify({
            'code': 0,
            'data': {
                'reward': result['reward'],
                'stars_spent': result['stars_spent'],
                'remaining_stars': result['remaining_stars'],
                'message': f'恭喜你成功兑换了 {result["reward"]["fields"].get("奖励名称", "未命名奖励")}！'
            }
        })
    except Exception as e:
        error_msg = str(e)
        print(f'兑换奖励失败: {error_msg}')
        return jsonify({
            'code': 1,
            'message': error_msg
        }), 500

if __name__ == '__main__':
    app.run(debug=True)