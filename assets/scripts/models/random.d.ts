declare interface Engine {
	(): RandomFunc;
}

declare interface RandomInt {
	(engine: RandomFunc): number
}

export declare interface RandomFunc {
	seed(seed: number): RandomFunc;

	autoSeed(): RandomFunc;

	getUseCount(): number;

	discard(count: number): void;

	getSeed(): number;
}

declare interface EngineList {
	[index: string]: Engine
}

export declare class Random {
	static engines: EngineList;

	static shuffle(func: RandomFunc, array: Array<any>, downTo?: number): Array<any>;

	static integer(min: number, max: number): RandomInt;

	static pick(engine: any, arr: Array<T>, begin?: number, end?: number): T;

	static int32(engine: any): number;

	static uuid4(func: RandomFunc): string;
}

// export = Random;
