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
        self.progress_table_id = Config.PROGRESS_TABLE_ID
        self.access_token = None
        self.token_expires_at = None
        print(f'FeishuAPI初始化完成，使用BASE_ID: {self.base_id}, TASK_TABLE_ID: {self.table_id}, PROGRESS_TABLE_ID: {self.progress_table_id}')
        
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
    
    def update_task(self, record_id, fields, is_progress=False):
        """更新任务状态或进度"""
        table_id = self.progress_table_id if is_progress else self.table_id
        print(f'开始更新记录 {record_id} 的状态...')
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{table_id}/records/{record_id}"
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
            
            # 计算进度数据 - 同时检查两种完成状态字段
            completed_tasks = [task for task in tasks if task['fields'].get('已完成', False) or task['fields'].get('任务完成状态') == '是']
            total_tasks = len(tasks)
            completed_count = len(completed_tasks)
            
            # 计算当前等级（每完成3个任务提升一级）
            current_level = (completed_count // 3) + 1
            
            # 计算总星星数 - 累加每个已完成任务的星星数量
            total_stars = sum(int(task['fields'].get('星星数量', 1)) for task in completed_tasks)
            
            progress_data = {
                'current_level': current_level,
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
    
    def update_user_progress(self, user_id, tasks, progress_data):
        """更新用户进度表"""
        print(f'开始更新用户 {user_id} 的进度数据...')
        
        # 检查两种可能的完成状态字段：'已完成'和'任务完成状态'
        completed_tasks = []
        for task in tasks:
            if task['fields'].get('已完成', False) or task['fields'].get('任务完成状态') == '是':
                completed_tasks.append(task)
        
        # 如果没有已完成的任务，仍然创建一条基本进度记录
        if not completed_tasks:
            print('没有已完成的任务，创建基本进度记录')
            url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{Config.PROGRESS_TABLE_ID}/records"
            headers = {
                "Authorization": f"Bearer {self._get_access_token()}",
                "Content-Type": "application/json"
            }
            
            # 准备基本字段数据
            fields = {
                "用户ID": user_id,
                "累计星星数": progress_data['total_stars'],
                "当前等级": progress_data['current_level']
            }
            
            data = {"fields": fields}
            print(f'更新基本数据: {data}')
            
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()
            
            if response_data.get("code") == 0:
                print(f'成功更新用户 {user_id} 的基本进度数据')
                return response_data.get("data", {}).get("record")
            else:
                error_msg = f"更新用户进度失败: {response_data}"
                print(f'错误: {error_msg}')
                raise Exception(error_msg)
        
        # 为每个已完成的任务创建单独的记录
        print(f'为 {len(completed_tasks)} 个已完成任务创建单独记录')
        created_records = []
        
        for task in completed_tasks:
            url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{Config.PROGRESS_TABLE_ID}/records"
            headers = {
                "Authorization": f"Bearer {self._get_access_token()}",
                "Content-Type": "application/json"
            }
            
            # 准备单个任务的字段数据
            fields = {
                "用户ID": user_id,
                "累计星星数": progress_data['total_stars'],
                "当前等级": progress_data['current_level'],
                "任务ID": task['record_id'],
                "任务完成状态": "是"
            }
            
            data = {"fields": fields}
            print(f'创建任务进度记录: {task["record_id"]} - {fields.get("任务名称")}')
            
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()
            
            if response_data.get("code") == 0:
                print(f'成功创建任务进度记录: {task["record_id"]}')
                created_records.append(response_data.get("data", {}).get("record"))
            else:
                error_msg = f"创建任务进度记录失败: {response_data}"
                print(f'错误: {error_msg}')
                # 继续处理其他任务，不中断流程
                print("继续处理其他任务...")
        
        print(f'成功更新用户 {user_id} 的进度数据，创建了 {len(created_records)} 条记录')
        return created_records
    
    def reset_tasks_status(self):
        """重置所有任务的完成状态为"否"""
        print('开始重置所有任务的完成状态...')
        try:
            # 获取所有任务
            tasks = self.get_tasks()
            reset_count = 0
            
            # 遍历所有任务并重置状态
            for task in tasks:
                record_id = task['record_id']
                # 只有当任务状态为"是"才需要重置
                if task['fields'].get('任务完成状态') == '是':
                    fields = {'任务完成状态': '否'}
                    self.update_task(record_id, fields, is_progress=False)
                    reset_count += 1
            
            print(f'成功重置 {reset_count} 个任务的完成状态')
            return reset_count
        except Exception as e:
            error_msg = f"重置任务状态失败: {str(e)}"
            print(f'错误: {error_msg}')
            raise Exception(error_msg)
            
    def redeem_reward(self, reward_id, user_id, current_stars):
        """兑换奖励"""
        print(f'开始兑换奖励 {reward_id}...')
        try:
            # 获取奖励信息
            url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{self.base_id}/tables/{Config.REWARD_TABLE_ID}/records/{reward_id}"
            headers = {
                "Authorization": f"Bearer {self._get_access_token()}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(url, headers=headers)
            response_data = response.json()
            
            if response_data.get("code") != 0:
                raise Exception(f"获取奖励信息失败: {response_data}")
                
            reward = response_data.get("data", {}).get("record", {})
            required_stars = int(reward.get("fields", {}).get("所需星星数", 0))
            
            # 检查星星是否足够
            if current_stars < required_stars:
                raise Exception(f"星星不足，需要{required_stars}颗星星，当前只有{current_stars}颗")
            
            # 更新奖励状态
            fields = {
                "是否已兑换": "是",
                "兑换用户": user_id,
                "兑换时间": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            response = requests.put(url, headers=headers, json={"fields": fields})
            response_data = response.json()
            
            if response_data.get("code") == 0:
                print(f'成功兑换奖励 {reward_id}')
                return {
                    "reward": reward,
                    "stars_spent": required_stars,
                    "remaining_stars": current_stars - required_stars
                }
            else:
                raise Exception(f"更新奖励状态失败: {response_data}")
                
        except Exception as e:
            error_msg = str(e)
            print(f'兑换奖励失败: {error_msg}')
            raise Exception(error_msg)

