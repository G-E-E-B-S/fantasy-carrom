const {ccclass, property} = cc._decorator;

const MIN_VELOCITY = 10;

@ccclass
export default class BoardPiece extends cc.Component {

	@property(cc.RigidBody)
	rigidBody: cc.RigidBody = null;

	@property(cc.PhysicsCollider)
	collider: cc.PhysicsCollider = null;

	hasStopped(): boolean {
		return this.rigidBody.linearVelocity.mag() <= 0;
	}

	update(dt) {
		if (this.rigidBody.linearVelocity.mag() > MIN_VELOCITY)
			return;

		this.stopObject();
	}

	stopObject() {
		this.rigidBody.linearVelocity = cc.Vec2.ZERO;
	}
}
