module texas
{
	export class ProtoBufMgr
	{
		private static instance:ProtoBufMgr;
		private protoArray:Array<any> = [];

		public constructor()
		{

		}

		public static getInstance():ProtoBufMgr
		{
			if( !ProtoBufMgr.instance ) ProtoBufMgr.instance = new ProtoBufMgr();
			return ProtoBufMgr.instance;
		}

		public init()
		{
			this.pushProtoData( "PlayerInfoSet", [ "PlayerInfoSet", "PlayerInfo" ] );
			this.pushProtoData( "TableInfo", [ "TableInfo" ] );
			this.pushProtoData( "TableGroupInfoSet", [ "TableGroupInfoSet" ] );
			this.pushProtoData( "PlayerOp", [ "PlayerOp" ] );
			this.pushProtoData( "PlayerTurn", [ "PlayerTurn" ] );
			this.pushProtoData( "SubPool", [ "SubPool" ] );
			this.pushProtoData( "Sitdown", [ "Sitdown" ] );
			this.pushProtoData( "GameResult", [ "GameResult" ] );
			this.pushProtoData( "ShowCardSet", [ "ShowCardSet" ] );
			this.pushProtoData( "PlayerTaskSet", [ "PlayerTaskSet" ] );
			this.pushProtoData( "LoginRewardSet", [ "LoginRewardSet" ] );
			this.pushProtoData( "TableWinRecord", [ "TableWinRecord" ] );
			this.pushProtoData( "PlayerBaseInfo", [ "PlayerBaseInfo" ] );
			this.pushProtoData( "GameSettlement", [ "GameSettlement" ] );
            this.pushProtoData( "GameSngBackInfo", [ "GameSngBackInfo", "SngPlayer" ] );
		}

		/**
		 * [pushProtoData description]
		 * 添加proto文件
		 * @param {string}        name     [description]
		 * @param {Array<string>} builders [description]
		 */
		public pushProtoData( name:string, builders:Array<string> )
		{
			var proto:any = protobuf.load( RES.getRes( name ) );
			if( !proto ) console.log( "proto null" + name );
			for( var i = 0; i < builders.length; i++ )
			{
				var buildName:string = builders[ i ];
				var build = proto.build( buildName );
				if( null == build )
				{
					console.log( "proto build null" + buildName );
					continue;
				}
				this.protoArray.push( { name: buildName, data: build } );
			}
		}

		public getBuilder( name:String ):any
		{
			for( var i = 0; i < this.protoArray.length; i++ )
			{
				if( this.protoArray[ i ].name === name )
					return this.protoArray[ i ].data;
			}
			return null;
		}
	}
}