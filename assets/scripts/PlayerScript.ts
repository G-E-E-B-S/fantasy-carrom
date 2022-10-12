import ArrowScript from "./ArrowScript";
import CoinScript from "./CoinScript";
import { EventHelper } from "./EventHelper";
import { Events } from "./Events";

const {ccclass, property} = cc._decorator;

const MIN_DRAG = cc.winSize.width * 0.05;
const MAG_CAP = 100;
const HIT_MOD = 3;

@ccclass
export default class PlayerScript extends cc.Component {

	@property(cc.Label)
	playerScore: cc.Label = null;

	@property(cc.Node)
	playerKills: cc.Node = null;

	@property(cc.Node)
	playerWall: cc.Node = null;

	@property(cc.Vec2)
	playerMovementBounds: cc.Vec2 = cc.v2(-270, 270);

	@property(cc.Prefab)
	arrowPrefab: cc.Prefab = null;

	@property
	arrowForceModifier: number = 15;

	@property(cc.Layout)
	aimReticle: cc.Layout = null;

	@property(cc.Vec2)
	aimSpacingBounds: cc.Vec2 = cc.v2(1, 10);

	@property(cc.Vec2)
	aimScalingBounds: cc.Vec2 = cc.v2(1, 3);

	@property(cc.Vec2)
	aimAngleBounds: cc.Vec2 = cc.v2(-70, 70);

	constructor() {
		super();
		this._interactionAllowed = false;
		this.movementAllowed = true;
		this.bumpHit = 0;
		this.score = 0;
	}

	start() {
		this.playerWall.on(cc.Node.EventType.TOUCH_START, this.movePlayer, this);
		this.node.on(cc.Node.EventType.TOUCH_START, this.nockArrow, this);
		this.node.on(cc.Node.EventType.TOUCH_MOVE, this.takeAim, this);
		this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.fire, this);
		this.node.on(cc.Node.EventType.TOUCH_END, this.fire, this);
		cc.game.on(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
	}

	onDestroy() {
		this.playerWall.off(cc.Node.EventType.TOUCH_START, this.movePlayer, this);
		this.node.off(cc.Node.EventType.TOUCH_START, this.nockArrow, this);
		this.node.off(cc.Node.EventType.TOUCH_MOVE, this.takeAim, this);
		this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.fire, this);
		this.node.off(cc.Node.EventType.TOUCH_END, this.fire, this);
		cc.game.off(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
	}

	set interactionAllowed(value: boolean) {
		this._interactionAllowed = value;
	}

	set projectileListenerActive(value: boolean) {
		if (value) {
			cc.game.on(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
		} else {
			cc.game.off(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
		}
	}

	destroyProjectile() {
		this.projectile?.node?.destroy();
	}

	getScore(): number {
		return this.score;
	}

	movePlayer(event: cc.Event.EventTouch) {
		if (!this._interactionAllowed || !this.movementAllowed) return;

		this.movementAllowed = false;
		const touchPos = this.playerWall.convertToNodeSpaceAR(event.touch.getLocation()).clampf(cc.v2(this.playerMovementBounds.x, 0), cc.v2(this.playerMovementBounds.y, 0));
		cc.tween(this.node)
		  .to(0.25, {x: touchPos.x}, {easing: cc.easing.quartInOut})
		  .call(() => {
		  	this.movementAllowed = true;
		  }).start();
	}

	calcScore(coin: CoinScript) {
		this.score += coin.getScore() + (HIT_MOD + this.bumpHit);
		this.playerScore.string = this.score.toString();

		setTimeout(() => {
			coin.node.angle = 180;
			this.playerKills.addChild(coin.node);
			coin.resetPosition();
		}, 20);
	}

	private nockArrow(event: cc.Event.EventTouch) {
		if (!this._interactionAllowed) return;

		this.lastTouchPos = event.touch.getLocation();
		this.aimReticle.node.active = false;
	}

	private takeAim(event: cc.Event.EventTouch) {
		if (!this._interactionAllowed) return;

		const touchPos: cc.Vec2 = event.touch.getLocation();
		const mag = touchPos.subtract(this.lastTouchPos).mag();
		const angle = cc.misc.radiansToDegrees(cc.Vec2.UP.negate().signAngle(touchPos));

		if (mag < MIN_DRAG || touchPos.y > 0) {
			this.aimReticle.node.active = false;
			this.node.angle = 0;
			return;
		} else {
			this.aimReticle.node.active = true;
			this.adjustReticle(mag, angle);
		}
	}

	private fire(event: cc.Event.EventTouch) {
		if (!this._interactionAllowed) return;

		const touchPos: cc.Vec2 = event.touch.getLocation();
		this.aimReticle.node.active = false;

		touchPos.subtract(this.lastTouchPos);
		touchPos.negSelf();
		const mag = Math.min(touchPos.mag(), MAG_CAP);

		if (mag < MIN_DRAG || touchPos.y < 0) {
			this.node.angle = 0;
			return;
		}

		touchPos.normalizeSelf();
		const normY = touchPos.y;
		touchPos.clampf(cc.Vec2.UP.rotateSelf(cc.misc.degreesToRadians(this.aimAngleBounds.x)), cc.Vec2.UP.rotateSelf(cc.misc.degreesToRadians(this.aimAngleBounds.y)));
		touchPos.y = normY;
		touchPos.multiplyScalar(mag);

		if (touchPos.equals(cc.Vec2.ZERO)) {
			console.log("No Move");
			this.node.angle = 0;
			return;
		}

		this.fireArrow(touchPos);
	}

	private adjustReticle(magnitude: number, angle: number) {
		magnitude = Math.min(magnitude, MAG_CAP);
		const magPerc = magnitude / MAG_CAP;
		this.node.angle = Math.min(Math.max(angle, this.aimAngleBounds.x), this.aimAngleBounds.y);
		this.aimReticle.node.scale = magPerc * (this.aimScalingBounds.y - this.aimScalingBounds.x) + this.aimScalingBounds.x;
		this.aimReticle.spacingY = magPerc * (this.aimSpacingBounds.y - this.aimSpacingBounds.x) + this.aimSpacingBounds.x;
	}

	private fireArrow(strikeVec: cc.Vec2) {
		let node = cc.instantiate(this.arrowPrefab);
		node.x = this.aimReticle.node.x;
		node.y = this.aimReticle.node.y;

		this.projectile = node.getComponent(ArrowScript);
		this.projectile.init(this.node.angle, strikeVec.multiplyScalar(this.arrowForceModifier));
		this.bumpHit = 0;

		this.node.angle = 0;
		this.node.addChild(node);

		EventHelper.dispatchEvent(Events.PROJECTILE_FIRED, cc.game);
	}

	private projectileChanged(event: cc.Event.EventCustom) {
		this.projectile = event.getUserData() as ArrowScript;
	}

	projectileDestroyed(event: cc.Event.EventCustom) {
		this.projectile = null;
		this.bumpHit = event.getUserData();
	}

	private _interactionAllowed: boolean;
	private movementAllowed: boolean;
	private lastTouchPos: cc.Vec2;
	private projectile: ArrowScript;
	private bumpHit: number;
	private score: number;
}
