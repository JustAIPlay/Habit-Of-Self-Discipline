import os
import requests
from datetime import datetime, timedelta
from config import Config

class FeishuAPI:
    def __init__(self):
        self.app_id = Config.FEISHU_APP_ID
        self.app_secret = Config.FEISHU_APP_SECRET
        self.base_id = Config.BASE_ID
        self.table_id = Config.TASK_TABLE_ID
        self.access_token = None
        self.token_expires_at = None
        print(f'FeishuAPI初始化完成，使用BASE_ID: {self.base_id}, TABLE_ID: {self.table_id}')
        
    def _get_access_token(self):
        """获取飞书访问令牌"""
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            print('使用缓存的访问令牌')
            return self.access_token
            
        print('开始获取新的访问令牌...')
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        headers = {"Content-Type": "application/json"}
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()
        print(f'获取访问令牌响应: {response_data}')
        
        if response_data.get("code") == 0:
            self.access_token = response_data.get("tenant_access_token")
            self.token_expires_at = datetime.now() + timedelta(seconds=response_data.get("expire", 7200))
            print(f'成功获取访问令牌，有效期至: {self.token_expires_at}')
            return self.access_token
        else:
            error_msg = f"获取访问令牌失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
    
    def get_tables(self, app_token):
        """获取多维表格中的所有数据表"""
        print('开始获取数据表列表...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables"
        headers = {
            'Authorization': f'Bearer {self._get_access_token()}',
            'Content-Type': 'application/json'
        }
        response = requests.get(url, headers=headers)
        response_data = response.json()
        print(f'获取数据表响应: {response_data}')
        
        if response_data.get("code") == 0:
            tables = response_data.get("data", {}).get("items", [])
            print(f'成功获取数据表列表，共{len(tables)}个数据表')
            return tables
        else:
            error_msg = f"获取数据表列表失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
    
    def get_tasks(self):
        """获取任务列表"""
        print('开始获取任务列表...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{self.table_id}/records"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, headers=headers)
        response_data = response.json()
        
        if response_data.get("code") == 0:
            tasks = response_data.get("data", {}).get("items", [])
            print(f'成功获取任务列表，共{len(tasks)}个任务')
            return tasks
        else:
            error_msg = f"获取任务列表失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
    
    def update_task(self, record_id, fields):
        """更新任务状态"""
        print(f'开始更新任务 {record_id} 的状态...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{self.table_id}/records/{record_id}"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
        data = {"fields": fields}
        print(f'更新数据: {data}')
        
        response = requests.put(url, headers=headers, json=data)
        response_data = response.json()
        
        if response_data.get("code") == 0:
            print(f'成功更新任务 {record_id}')
            return response_data.get("data", {}).get("record")
        else:
            error_msg = f"更新任务状态失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
    
    def create_task(self, fields):
        """创建新任务"""
        print(f'开始创建任务: {fields.get("任务名称")}...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{self.table_id}/records"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
        data = {"fields": fields}
        
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()
        
        if response_data.get("code") == 0:
            print(f'成功创建任务: {fields.get("任务名称")}')
            return response_data.get("data", {}).get("record")
        else:
            error_msg = f"创建任务失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
    
    def get_rewards(self):
        """获取奖励列表"""
        print('开始获取奖励列表...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{Config.REWARD_TABLE_ID}/records"
        headers = {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, headers=headers)
        response_data = response.json()
        
        if response_data.get("code") == 0:
            rewards = response_data.get("data", {}).get("items", [])
            print(f'成功获取奖励列表，共{len(rewards)}个奖励')
            return rewards
        else:
            error_msg = f"获取奖励列表失败: {response_data}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)

    def get_all_data(self):
        """获取所有数据（任务、进度和奖励）"""
        print('开始获取所有数据...')
        try:
            # 并行获取任务和奖励数据
            tasks = self.get_tasks()
            rewards = self.get_rewards()
            
            # 计算进度数据
            completed_tasks = [task for task in tasks if task['fields'].get('已完成', False)]
            total_tasks = len(tasks)
            completed_count = len(completed_tasks)
            
            # 计算当前等级（每完成3个任务提升一级）
            current_level = (completed_count // 3) + 1
            
            # 计算连续打卡天数
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
            
            # 组合所有数据
            all_data = {
                'tasks': tasks,
                'progress': progress_data,
                'rewards': rewards
            }
            
            print(f'成功获取所有数据: 任务({len(tasks)}), 奖励({len(rewards)})')
            return all_data
        except Exception as e:
            error_msg = f"获取所有数据失败: {str(e)}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)

