var texas;
(function (texas) {
    var SocketClient = (function () {
        function SocketClient() {
        }
        SocketClient.prototype.connect = function (ip, port, path, callfun, objectThis) {
            this.socketConnector = new texas.SocketConnector(this, port, ip, path);
            this.socketConnector.connect(callfun, objectThis);
            // CmdString.init();
        };
        SocketClient.prototype.reConnect = function (callfun, objectThis) {
            // LoadStartUI.instance.removeLoadUI();
            // AppContainer.getInstance().gameData.leaveGame();
            this.socketConnector.connect(callfun, objectThis);
        };
        SocketClient.prototype.handlePkg = function (pkg) {
            var type = pkg.getCmdType();
            /*if( CmdString.CmdType[ type ] )
            {
                console.log( "cmdType:" + type + ";" + CmdString.CmdType[ type ] );
            }*/
            var handler = texas.HandleMgr.getHandler(type);
            if (handler)
                handler.execute(pkg);
            else
                console.log("cmd handler is null 主协议ID:" + type);
        };
        SocketClient.prototype.sendPkg = function (pkg) {
            var type = pkg.getCmdType();
            /*if( CmdString.CmdType[ type ] )
            {
                console.log( "发送：cmdType:" + type + ";" + CmdString.CmdType[ type ] );
            }*/
            this.socketConnector.sendData(pkg.toByteArray());
        };
        return SocketClient;
    }());
    texas.SocketClient = SocketClient;
})(texas || (texas = {}));
