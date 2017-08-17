"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const User_1 = require("./User");
class Main {
    constructor() {
        this.id_index = 0;
        this.userList = [];
        var server = new ws_1.Server({ port: 8181 });
        server.on('connection', (client) => {
            this.id_index++;
            var user = new User_1.User(client);
            this.userList.push(user);
            user.id = this.id_index;
            client.on('message', (message) => {
                // var dataview = string2dataView(message);
                console.log(message);
                // getCommand(us,message);
            });
            // 退出聊天
            client.on('close', (close) => {
                try {
                    var idx = this.userList.indexOf(user);
                    this.userList.splice(idx, 1);
                    this.sendOther("11003", user.id);
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
    sendOther(msg, userId) {
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
    }
    send(user, msg) {
        try {
            user.ws.send("消息内容:" + msg);
        }
        catch (e) {
            user.alive = 0;
        }
    }
}
var main = new Main();
console.log(main.id_index + 123);
//# sourceMappingURL=Main.js.map