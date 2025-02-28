import os
import requests
from datetime import datetime, timedelta
from config import Config

class FeishuAPI:
    def __init__(self):
        self.app_id = Config.FEISHU_APP_ID
        self.app_secret = Config.FEISHU_APP_SECRET
        self.base_id = Config.BASE_ID
        self.table_id = Config.TABLE_ID
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
        
        if response_data.get("code") == 0:
            self.access_token = response_data.get("tenant_access_token")
            self.token_expires_at = datetime.now() + timedelta(seconds=response_data.get("expire", 7200))
            print(f'成功获取访问令牌，有效期至: {self.token_expires_at}')
            return self.access_token
        else:
            error_msg = f"获取访问令牌失败: {response_data}"
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