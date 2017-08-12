module texas
{
    export class CmdType
    {
        public static BASE:number = 0;
        /** 登陆 */
        public static LOGIN:number = 1;
        /** 进入牌桌 */
        public static ENTER_GAME:number = 2;
        /** 离开牌桌 */
        public static QUIT_GAME:number = 3;
        /** 退出 */
        public static LOGOUT:number = 4;
        /** 房间内推送新玩家进入 */
        public static JOIN_TABLE:number = 5;
        /** 发底牌 */
        public static SEND_PLAYER_CARDS:number = 6;
        /** 玩家操作 */
        public static PLAYER_OP:number = 7;
        /** 发公共牌 */
        public static PUBLIC_CARDS:number = 8;
        /** 坐下 */
        public static SIT_DOWN:number = 9;
        /** 游戏结束 */
        public static GAME_RESULT:number = 10;
        /** 切换操作玩家 */
        public static TURN_PLAYER:number = 11;
        /** 玩家站起 */
        public static STAND_UP:number = 12;
        /** 分池 */
        public static SUB_POOL:number = 13;
        /** 游戏开始 */
        public static GAME_START:number = 14;
        /** 更新玩家信息 */
        public static UPDATE_PLAYER_STATUS:number = 15;
        /** 提示玩家最大成手牌 */
        public static SHOW_MAX_CARDS:number = 16;
        /** 玩家创建房间 */
        public static CREATE_TABLE:number = 17;
        /** 创建房间之间获取房间组列表 */
        public static GET_ROOM_GROUP:number = 18;
        /** 踢人 */
        public static KICK_PLAYER:number = 19;
        /** 通知关闭牌桌 */
        public static NOTICE_CLOSE_TABLE:number = 20;
        /** 快速加入房间 */
        public static QUICK_JOIN_TABLE:number = 21;
        /** 获取牌桌列表 */
        public static GET_TABLES:number = 22;
        /** 机器人获取牌桌信息 */
        public static ROBOT_GET_TABLE_INFO:number = 23;
        /** 自动开始设置 */
        public static SET_GAME_AUTO_START:number = 24;
        /** 更换房主 */
        public static CHANGE_TABLE_OWNER:number = 25;
        /** 牌桌聊天 */
        public static TABLE_CHAT:number = 26;
        /** 领取破产补偿 */
        public static BANKRUPTCY_COMPENSATION:number = 27;
        /** 换桌 */
        public static CHANGE_TABLE:number = 28;
        /** 机器人补充筹码 */
        public static ROBOT_RESET_CHIPS:number = 29;
        /** 充值通知 */
        public static RECHARGE_NOTICE:number = 30;
        /** 玩家基本信息 */
        public static PLAYER_BASE_INFO:number = 31;
        /** 更新牌桌数据 */
        public static UPDATE_TABLE_INFO:number = 32;
        /** 自动补充筹码 */
        public static AUTO_ADD_TABLE_GOLD:number = 33;
        /** 亮牌 */
        public static SHOW_CARDS:number = 34;
        /** 获取任务列表 */
        public static TASK_LIST:number = 35;
        /** 领取任务奖励 */
        public static RECIVED_TASK_REWARD:number = 36;
        /** 推送最新完成的任务的ID */
        public static LOGIN_REWARD:number = 37;
        /** 牌桌输赢记录排名 */
        public static TABLE_WIN_RECORD:number = 38;
        /** 个人牌桌输赢记录 */
        public static PLAYER_WIN_RECORD:number = 39;
        /** 魔法表情 */
        public static MAGIC_EXPRESSION:number = 40;
        /** SNG人数 */
        public static SNG_UPDATE:number = 41;
        /** SNG当前名次*/
        public static SNG_GRADE:number = 42;
        /** 返回SNG赛场*/
        public static SNG_BACK:number = 43;
        /** 首页信息显示*/
        public static HALL_INFO_UPDATE:number = 44;
        /** 更新用户状态*/
        public static UPDATE_STATE:number = 45;
        /** 更新任务状态*/
        public static UPDATE_TASK_STATUS:number = 46;
        /** 老虎机 **/
        public static BET_SLOT_MACHINE:number = 47;
        /** 骰子 **/
        public static BET_DICE:number = 48;
        /** 老虎机 **/
        public static STOP_SLOT_MACHINE_GAME:number = 49;
        /** 剩余玩家数量 **/
        public static REMAIN_PLAYER_COUNT = 50;
        /** 最近7次充值次数最多额度 **/
        public static GET_MOST_RECHARGE_MONEY = 51;
        /** 游戏结算协议 **/
        public static GAME_SETTLEMENT = 52;
        /** 托管协议 **/
        public static PLAYER_DEPOSIT = 53;
        /** 跑马灯 **/
        public static MARQUEE = 54;
        /** 统计数据 **/
        public static STATISTICS_DATA  = 55;
        /** 首页信息显示*/
        public static ROBOT_TABLE_SETTING:number = 200;
        /** 心跳 */
        public static HEART_BEAT:number = 100;
        /** 弹窗接口（错误码处理） */
        public static ALERT_NOTICE:number = -32768;
    }
}