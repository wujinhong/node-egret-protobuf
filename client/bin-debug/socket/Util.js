/**
 * Created by Administrator on 2016/1/29.
 */
var Util = (function () {
    function Util() {
    }
    /**去除文本开头与结尾空格*/
    Util.trim = function (str) {
        while ("\n" == str[0]) {
            str = str.slice(1);
        }
        return str;
    };
    Util.copy = function (obj) {
        var o = {};
        for (var key in obj) {
            o[key] = obj[key];
        }
        return o;
    };
    Util.arrayBuffer2String = function (byteArray) {
        var str = "";
        var dataView = byteArray["dataView"];
        var length = byteArray.length;
        for (var i = 0; i < length; i++) {
            var tmp = dataView.getUint8(i).toString(16);
            if (tmp.length == 1) {
                tmp = "0" + tmp;
            }
            str += tmp;
        }
        return str;
    };
    Util.string2ArrayBuffer = function (str) {
        var length = str.length;
        var byteArray = new egret.ByteArray(new ArrayBuffer(length / 2));
        var dataView = byteArray["dataView"];
        for (var i = 0; i < length; i += 2) {
            dataView.setUint8(i / 2, parseInt(str.substr(i, 2), 16));
        }
        return byteArray;
    };
    /**
     * 根据玩家的下注额获得指定的筹码资源
     * @param gold
     * @returns {string}
     */
    Util.getPlayerChipSrcByGold = function (gold) {
        if (gold >= 10000000) {
            return "chip3";
        }
        else if (gold >= 1000000) {
            return "chip4";
        }
        else if (gold >= 10000) {
            return "chip5";
        }
        else if (gold >= 1000) {
            return "chip2";
        }
        else {
            return "chip1";
        }
    };
    /**
     * 名字有 , (逗号)时，对名字特殊处理
     */
    Util.split = function (str) {
        var p = str.split(",");
        var length = p.length;
        var NameLength = p.length - 2;
        if (NameLength > 1) {
            var name = "";
            var index = 0;
            while (index < NameLength) {
                name += str[index];
            }
            p = [name, p[length - 2], p[length - 1]];
            return p;
        }
        return p;
    };
    Util.obj2Str = function (obj) {
        var tmp_search = '';
        for (var o in obj) {
            tmp_search += o + '=' + encodeURIComponent(obj[o]) + '&';
        }
        tmp_search = tmp_search.substr(0, tmp_search.length - 1);
        return tmp_search;
    };
    return Util;
}());
