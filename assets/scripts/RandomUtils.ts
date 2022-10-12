import { Random, RandomFunc } from "./models/random";
import Set from "./models/Set";

/**
 * This class can be optimized to handle Template.
 * Currently it supports only integer.
 */
export class RandomUtils {
	static TAG: string = "RandomUtils";

	/**
	 * Helper function to generate Random number
	 * @param lowerLimit INCLUSIVE
	 * @param upperLimit INCLUSIVE
	 * @param ignoreList Contains list of number which has to be ignored.
	 *
	 * Returns -1 otherwise
	 */
	static getRandom(lowerLimit: number, upperLimit: number, ignoreList?: Set<number>): number {
		if (ignoreList == null) {
			let random = Math.random() * ((upperLimit + 1) - lowerLimit);
			return Math.floor(lowerLimit + random);
		} else {
			let newRange = new Set<number>();

			for (let i = lowerLimit; i < (upperLimit + 1); i++) {
				if (!ignoreList.contains(i)) {
					newRange.add(i);
				}
			}

			if (newRange.size() > 0) {
				var random = Math.random() * (((upperLimit + 1) - ignoreList.size()) - lowerLimit);
				return newRange.toArray()[((Math.floor(lowerLimit + random)) - 1)];
			} else {
				return -1;
			}
		}
	}

	static getRandomFloat(lowerLimit: number, upperLimit: number): number {
		return lowerLimit + Math.random() * ((upperLimit + 1) - lowerLimit);
	}

	static setSeed(engine: RandomFunc): RandomFunc {
		let max_int = 1 << 32 - 1;
		let seed = Date.now() % max_int;
		console.log(RandomUtils.TAG + " - Will set seed: ", seed);

		return engine.seed(seed);
	}

	static isHeads(chance = 0.5, engine?: RandomFunc): boolean {
		if (!engine) {
			engine = localEngine;
		}
		const chanceInt = Math.round(chance * HeadsChanceFactor);
		return Random.integer(1, HeadsChanceFactor)(engine) <= chanceInt;
	}

	static getRandomInt(min: number, max: number, engine?: RandomFunc): number {
		if (!engine) {
			engine = localEngine;
		}
		return Random.integer(min, max)(engine)
	}

	static getRandomElement(array: Array<any>, engine?: RandomFunc): any {
		if (!array || array.length == 0) {
			return null;
		}
		return array[RandomUtils.getRandomInt(0, array.length - 1, engine)];
	}

	static popRandomElement(array: Array<any>, engine?: RandomFunc): any {
		if (!array || array.length == 0) {
			return null;
		}
		const randIdx = RandomUtils.getRandomInt(0, array.length - 1, engine);
		const element = array[randIdx];
		array.splice(randIdx, 1);
		return element;
	}
}

const localEngine: RandomFunc = RandomUtils.setSeed(Random.engines["mt19937"]());
const HeadsChanceFactor = 1000;
