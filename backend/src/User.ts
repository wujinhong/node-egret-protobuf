import WebSocket = require("ws");

export class User
{
    ws:WebSocket;
    game_status:number= 0;
    id:number = 0;
    name:string = "new";
    start:number = 0;
    alive:number = 1;
    constructor(ws:WebSocket)
    {
        this.ws = ws;
    }
}