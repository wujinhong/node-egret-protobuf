declare module dcodeIO
{
    class ProtoBuf
    {
        static loadProto( protoContents:string, build:any );

        static loadProto( protoContents:string, build:any, path:string );
    }

    class Long
    {
        toNumber();
        static fromNumber( value );
        equals( other ):any;
    }
}