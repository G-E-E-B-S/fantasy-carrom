import { AnimHelper } from "./AnimHelper";
import { PowerupTypes } from "./PowerupTypes";

const {ccclass, property} = cc._decorator;

@ccclass("PowerupNodeMap")
class PowerupNodeMap {
	@property({type: cc.Enum(PowerupTypes)})
	powerupType: PowerupTypes = PowerupTypes.FOG;

	@property(cc.Node)
	fxNode: cc.Node = null;
}

@ccclass
export default class PowerupEffect extends cc.Component {

	@property(cc.Animation)
	anim: cc.Animation = null;

	@property([PowerupNodeMap])
	powerupFX: Array<PowerupNodeMap> = [];

	init(cardType: PowerupTypes) {
		this.powerupFX.forEach((powerup) => {
			powerup.fxNode.active = powerup.powerupType == cardType;
		});
	}

	start() {
		AnimHelper.playClipOnce(this.anim, this.anim.defaultClip, this.node);
	}

	stopAnim() {
		this.anim.stop();
	}
}
