from feishu_api import FeishuAPI
from config import Config

def init_rewards_table():
    # 创建飞书API实例
    feishu_api = FeishuAPI()
    
    # 奖励数据
    rewards_data = [
        # 娱乐奖励
        {
            "fields": {
                "奖励名称": "看一集喜欢的动画片",
                "所需星星数": 5,
                "奖励描述": "可以观看一集自己喜欢的动画片",
                "是否已兑换": "否"
            }
        },
        {
            "fields": {
                "奖励名称": "玩手机游戏",
                "所需星星数": 8,
                "奖励描述": "可以玩一会儿手机游戏",
                "是否已兑换": "否"
            }
        },
        
        # 户外活动
        {
            "fields": {
                "奖励名称": "去公园玩",
                "所需星星数": 10,
                "奖励描述": "可以去公园玩耍和运动",
                "是否已兑换": "否"
            }
        },
        {
            "fields": {
                "奖励名称": "骑自行车",
                "所需星星数": 8,
                "奖励描述": "可以骑自行车出去玩",
                "是否已兑换": "否"
            }
        },
        
        # 特殊奖励
        {
            "fields": {
                "奖励名称": "购买新玩具",
                "所需星星数": 30,
                "奖励描述": "可以购买一个心仪的新玩具",
                "是否已兑换": "否"
            }
        },
        {
            "fields": {
                "奖励名称": "去游乐园",
                "所需星星数": 50,
                "奖励描述": "可以去游乐园玩一天",
                "是否已兑换": "否"
            }
        }
    ]
    
    # 批量创建奖励记录
    for reward in rewards_data:
        try:
            feishu_api.create_reward(reward['fields'])
            print(f'成功创建奖励: {reward["fields"]["奖励名称"]}');
        except Exception as e:
            print(f'创建奖励失败: {reward["fields"]["奖励名称"]} - {str(e)}')

if __name__ == '__main__':
    print('开始初始化奖励数据...')
    Config.validate_config()
    init_rewards_table()
    print('奖励数据初始化完成')