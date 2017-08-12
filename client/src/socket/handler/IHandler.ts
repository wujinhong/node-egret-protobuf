module texas
{
	export interface IHandler
	{
		execute( pkg:Package ): void;
	}
}