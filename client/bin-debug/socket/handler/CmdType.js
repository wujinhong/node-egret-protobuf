var texas;
(function (texas) {
    var CmdType = (function () {
        function CmdType() {
        }
        CmdType.BASE = 0;
        /** 登陆 */
        CmdType.LOGIN = 1;
        /** 进入牌桌 */
        CmdType.ENTER_GAME = 2;
        /** 离开牌桌 */
        CmdType.QUIT_GAME = 3;
        /** 退出 */
        CmdType.LOGOUT = 4;
        /** 房间内推送新玩家进入 */
        CmdType.JOIN_TABLE = 5;
        /** 发底牌 */
        CmdType.SEND_PLAYER_CARDS = 6;
        /** 玩家操作 */
        CmdType.PLAYER_OP = 7;
        /** 发公共牌 */
        CmdType.PUBLIC_CARDS = 8;
        /** 坐下 */
        CmdType.SIT_DOWN = 9;
        /** 游戏结束 */
        CmdType.GAME_RESULT = 10;
        /** 切换操作玩家 */
        CmdType.TURN_PLAYER = 11;
        /** 玩家站起 */
        CmdType.STAND_UP = 12;
        /** 分池 */
        CmdType.SUB_POOL = 13;
        /** 游戏开始 */
        CmdType.GAME_START = 14;
        /** 更新玩家信息 */
        CmdType.UPDATE_PLAYER_STATUS = 15;
        /** 提示玩家最大成手牌 */
        CmdType.SHOW_MAX_CARDS = 16;
        /** 玩家创建房间 */
        CmdType.CREATE_TABLE = 17;
        /** 创建房间之间获取房间组列表 */
        CmdType.GET_ROOM_GROUP = 18;
        /** 踢人 */
        CmdType.KICK_PLAYER = 19;
        /** 通知关闭牌桌 */
        CmdType.NOTICE_CLOSE_TABLE = 20;
        /** 快速加入房间 */
        CmdType.QUICK_JOIN_TABLE = 21;
        /** 获取牌桌列表 */
        CmdType.GET_TABLES = 22;
        /** 机器人获取牌桌信息 */
        CmdType.ROBOT_GET_TABLE_INFO = 23;
        /** 自动开始设置 */
        CmdType.SET_GAME_AUTO_START = 24;
        /** 更换房主 */
        CmdType.CHANGE_TABLE_OWNER = 25;
        /** 牌桌聊天 */
        CmdType.TABLE_CHAT = 26;
        /** 领取破产补偿 */
        CmdType.BANKRUPTCY_COMPENSATION = 27;
        /** 换桌 */
        CmdType.CHANGE_TABLE = 28;
        /** 机器人补充筹码 */
        CmdType.ROBOT_RESET_CHIPS = 29;
        /** 充值通知 */
        CmdType.RECHARGE_NOTICE = 30;
        /** 玩家基本信息 */
        CmdType.PLAYER_BASE_INFO = 31;
        /** 更新牌桌数据 */
        CmdType.UPDATE_TABLE_INFO = 32;
        /** 自动补充筹码 */
        CmdType.AUTO_ADD_TABLE_GOLD = 33;
        /** 亮牌 */
        CmdType.SHOW_CARDS = 34;
        /** 获取任务列表 */
        CmdType.TASK_LIST = 35;
        /** 领取任务奖励 */
        CmdType.RECIVED_TASK_REWARD = 36;
        /** 推送最新完成的任务的ID */
        CmdType.LOGIN_REWARD = 37;
        /** 牌桌输赢记录排名 */
        CmdType.TABLE_WIN_RECORD = 38;
        /** 个人牌桌输赢记录 */
        CmdType.PLAYER_WIN_RECORD = 39;
        /** 魔法表情 */
        CmdType.MAGIC_EXPRESSION = 40;
        /** SNG人数 */
        CmdType.SNG_UPDATE = 41;
        /** SNG当前名次*/
        CmdType.SNG_GRADE = 42;
        /** 返回SNG赛场*/
        CmdType.SNG_BACK = 43;
        /** 首页信息显示*/
        CmdType.HALL_INFO_UPDATE = 44;
        /** 更新用户状态*/
        CmdType.UPDATE_STATE = 45;
        /** 更新任务状态*/
        CmdType.UPDATE_TASK_STATUS = 46;
        /** 老虎机 **/
        CmdType.BET_SLOT_MACHINE = 47;
        /** 骰子 **/
        CmdType.BET_DICE = 48;
        /** 老虎机 **/
        CmdType.STOP_SLOT_MACHINE_GAME = 49;
        /** 剩余玩家数量 **/
        CmdType.REMAIN_PLAYER_COUNT = 50;
        /** 最近7次充值次数最多额度 **/
        CmdType.GET_MOST_RECHARGE_MONEY = 51;
        /** 游戏结算协议 **/
        CmdType.GAME_SETTLEMENT = 52;
        /** 托管协议 **/
        CmdType.PLAYER_DEPOSIT = 53;
        /** 跑马灯 **/
        CmdType.MARQUEE = 54;
        /** 统计数据 **/
        CmdType.STATISTICS_DATA = 55;
        /** 首页信息显示*/
        CmdType.ROBOT_TABLE_SETTING = 200;
        /** 心跳 */
        CmdType.HEART_BEAT = 100;
        /** 弹窗接口（错误码处理） */
        CmdType.ALERT_NOTICE = -32768;
        return CmdType;
    }());
    texas.CmdType = CmdType;
})(texas || (texas = {}));
