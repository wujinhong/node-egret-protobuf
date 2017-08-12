module texas
{
	export class HandleMgr
	{
		private static handlers:Array<IHandler> = new Array();

		public static init():void
		{
			HandleMgr.addHandler( CmdType.ENTER_GAME, new EnterGameHandler() );
			HandleMgr.addHandler( CmdType.LOGIN, new LoginHandler() );
			HandleMgr.addHandler( CmdType.LOGIN, new LoginHandler() );
		}

		public static addHandler( cmdType:number, handler:IHandler ):void
		{
			HandleMgr.handlers[ cmdType ] = handler;
		}

		public static getHandler( cmdType:number ):IHandler
		{
			var handler:IHandler = HandleMgr.handlers[ cmdType ];
			if( handler == null )
				console.log( "cmd is null" + cmdType );
			return handler;
		}
	}
}