module texas
{
    export class LoginHandler implements IHandler
    {
        /**是否已经登录过，sockect重连*/
        public static sockectReconnect:boolean = false;
        public execute( pkg:Package )
        {

        }
    }
}