import BoardPiece from "./BoardPiece";
import { EventHelper } from "./EventHelper";
import { Events } from "./Events";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ArrowScript extends BoardPiece {

	init(angle: number, velocity: cc.Vec2, bumpCount: number = 0) {
		this.node.angle = angle;
		this.rigidBody.linearVelocity = velocity;
		this.firstTimeCollision = false;
		this.objectFired = false;
		this._bumpCount = bumpCount;

		setTimeout(() => {
			this.objectFired = true;
		}, 2000);
	}

	onEndContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
		if (selfCollider != this.collider) {
			console.error("Unknown Collision");
			return;
		}

		if (otherCollider.tag == 98) {
			if (!this.firstTimeCollision) {
				this.firstTimeCollision = true;
				return;
			}
			this.reflectObject(otherCollider);
		} else if (otherCollider.tag == 99) {
			this.reflectObject(otherCollider);
		} else {
			EventHelper.dispatchEvent(Events.PROJECTILE_DESTROYED, cc.game, this.bumpCount);
			this.destroySelf();
			return;
		}
	}

	stopObject(): void {
		EventHelper.dispatchEvent(Events.PROJECTILE_STOPPED, cc.game);
		super.stopObject();
	}

	get bumpCount(): number {
		return this._bumpCount;
	}

	private reflectObject(otherCollider: cc.PhysicsCollider) {
		let currVec = this.rigidBody.linearVelocity;
		this.rigidBody.linearVelocity = cc.Vec2.ZERO;

		let normVec = otherCollider.node.getPosition().negSelf().normalizeSelf();
		normVec = cc.v2(Math.round(normVec.x), Math.round(normVec.y));

		let angle = -this.node.angle;
		let scaleMod = normVec.x == 0 ? -1 : 1;

		const node = cc.instantiate(this.node);
		node.scaleX = this.node.scaleX;
		node.scaleY = this.node.scaleY * scaleMod;

		const projectile = node.getComponent(ArrowScript);
		projectile.init(angle, currVec, this.bumpCount+1);

		EventHelper.dispatchEvent(Events.PROJECTILE_CHANGED, cc.game, projectile);

		node.setParent(this.node.parent);
		this.node.destroy();
	}

	private destroySelf() {
		if (!cc.isValid(this.node)) return;

		this.node.destroy();
	}

	private firstTimeCollision: boolean;
	private objectFired: boolean;
	private _bumpCount: number;
}
