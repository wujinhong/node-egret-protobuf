/**
 *数据包处理
 demon
 */
module texas
{
	export class Package
	{
		private byteArray:egret.ByteArray;
		private isEncrypt:boolean;
		private cmdType:number;
		private encryptForm:number;
		private errorCode:number;

		public constructor()
		{
			this.byteArray = new egret.ByteArray();
		}

		public readPkg( byteArray:egret.ByteArray )
		{
			this.byteArray = byteArray;
			this.isEncrypt = byteArray.readBoolean();
			this.encryptForm = byteArray.readByte();
			this.cmdType = byteArray.readShort();
			// this.errorCode = byteArray.readByte();
		}

		public getCmdType():number
		{
			return this.cmdType;
		}

		public getProtoBuf():egret.ByteArray
		{
			var s = this.getShort();
			var arrays = new egret.ByteArray();
			this.byteArray.readBytes( arrays, 0, s );
			return arrays;
		}

		public getInt():number
		{
			return this.byteArray.readInt();
		}

		public getShort():number
		{
			return this.byteArray.readShort();
		}

		public getBoolean():boolean
		{
			return this.byteArray.readBoolean();
		}

		private getByte():number
		{
			return this.byteArray.readByte();
		}

		public getLong():protobuf.Long
		{
			var one = this.getByte();
			var two = this.getByte();
			var tree = this.getByte();
			var four = this.getByte();
			var five = this.getByte();
			var six = this.getByte();
			var seven = this.getByte();
			var eight = this.getByte();
			//java数据 BIG-ENDIAN
			var l:number = ((one & 0xff) << 56) |
				((two & 0xff) << 48) |
				((tree & 0xff) << 40) |
				((four & 0xff) << 32) |
				((five & 0xff) << 24) |
				((six & 0xff) << 16) |
				((seven & 0xff) << 8) |
				(eight & 0xff);
			return protobuf.util.LongBits.fromNumber( l ).toLong();
		}

		public getString():string
		{
			var short:number = this.getShort();
			return this.byteArray.readUTFBytes( short );
		}

		public putInt( int:number )
		{
			this.byteArray.writeInt( int );
		}

		public putDouble( int:number )
		{
			this.byteArray.writeDouble( int );
		}

        public putLong(long: protobuf.Long)
        {
            if( long[ "LITTLE_ENDIAN" ] )//todo: 还未判断 long是大小端
            {
                this.byteArray.writeUnsignedInt( long[ "high" ] );
                this.byteArray.writeUnsignedInt( long[ "low" ] );
            }
            else
            {
                this.byteArray.writeUnsignedInt( long[ "low" ] );
                this.byteArray.writeUnsignedInt( long[ "high" ] );
            }
        }

		public putShort( s:number )
		{
			this.byteArray.writeShort( s );
		}

		public putBoolean( b:boolean )
		{
			this.byteArray.writeBoolean( b );
		}

		public putString( s:string )
		{
			this.byteArray.writeUTF( s );
		}

		public putBytes( data )
		{
			this.putShort( data.byteLength );
			this.byteArray.writeBytes( data, 0, data.byteLength );
		}

		public toByteArray():egret.ByteArray
		{
			return this.byteArray;
		}

		public putByte( b:number )
		{
			this.byteArray.writeByte( b );
		}

		public static createPkg( cmdType:number ):Package
		{
			var pkg:Package = new Package();

			pkg.putByte( 0 );
			pkg.putByte( 0 );
			pkg.putInt( 0 );//自增ID保留4个byte
			pkg.putShort( cmdType );
			pkg.cmdType = cmdType;
			return pkg;
		}
	}
}