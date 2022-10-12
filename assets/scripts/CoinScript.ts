import BoardPiece from "./BoardPiece";

const {ccclass, property} = cc._decorator

const IMMOVABLE = 10000;
const MOVABLE = 0.5;
const SLIPPY = 0.1;

@ccclass
export default class CoinScript extends BoardPiece {

	@property
	score: number = 10;

	@property
	isQueen: boolean = false;

	start() {
		this.orgDamping = MOVABLE;
	}

	getScore() {
		return this.score;
	}

	resetPosition() {
		this.node.x = 0;
		this.node.y = 0;
	}

	set unmovable(flag: boolean) {
		this.rigidBody.linearVelocity = cc.Vec2.ZERO;
		this.rigidBody.linearDamping = flag ? IMMOVABLE :  this.orgDamping;
	}

	set slippy(flag: boolean) {
		this.rigidBody.linearVelocity = cc.Vec2.ZERO;
		this.rigidBody.linearDamping = flag ? SLIPPY : this.orgDamping;
	}

	setVelocity(mul: number = 1) {
		const vel = this.rigidBody.linearVelocity.mag();
		this.rigidBody.linearVelocity.normalizeSelf();
		this.rigidBody.linearVelocity.mulSelf(vel * mul);
	}

	disablePhysics() {
		this.rigidBody.linearVelocity = cc.Vec2.ZERO;
		setTimeout(() => {
			this.rigidBody.enabled = false;
			this.collider.enabled = false;
		}, 10);
	}

	private orgDamping: number;
}
