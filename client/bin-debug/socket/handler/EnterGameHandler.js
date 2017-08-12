var texas;
(function (texas) {
    var EnterGameHandler = (function () {
        function EnterGameHandler() {
        }
        EnterGameHandler.prototype.execute = function (pkg) {
            var bytes = pkg.getProtoBuf();
            var Builder = texas.ProtoBufMgr.getInstance().getBuilder("TableInfo");
            var msg = Builder.decode(bytes["data"].buffer);
            var players = msg.playerInfoSet.playerInfoList;
            var roomID = msg.tableId;
        };
        return EnterGameHandler;
    }());
    texas.EnterGameHandler = EnterGameHandler;
})(texas || (texas = {}));
