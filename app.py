from flask import Flask, jsonify, request
from flask_cors import CORS
from feishu_api import FeishuAPI
from config import Config

app = Flask(__name__)
CORS(app)

# 初始化飞书API
feishu_api = FeishuAPI()

@app.before_first_request
def validate_config():
    """启动时验证配置"""
    print('开始应用初始化...')
    Config.validate_config()
    print('应用初始化完成')

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

if __name__ == '__main__':
    print('启动应用服务器...')
    app.run(debug=True)