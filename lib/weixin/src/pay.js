var xt = xt || {}

var ITEM_ID_GOLD = 1;
//创建client对象
xt.pay = {}

String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function (s, i) {
        return args[i];
    });
}

var _serverOrderWX = function (openId, waresName, money, token, cb) {
    var urlToken = encodeURIComponent(token);
    var _url = "{0}?money={1}&waresName={2}&token={3}&openId={4}&timestamp="+ Date.now();
    _url = _url.format(window.buyUrl, money, waresName, urlToken, openId);
    _url = encodeURI(_url);
    $.ajax({
        url: _url,
        dataType: "json",
        data: {},
        timeout: 35000,
        success: function (data) {
            console.log(data);
            if(data.status == 0)
            {
                cb(data.transid);
            }
            else
            {
                cb();
            }
        },
        error: function (xhr, emsg, ex) {
            console.log(emsg);
            cb();
        }
    });
}
xt.pay.buyWXGold = function (money, waresName, token, cb ) {
    var openId = Param.getUrlDataByName("openId");
    console.log("buyWXGold, token:" + token);

    _serverOrderWX(openId, waresName, money, token, function (ret) {
        if (ret) {
            var orderData = ret.split(",");
            var transid  = orderData[0];
            var nonceStr = orderData[1];
            console.log("_serverOrderWX成功，返回数据:"+ JSON.stringify(ret));
            onBridgeReady( transid, nonceStr, money, cb );
        }
        else
        {
           cb.fail();
        }
    });
}

function onBridgeReady(transid, nonceStr, money, cb )
{
    var time = "" + parseInt( Date.now() / 1000);
    var package = "prepay_id=" + transid;
    var str = "appId=wx52d7452abd5b2f75" + "&nonceStr=" + nonceStr + "&package=" + package + "&signType=MD5" + "&timeStamp=" + time + "&key=oJ70WszOzB5N22rBk80HiJBuCG3g5894";
    var sign = hex_md5(str).toUpperCase();

    var notWechat = (null == window.navigator.userAgent.toLowerCase().match(/MicroMessenger/i));// 不是微信平台打开的

    if( notWechat )
    {
        var weixinProtocal = str + "&sign=" + sign;
        weixinProtocal = "weixin://wap/pay?" + encodeURIComponent( weixinProtocal );
        cb.fail();
        window.location.replace( weixinProtocal );
        return;
    }
    wx.chooseWXPay({
        appId:"wx52d7452abd5b2f75",
        timestamp: time, // 支付签名时间戳，注意微信jssdk中的所有使用timestamp字段均为小写。但最新版的支付后台生成签名使用的timeStamp字段名需大写其中的S字符
        nonceStr: nonceStr, // 支付签名随机串，不长于 32 位
        package: package, // 统一支付接口返回的prepay_id参数值，提交格式如：prepay_id=***）
        signType: "MD5", // 签名方式，默认为'SHA1'，使用新版支付需传入'MD5'
        paySign: sign, // 支付签名
        success:cb.success,
        fail:cb.fail,
        complete:cb.complete,
        cancel:cb.cancel
    });
}