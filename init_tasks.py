from feishu_api import FeishuAPI
from config import Config
from datetime import datetime
import time
import pytz

def init_tasks():
    # 初始化飞书API
    feishu_api = FeishuAPI()
    
    # 获取当前时间戳并转换为北京时间
    beijing_tz = pytz.timezone('Asia/Shanghai')
    current_timestamp = datetime.now().timestamp()
    current_time = datetime.fromtimestamp(current_timestamp, beijing_tz).strftime('%Y-%m-%d %H:%M:%S')
    
    # 定义初始任务数据
    tasks = [
        # 学习任务
        {
            "fields": {
                "任务名称": "完成每日作业",
                "任务描述": "认真完成老师布置的所有作业",
                "任务类型": "学习任务",
                "星星数量": 3
            }
        },
        {
            "fields": {
                "任务名称": "阅读课外书",
                "任务描述": "每天阅读30分钟课外书",
                "任务类型": "学习任务",
                "星星数量": 2
            }
        },
        {
            "fields": {
                "任务名称": "复习今日课程",
                "任务描述": "复习今天学习的知识点",
                "任务类型": "学习任务",
                "星星数量": 2
            }
        },
        
        # 生活任务
        {
            "fields": {
                "任务名称": "整理房间",
                "任务描述": "整理床铺、书桌和玩具",
                "任务类型": "生活任务",
                "星星数量": 2
            }
        },
        {
            "fields": {
                "任务名称": "刷牙洗脸",
                "任务描述": "早晚按时刷牙洗脸",
                "任务类型": "生活任务",
                "星星数量": 1
            }
        },
        {
            "fields": {
                "任务名称": "收拾书包",
                "任务描述": "检查明天需要的课本和文具",
                "任务类型": "生活任务",
                "星星数量": 1
            }
        },
        
        # 纪律任务
        {
            "fields": {
                "任务名称": "按时起床",
                "任务描述": "每天按时起床，不赖床",
                "任务类型": "纪律任务",
                "星星数量": 2
            }
        },
        {
            "fields": {
                "任务名称": "遵守课堂纪律",
                "任务描述": "上课认真听讲，不交头接耳",
                "任务类型": "纪律任务",
                "星星数量": 2
            }
        },
        {
            "fields": {
                "任务名称": "按时就寝",
                "任务描述": "晚上按时睡觉，保证充足睡眠",
                "任务类型": "纪律任务",
                "星星数量": 2
            }
        }
    ]
    
    # 批量创建任务记录
    for task in tasks:
        try:
            feishu_api.create_task(task['fields'])
            print(f'成功创建任务: {task["fields"]["任务名称"]}');
        except Exception as e:
            print(f'创建任务失败: {task["fields"]["任务名称"]} - {str(e)}')

if __name__ == '__main__':
    print('开始初始化任务数据...')
    Config.validate_config()
    init_tasks()
    print('任务数据初始化完成')