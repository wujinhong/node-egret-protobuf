module texas
{
	export class EnterGameHandler implements IHandler
	{
		public execute( pkg:Package )
		{
			var bytes = pkg.getProtoBuf();
			var Builder = ProtoBufMgr.getInstance().getBuilder( "TableInfo" );
			var msg = Builder.decode( bytes[ "data" ].buffer );
			
			var players = msg.playerInfoSet.playerInfoList;
			var roomID:number = msg.tableId;

		}
	}
}