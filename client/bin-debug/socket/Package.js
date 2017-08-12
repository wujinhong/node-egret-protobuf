/**
 *数据包处理
 demon
 */
var texas;
(function (texas) {
    var Package = (function () {
        function Package() {
            this.byteArray = new egret.ByteArray();
        }
        Package.prototype.readPkg = function (byteArray) {
            this.byteArray = byteArray;
            this.isEncrypt = byteArray.readBoolean();
            this.encryptForm = byteArray.readByte();
            this.cmdType = byteArray.readShort();
            // this.errorCode = byteArray.readByte();
        };
        Package.prototype.getCmdType = function () {
            return this.cmdType;
        };
        Package.prototype.getProtoBuf = function () {
            var s = this.getShort();
            var arrays = new egret.ByteArray();
            this.byteArray.readBytes(arrays, 0, s);
            return arrays;
        };
        Package.prototype.getInt = function () {
            return this.byteArray.readInt();
        };
        Package.prototype.getShort = function () {
            return this.byteArray.readShort();
        };
        Package.prototype.getBoolean = function () {
            return this.byteArray.readBoolean();
        };
        Package.prototype.getByte = function () {
            return this.byteArray.readByte();
        };
        Package.prototype.getLong = function () {
            var one = this.getByte();
            var two = this.getByte();
            var tree = this.getByte();
            var four = this.getByte();
            var five = this.getByte();
            var six = this.getByte();
            var seven = this.getByte();
            var eight = this.getByte();
            //java数据 BIG-ENDIAN
            var l = ((one & 0xff) << 56) |
                ((two & 0xff) << 48) |
                ((tree & 0xff) << 40) |
                ((four & 0xff) << 32) |
                ((five & 0xff) << 24) |
                ((six & 0xff) << 16) |
                ((seven & 0xff) << 8) |
                (eight & 0xff);
            return protobuf.util.LongBits.fromNumber(l).toLong();
        };
        Package.prototype.getString = function () {
            var short = this.getShort();
            return this.byteArray.readUTFBytes(short);
        };
        Package.prototype.putInt = function (int) {
            this.byteArray.writeInt(int);
        };
        Package.prototype.putDouble = function (int) {
            this.byteArray.writeDouble(int);
        };
        Package.prototype.putLong = function (long) {
            if (long["LITTLE_ENDIAN"]) {
                this.byteArray.writeUnsignedInt(long["high"]);
                this.byteArray.writeUnsignedInt(long["low"]);
            }
            else {
                this.byteArray.writeUnsignedInt(long["low"]);
                this.byteArray.writeUnsignedInt(long["high"]);
            }
        };
        Package.prototype.putShort = function (s) {
            this.byteArray.writeShort(s);
        };
        Package.prototype.putBoolean = function (b) {
            this.byteArray.writeBoolean(b);
        };
        Package.prototype.putString = function (s) {
            this.byteArray.writeUTF(s);
        };
        Package.prototype.putBytes = function (data) {
            this.putShort(data.byteLength);
            this.byteArray.writeBytes(data, 0, data.byteLength);
        };
        Package.prototype.toByteArray = function () {
            return this.byteArray;
        };
        Package.prototype.putByte = function (b) {
            this.byteArray.writeByte(b);
        };
        Package.createPkg = function (cmdType) {
            var pkg = new Package();
            pkg.putByte(0);
            pkg.putByte(0);
            pkg.putInt(0); //自增ID保留4个byte
            pkg.putShort(cmdType);
            pkg.cmdType = cmdType;
            return pkg;
        };
        return Package;
    }());
    texas.Package = Package;
})(texas || (texas = {}));
