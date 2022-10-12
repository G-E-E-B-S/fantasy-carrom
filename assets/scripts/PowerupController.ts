import CardCutscene from "./CardCutscene";
import CardScript from "./CardScript";
import { EventHelper } from "./EventHelper";
import { Events } from "./Events";
import Dictionary from "./models/Dictionary";
import PowerupEffect from "./PowerupEffect";
import { PowerupTypes } from "./PowerupTypes";
import { RandomUtils } from "./RandomUtils";

const {ccclass, property} = cc._decorator;

@ccclass("PowerupStats")
export class PowerupStats {
	@property({type: cc.Enum(PowerupTypes)})
	powerupType: PowerupTypes = PowerupTypes.FOG;

	@property(cc.Color)
	powerupColor: cc.Color = cc.color(255, 255, 255, 255);

	@property(cc.SpriteFrame)
	powerupHeroSprite: cc.SpriteFrame = null;

	@property(cc.SpriteFrame)
	powerupEffectSprite: cc.SpriteFrame = null;

	@property({type: cc.String})
	powerupName: string = "";

	@property({type: cc.String, multiline: true})
	powerupDesc: string = "";
}

@ccclass
export default class PowerupController extends cc.Component {

	@property([PowerupStats])
	powerups: Array<PowerupStats> = [];

	@property(cc.Prefab)
	cardPrefab: cc.Prefab = null;

	@property(cc.Prefab)
	cardCutscenePrefab: cc.Prefab = null;

	@property(cc.Prefab)
	effectsPrefab: cc.Prefab = null;

	@property(cc.Node)
	cutsceneNode: cc.Node = null;

	@property(cc.Node)
	tempCardParent: cc.Node = null;

	@property(cc.Node)
	cardDestination: cc.Node = null;

	static getInstance() {
		return PowerupController._instance;
	}

	start() {
		PowerupController._instance = this;
	}

	getNewCard() {
		const cardType = RandomUtils.popRandomElement(this.powerupPool);
		const cardInfo = this.fetchInfo(cardType);
		return this.createCard(cardInfo);
	}

	usePowerup(cardType: PowerupTypes) {
		this.showCutscene(cardType);
		this.powerupPool.push(cardType);
	}

	showEffect(cardType: PowerupTypes) {
		let node = cc.instantiate(this.effectsPrefab);
		let effect = node.getComponent(PowerupEffect);

		effect.init(cardType);

		this.cutsceneNode.addChild(node);
		this.activeEffects.setValue(cardType, effect);
	}

	hideEffect(cardType: PowerupTypes) {
		if (!this.activeEffects.containsKey(cardType)) return;

		const effect = this.activeEffects.getValue(cardType);
		effect.stopAnim();
		effect.node.destroy();

		this.activeEffects.remove(cardType);
	}

	disableCurrentCard() {
		EventHelper.dispatchEvent(Events.POWERUP_DISABLE, this.cardDestination);
	}

	private createCard(cardInfo: PowerupStats): cc.Node {
		let node = cc.instantiate(this.cardPrefab);
		let card = node.getComponent(CardScript);

		card.init(cardInfo, this.tempCardParent, this.cardDestination);

		return node;
	}

	private fetchInfo(cardType: PowerupTypes): PowerupStats {
		for (let powerup of this.powerups) {
			if (cardType == powerup.powerupType)
				return powerup;
		}
		return null;
	}

	private showCutscene(cardType: PowerupTypes) {
		let node = cc.instantiate(this.cardCutscenePrefab);
		let card = node.getComponent(CardCutscene);
		let cardData = this.fetchInfo(cardType);

		card.init(this.createCard(cardData), cardData.powerupEffectSprite);

		this.cutsceneNode.addChild(node);
	}

	private static _instance: PowerupController;
	private powerupPool = Object.values(PowerupTypes);
	private activeEffects: Dictionary<PowerupTypes, PowerupEffect> = new Dictionary();
}
