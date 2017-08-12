var WebSocketServer = require('ws').Server;
wss = new WebSocketServer({ port: 8181 });


var arrusers = [];
var id_index = 0;
function US(ws){
    var ou = new Object;
    ou.ws = ws;
    ou.gamestatue= 0;
    ou.id=0;
    ou.name = "new";
    ou.start=0;
    ou.alive = 1;
    return ou;
}
wss.on('connection', function (ws) {
    id_index ++;
    var us = new US(ws);
    arrusers.push(us);
    us.id = id_index;
    // wss.binaryType = 'blob';
    // wss.binaryType = 'arraybuffer';
    ws.on('message', function (message) {
        // var dataview = string2dataView(message);
        console.log( message );
        // getCommand(us,message);
    });
    // ÍË³öÁÄÌì
    ws.on('close', function(close) {
        try{

           var idx = arrusers.indexOf(us);
            arrusers.splice(idx,1);
           sendelse("11003",us.id,us.id);
        }catch(e){

        }
    });
});

function getCommand(us,message)
{
    var arrstr = message.split(":");
    var codenew = parseInt(arrstr[0])+1;
    switch (arrstr[0])
    {
        case "10000":
            us.name = arrstr[1];
            us.ws.send(codenew+":"+us.id+":"+us.name);
            break;
        case "10002":
            sendall(codenew,us.id+","+us.name+","+arrstr[1])
            break;
        case "10004":
            sendelse(codenew,us.id,us.id)
            break;
        case "10006":
            senUS("10003",arrstr[1],arrstr[2]);
            break;
        case "11001":
           us.ws.send(codenew+":"+arrstr[1]);
            break;
        case "10100":
            sendelse(codenew,us.id+";"+arrstr[1],us.id);
            break;
        case "10008":
            id_index++;
            sendall(codenew,us.id+","+id_index+","+arrstr[1]);
            break;
        case "10010":
            sendall(codenew,arrstr[1]);
            break;
    }
}

function  sendmsg(us,msg) {
    try{
       us.ws.send(code+":"+msg);
    }catch (e)
    {
        us.alive = 0;
    }

}

function senUS(code,uid,msg)
{
    for(var i = 0;i<arrusers.length;i++)
    {
        var us = arrusers[i];
        try{
            if(us.id == uid)
            {
                us.ws.send(code+":"+msg)
            }
        }catch (e)
        {}

    }
}
function sendall(code,msg)
{
    for(var i = 0;i<arrusers.length;i++)
    {
        var us = arrusers[i];
        try{
            us.ws.send(code+":"+msg)
        }catch (e)
        {}

    }
}
function sendelse(code,msg,iid)
{
    for(var i = 0;i<arrusers.length;i++)
    {
        var us = arrusers[i];
        try{
            if(us.id != iid)
            {
                us.ws.send(code+":"+msg)
            }

        }catch (e)
        {}

    }
}


function  arrayBuffer2String( byteArray )
{
    var str = "";
    var dataView = new DataView(byteArray);
    var length = byteArray.length/2;
    for( var i = 0; i < length; i++ )
    {
        var tmp = dataView.getUint8( i ).toString(16);
        if( tmp.length == 1 )
        {
            tmp = "0" + tmp;
        }
        str += tmp;
    }
    return str;
}
function  string2dataView( str )
{
    var length = str.length;
    var byteArray =  new ArrayBuffer( length / 2 ) ;
    var dataView = new DataView(byteArray);
    for( var i = 0; i < length; i += 2 )
    {
        dataView.setUint8( i / 2, parseInt( str.substr( i, 2 ), 16 ) );
    }
    console.log( dataView.getInt8());
    console.log( dataView.getInt8());
    console.log( dataView.getInt32());
    console.log( dataView.getInt16());
    console.log( dataView.toSource());

    return dataView;
}
function ff(byteArray)
{
    var length = byteArray.length;
    var dataView =  new DataView(byteArray);
    for( var i = 0; i < length; i += 2 )
    {
        dataView.setUint8( i / 2, parseInt( str.substr( i, 2 ), 16 ) );
    }

}
