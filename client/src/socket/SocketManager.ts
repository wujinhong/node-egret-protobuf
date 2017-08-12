import SocketClient = texas.SocketClient;
import Package = texas.Package;
import CmdType = texas.CmdType;
class SocketManager {
	protected ip:string = "127.0.0.1";
	protected port:number = 8181;
	protected sc:SocketClient = new SocketClient();
	public constructor() {
	}
	public startConnet():void
	{
		this.sc.connect(this.ip,this.port,"",this.onConnect, this);
	}
	protected  onConnect():void
	{
		this.sendMsg("mm");
	}
	public sendMsg(msg:string):void
	{
		var pkg:Package =  Package.createPkg(CmdType.BET_DICE);
		pkg.putString(msg);
		this.sc.sendPkg(pkg);
	}
}