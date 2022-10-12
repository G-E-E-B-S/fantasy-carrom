import { AnimHelper } from "./AnimHelper";

const {ccclass, property} = cc._decorator;

@ccclass
export default class CardCutscene extends cc.Component {

	@property(cc.Animation)
	animation: cc.Animation = null;

	@property([cc.Sprite])
	effectParticles: Array<cc.Sprite> = [];

	init(card: cc.Node, particle: cc.SpriteFrame) {
		this.node.addChild(card);

		this.effectParticles.forEach((effectParticle) => {
			effectParticle.spriteFrame = particle;
		});
	}

	start() {
		AnimHelper.playClipOnce(this.animation, this.animation.defaultClip, this.node, () => {
			this.node.destroy();
		});
	}
}
