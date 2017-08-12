module texas
{
    export enum EventCode
    {
        ENTER_GAME = 0,
        SIT_DOWN = 1,
        SEND_PLAYER_CARDS = 2, //自己的底牌
        QUIT_GAME = 3,
        GAME_CMD_TURN = 4,
        GAME_CMD_RIVER = 5,
        GAME_CMD_SHOWDOWN = 6,
        TURN_PLAYER = 7, //玩家思考
        STAND_UP = 8,
        PUBLIC_CARDS = 9,
        PLAYER_OP = 10,
        GAME_START = 11,
        SUB_POOL = 12,
        GAME_RESULT = 13,
        UPDATE_PLAYER_STATUS = 14,
        SHOW_MAX_CARDS = 15,
        TABLE_CHAT = 16,
        CHANGE_TABLE_OWNER = 17,
        SET_GAME_AUTO_START = 18,
        SHOW_CARDS = 19,
        KICK_PLAYER = 20,
        TASK_LIST = 21, //任务
        RECIVED_TASK_REWARD = 22,//任务完成
        MAGIC_FACE = 23,//魔法表情
        TABLE_WIN_RECORD = 24,//游戏输赢数据
        PLAYER_BASE_INFO = 25, //玩家信息
        SNG_UPDATE = 26, //upate the player count of sng
        SNG_GRADE = 27,
        HALL_INFO_UPDATE = 28,
        UPDATE_GOLD = 29,
        SLOTS = 30,
        DICE = 31,
        SLOTS_STOP = 32,
        GAME_SETTLEMENT = 33,
        PLAYER_DEPOSIT = 34
    }
}