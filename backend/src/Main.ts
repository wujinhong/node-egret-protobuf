import WebSocket = require("ws");
import { Server } from "ws";
import { User } from "./User";
class Main
{
    public id_index:number = 0;
    public userList:Array<User> = [];
    public constructor()
    {
        var server = new Server({ port: 8181 });
        server.on('connection', (client: WebSocket)=>{
            this.id_index++;
            var user = new User(client);
            this.userList.push(user);
            user.id = this.id_index;
            client.on('message', (message)=>{
                // var dataview = string2dataView(message);
                console.log( message );
                // getCommand(us,message);
            });
            // 退出聊天
            client.on('close', (close)=>{
                try{
                    var idx = this.userList.indexOf(user);
                    this.userList.splice(idx,1);
                    this.sendOther( "11003", user.id );
                }catch(e){
                }
            });
        })
    }

    /**
     * 发送给其它人
     * @param {string} msg
     * @param {number} id
     */
    public sendOther( msg:string, userId:number ):void
    {
        for( var i = 0; i < this.userList.length; i++ )
        {
            var user = this.userList[ i ];
            try
            {
                if( user.id != userId )
                {
                    user.ws.send("消息内容:" + msg )
                }
            } catch( e )
            {
            }
        }
    }

    public send( user:User, msg:string ):void
    {
        try
        {
            user.ws.send("消息内容:" + msg );
        } catch( e )
        {
            user.alive = 0;
        }
    }
}

var main:Main = new Main();
console.log( main.id_index + 123 );