import CoinScript from "./CoinScript";

const {ccclass, property} = cc._decorator;

const EXPLOSIVE_ELASTICITY = 2;

@ccclass
export default class WallScript extends cc.Component {

	@property(cc.PhysicsBoxCollider)
	collider: cc.PhysicsCollider = null;

	start() {
		this.isSticky = false;
		this.orgElasticity = this.collider.restitution;
	}

	set sticky(value: boolean) {
		this.isSticky = value;
	}

	set jumpy(value: boolean) {
		this.isJumpy = value;
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (selfCollider != this.collider) {
			console.error("Unknown Collision");
			return;
		}

		let coin = otherCollider.getComponent(CoinScript);
		if (this.isSticky && coin) {
			coin.unmovable = true;
			coin.unmovable = false;
		} else if (this.isJumpy && coin) {
			coin.setVelocity(EXPLOSIVE_ELASTICITY);
		}
	}

	private orgElasticity: number;
	private isSticky: boolean;
	private isJumpy: boolean;
}
