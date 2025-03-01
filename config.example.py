import os

class Config:
    # 飞书应用配置
    FEISHU_APP_ID = os.getenv('FEISHU_APP_ID')  # 在此填入你的飞书应用ID
    FEISHU_APP_SECRET = os.getenv('FEISHU_APP_SECRET')  # 在此填入你的飞书应用密钥
    
    # 多维表格配置
    BASE_ID = os.getenv('BASE_ID')  # 在此填入你的多维表格ID
    TASK_TABLE_ID = os.getenv('TASK_TABLE_ID')  # 在此填入你的任务表ID
    REWARD_TABLE_ID = os.getenv('REWARD_TABLE_ID')  # 在此填入你的奖励表ID
    PROGRESS_TABLE_ID = os.getenv('PROGRESS_TABLE_ID')  # 在此填入你的用户进度表ID
    
    @staticmethod
    def validate_config():
        """验证配置是否完整"""
        print('开始验证配置...')
        required_vars = ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'BASE_ID', 
                        'TASK_TABLE_ID', 'REWARD_TABLE_ID', 'PROGRESS_TABLE_ID']
        for var in required_vars:
            value = getattr(Config, var)
            print(f'检查配置 {var}: {"已设置" if value else "未设置"}')
        
        missing_vars = [var for var in required_vars if not getattr(Config, var)]
        
        if missing_vars:
            error_msg = f'缺少必要的环境变量: {", ".join(missing_vars)}'
            print(f'配置验证失败: {error_msg}')
            raise ValueError(error_msg)
        
        print('配置验证完成')