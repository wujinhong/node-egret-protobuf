var texas;
(function (texas) {
    var LoginHandler = (function () {
        function LoginHandler() {
        }
        LoginHandler.prototype.execute = function (pkg) {
        };
        /**是否已经登录过，sockect重连*/
        LoginHandler.sockectReconnect = false;
        return LoginHandler;
    }());
    texas.LoginHandler = LoginHandler;
})(texas || (texas = {}));
