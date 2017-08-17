"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var User = (function () {
    function User(ws) {
        this.game_status = 0;
        this.id = 0;
        this.name = "new";
        this.start = 0;
        this.alive = 1;
        this.ws = ws;
    }
    return User;
}());
exports.User = User;
//# sourceMappingURL=User.js.map