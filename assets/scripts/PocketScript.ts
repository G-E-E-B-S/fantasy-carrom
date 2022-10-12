import CoinScript from "./CoinScript";
import { EventHelper } from "./EventHelper";
import { Events } from "./Events";

const {ccclass, property} = cc._decorator;

@ccclass
export default class PocketScript extends cc.Component {

	@property(cc.PhysicsCollider)
	collider: cc.PhysicsCollider = null;

	@property(cc.Node)
	shieldNode: cc.Node = null;

	start(): void {
		this.allowPocketing = true;
	}

	onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (selfCollider != this.collider) {
			console.error("Unknown Collision");
			return;
		}

		if (!this._allowPocketing || !cc.isValid(otherCollider.node)) return;

		let coin = otherCollider.getComponent(CoinScript);
		if (coin) {
			coin.disablePhysics();
			otherCollider.node.removeFromParent(false);
			EventHelper.dispatchEvent(Events.COIN_POCKETED, cc.game, coin);
		}
	}

	set allowPocketing(val: boolean) {
		this._allowPocketing = val;
		this.shieldNode.active = !val;
	}

	private _allowPocketing: boolean;
}
