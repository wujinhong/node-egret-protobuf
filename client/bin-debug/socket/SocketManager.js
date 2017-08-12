var SocketClient = texas.SocketClient;
var Package = texas.Package;
var CmdType = texas.CmdType;
var SocketManager = (function () {
    function SocketManager() {
        this.ip = "127.0.0.1";
        this.port = 8181;
        this.sc = new SocketClient();
    }
    SocketManager.prototype.startConnet = function () {
        this.sc.connect(this.ip, this.port, "", this.onConnect, this);
    };
    SocketManager.prototype.onConnect = function () {
        this.sendMsg("mm");
    };
    SocketManager.prototype.sendMsg = function (msg) {
        var pkg = Package.createPkg(CmdType.BET_DICE);
        pkg.putString(msg);
        this.sc.sendPkg(pkg);
    };
    return SocketManager;
}());
