module texas
{
	export class SocketClient
	{
		/**webSocket 连接器*/
		private socketConnector:SocketConnector;

		public connect( ip:string, port:number, path:string, callfun:any, objectThis:any )
		{
			this.socketConnector = new SocketConnector( this, port, ip, path );
			this.socketConnector.connect( callfun, objectThis );

			// CmdString.init();
		}

		public reConnect( callfun:any, objectThis:any )
		{
            // LoadStartUI.instance.removeLoadUI();
            // AppContainer.getInstance().gameData.leaveGame();
			this.socketConnector.connect( callfun, objectThis );
		}

		public handlePkg( pkg:Package )
		{
			var type:number = pkg.getCmdType();
            /*if( CmdString.CmdType[ type ] )
            {
                console.log( "cmdType:" + type + ";" + CmdString.CmdType[ type ] );
            }*/
			var handler:IHandler = HandleMgr.getHandler( type );
			if( handler )
				handler.execute( pkg );
			else
				console.log( "cmd handler is null 主协议ID:" + type );
		}

		public sendPkg( pkg:Package ):void
		{
            var type:number = pkg.getCmdType();
            /*if( CmdString.CmdType[ type ] )
            {
                console.log( "发送：cmdType:" + type + ";" + CmdString.CmdType[ type ] );
            }*/
			this.socketConnector.sendData( pkg.toByteArray() );
		}
	}
}