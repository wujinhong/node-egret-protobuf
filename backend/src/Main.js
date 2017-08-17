"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var User_1 = require("./User");
var Main = (function () {
    function Main() {
        var _this = this;
        this.id_index = 0;
        this.userList = [];
        var server = new ws_1.Server({ port: 8181 });
        server.on('connection', function (client) {
            _this.id_index++;
            var user = new User_1.User(client);
            _this.userList.push(user);
            user.id = _this.id_index;
            client.on('message', function (message) {
                // var dataview = string2dataView(message);
                console.log(message);
                // getCommand(us,message);
            });
            // 退出聊天
            client.on('close', function (close) {
                try {
                    var idx = _this.userList.indexOf(user);
                    _this.userList.splice(idx, 1);
                    _this.sendOther("11003", user.id);
                }
                catch (e) {
                }
            });
        });
    }
    /**
     * 发送给其它人
     * @param {string} msg
     * @param {number} id
     */
    Main.prototype.sendOther = function (msg, userId) {
        for (var i = 0; i < this.userList.length; i++) {
            var user = this.userList[i];
            try {
                if (user.id != userId) {
                    user.ws.send("消息内容:" + msg);
                }
            }
            catch (e) {
            }
        }
    };
    Main.prototype.send = function (user, msg) {
        try {
            user.ws.send("消息内容:" + msg);
        }
        catch (e) {
            user.alive = 0;
        }
    };
    return Main;
}());
var main = new Main();
console.log(main.id_index + 123);
//# sourceMappingURL=Main.js.map