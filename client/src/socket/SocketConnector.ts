/**
 * @demon
 * websocket
 */
module texas
{
    export class SocketConnector
    {
        public static KickOut:boolean = false;
        private socket:egret.WebSocket;
        private client:SocketClient;
        private port:number;//端口
        private ip:string;//ip
        private path:string;//后缀路径
        private openCallBack:any;
        private callBackThis;

        /**
         * 数据包自增ID
         */
        private INC_ID:number = 0;

        public constructor( client:SocketClient, port:number, ip:string, path:string )
        {
            this.client = client;
            this.port = port;
            this.ip = ip;
            this.path = path;
        }

        private timeStamp:number = 0;

        public sendData( data:egret.ByteArray ):void
        {
            if( !this.socket.connected )
            {
                console.log( "socket已经断开" );
                var timeStamp:number = Date.now();
                if( timeStamp - this.timeStamp > 5000 )
                {
                    this.timeStamp = timeStamp;
                    if( SocketConnector.KickOut )
                    {
                        // DropDownPanel.instance.setText( "您的帐号在另一地点登录，你被下线了。如果这不是您本人的操作，那么您的密码可能已经泄露，建议您修改密码。" );
                        return;
                    }
                    egret.setTimeout( this.onTimeOut, this, 15000 );
                    // DropDownPanel.instance.setText( "断网了，自动重连中…" );
                    // AppContainer.getInstance().reConnect();
                }
                return;
            }

            data.dataView.setInt32( 2, this.INC_ID++ );
            // var bufstr:string = Util.arrayBuffer2String( data );
            // this.socket.writeUTF(bufstr  );
            this.socket.writeBytes( data, 0, data.bytesAvailable );
        }

        /**
         * 连接websocket
         */
        public connect( openCallBack:any, callBackThis:any ):void
        {
            if( null == window[ "WebSocket" ] )
            {
                // Statistics.noWebSocket();
                // DropDownPanel.instance.setText( "当前浏览器版本过低，建议使用qq浏览器或uc浏览器打开网址 kdzy818.com" );
                return;
            }
            var portStr:any = this.port + this.path;  //端口号加后缀路径
            this.socket = new egret.WebSocket();
            // this.socket.type = egret.WebSocket.TYPE_STRING;
            this.socket.type = egret.WebSocket.TYPE_BINARY;
            this.socket.addEventListener( egret.ProgressEvent.SOCKET_DATA, this.onReceiveMessage, this );
            this.socket.addEventListener( egret.Event.CONNECT, this.onSocketOpen, this );
            this.socket.addEventListener( egret.IOErrorEvent.IO_ERROR, this.onSocketError, this );
            this.socket.addEventListener( egret.Event.CLOSE, this.onSocketClose, this );
            this.openCallBack = openCallBack;
            this.callBackThis = callBackThis;
            this.socket.connect( this.ip, portStr );

            this.timeStamp = Date.now();
        }
        private sendData2():void
        {//发送protobuf二进制流
            var proto: string = RES.getRes("common_proto");               //加载PB数据结果定义字符
            var builder:any = protobuf.load( proto);          //解析PB数据定义文件，生成PB对象构造器 (loadProtoFile用这个可以代替RES的功能，自己选）
            var clazz:any = builder.build("Common");                      //构建一个PB数据结构（messageName为PB中定义的结果名）
            var data:any = new clazz();
            //创建一个数据结构
            //data.set("id",1);//可以使用data.id=1;
            data.id=1;//赋值
            data.set("text","oops");//可以使用data.text=oops;

            console.log("id=" + data.get("id"));
            console.log("oops=" + data.get("text"));

            var arraybuffer: ArrayBuffer = data.toArrayBuffer();
            var len: number = arraybuffer.byteLength;
            var btyearray:egret.ByteArray=new egret.ByteArray(arraybuffer);
            if(len > 0)
            {
                this.socket.writeBytes(btyearray);
                this.socket.flush();
            }
        }

        public onReceiveMessage( e:egret.Event ):void
        {
            var pkg:Package = new Package();
            pkg.readPkg( Util.string2ArrayBuffer( e.target.readUTF() ) );
            this.client.handlePkg( pkg );
        }

        private onSocketOpen():void
        {
            console.log( "socket open" );
            this.openCallBack.call( this.callBackThis, [] );
        }

        public onSocketError( e:egret.Event ):void
        {
            //egret.setTimeout( this.onTimeOut, this, 5000 );
            console.log( "socket error:" + e.type );
            // Statistics.leave();
        }

        public onSocketClose( e:egret.Event ):void
        {
            /*if( Param.getUrlDataByName( "isNew" ) == "1" )
            {
                Statistics.first_game();
            }*/
            //egret.setTimeout( this.onTimeOut, this, 5000 );
            console.log( "socket close" );
            // Statistics.leave();
        }

        private onTimeOut():void
        {
            if( !this.socket.connected )
            {
                egret.setTimeout( this.onTimeOut2, this, 15000 );
            }
        }
        private onTimeOut2():void
        {
            if( !this.socket.connected )
            {
                // DropDownPanel.instance.setText( "网络连不上，请换个网络再刷新试试" );
            }
        }
    }
}
