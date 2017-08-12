/**
 * Created by Administrator on 2016/1/29.
 */
class Util
{
    /**去除文本开头与结尾空格*/
    public static trim( str:string ):string
    {
        while( "\n" == str[ 0 ] )
        {
            str = str.slice( 1 );
        }
        return str;
    }

    public static copy( obj:any ):Object
    {
        var o = {};
        for( var key in obj )
        {
            o[ key ] = obj[ key ];
        }
        return o;
    }

    public static arrayBuffer2String( byteArray:egret.ByteArray ):string
    {
        var str = "";
        var dataView = byteArray["dataView"];
        var length:number = byteArray.length;
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
    public static string2ArrayBuffer( str:string ):egret.ByteArray
    {
        var length:number = str.length;
        var byteArray:egret.ByteArray = new egret.ByteArray( new ArrayBuffer( length / 2 ) );
        var dataView = byteArray["dataView"];
        for( var i:number = 0; i < length; i += 2 )
        {
            dataView.setUint8( i / 2, parseInt( str.substr( i, 2 ), 16 ) );
        }
        return byteArray;
    }
    /**
     * 根据玩家的下注额获得指定的筹码资源
     * @param gold
     * @returns {string}
     */
    public static getPlayerChipSrcByGold( gold ):string
    {
        if( gold >= 10000000 )
        {
            return "chip3";
        }
        else if( gold >= 1000000 )
        {
            return "chip4";
        }
        else if( gold >= 10000 )
        {
            return "chip5";
        }
        else if( gold >= 1000 )
        {
            return "chip2";
        }
        else
        {
            return "chip1";
        }
    }

    /**
     * 名字有 , (逗号)时，对名字特殊处理
     */
    public static split( str:string ):Array<string>
    {
        var p:Array<string> = str.split( "," );
        var length:number = p.length;
        var NameLength:number = p.length - 2;
        if( NameLength > 1 )
        {
            var name:string = "";
            var index:number = 0;
            while( index < NameLength )
            {
                name += str[ index ];
            }
            p = [ name, p[ length -2 ], p[ length - 1 ] ];
            return p;
        }
        return p;
    }
    public static obj2Str( obj:Object ):string
    {
        var tmp_search:string = '';
        for(var o in obj)
        {
            tmp_search += o + '=' + encodeURIComponent(obj[o])+'&';
        }
        tmp_search = tmp_search.substr( 0, tmp_search.length - 1 );
        return tmp_search;
    }
}
