import ArrowScript from "./ArrowScript";
import CoinScript from "./CoinScript";
import { EventHelper } from "./EventHelper";
import { Events } from "./Events";
import { Random } from "./models/random";
import { RandomUtils } from "./RandomUtils";
import Prefab = cc.Prefab;

const {ccclass, property} = cc._decorator;

const MIN_DRAG = cc.winSize.width * 0.05;
const MAG_CAP = 100;
const HIT_MOD = 3;

@ccclass
export default class BotScript extends cc.Component {

	@property(cc.Label)
	botScore: cc.Label = null;

	@property(cc.Node)
	botKills: cc.Node = null;

	@property(cc.Vec2)
	botMovementDelay: cc.Vec2 = cc.v2(1, 3);

	@property
	botMovementDuration: number = 0.25;

	@property(cc.Vec2)
	botMovementBounds: cc.Vec2 = cc.v2(-270, 270);

	@property(cc.Prefab)
	arrowPrefab: cc.Prefab = null;

	@property
	arrowFireDelay: number = 0.25;

	@property
	arrowForceModifier: number = 15;

	@property(cc.Layout)
	aimReticle: cc.Layout = null;

	@property(cc.Vec2)
	aimDuration: cc.Vec2 = cc.v2(1, 3);

	@property(cc.Vec2)
	aimSpacingBounds: cc.Vec2 = cc.v2(1, 10);

	@property(cc.Vec2)
	aimScalingBounds: cc.Vec2 = cc.v2(1, 3);

	@property(cc.Vec2)
	aimAngleBounds: cc.Vec2 = cc.v2(-70, 70);

	constructor() {
		super();
		this.bumpHit = 0;
		this.score = 0;
	}

	start() {
		cc.game.on(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
	}

	onDestroy() {
		cc.game.off(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
	}

	set projectileListenerActive(value: boolean) {
		if (value) {
			cc.game.on(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
		} else {
			cc.game.off(Events.PROJECTILE_CHANGED, this.projectileChanged, this);
		}
	}

	attemptMove() {
		const movePosX = RandomUtils.getRandomFloat(this.botMovementBounds.x, this.botMovementBounds.y);
		cc.tween(this.node)
		  .delay(RandomUtils.getRandomFloat(this.botMovementDelay.x, this.botMovementDelay.y))
		  .to(this.botMovementDuration, {x: movePosX}, {easing: cc.easing.quartInOut})
		  .call(() => {
			  this.node.angle = RandomUtils.getRandomFloat(this.aimAngleBounds.x, this.aimAngleBounds.y);
			  const angle = cc.misc.degreesToRadians(this.node.angle);
			  this.aimReticle.node.active = false;
			  this.unscheduleAllCallbacks();
			  const duration = RandomUtils.getRandomFloat(this.aimDuration.x, this.aimDuration.y);
			  const mag = RandomUtils.getRandomFloat(MIN_DRAG, MAG_CAP / 1.5);
			  const xDir = this.node.angle < 0 ? -1 : 1;
			  const strikeVec = cc.v2(xDir * Math.abs(this.node.getPosition().x + mag * Math.sin(angle)), -Math.abs(this.node.getPosition().y + mag * Math.cos(angle)));
			  let step = 0;
			  const maxSteps = Math.ceil(duration / 0.01);
			  this.schedule(() => {
				  const tempVec = cc.Vec2.lerp(cc.v2(), this.node.getPosition(), strikeVec, step/maxSteps);
				  if (tempVec.mag() < MIN_DRAG) {
					  this.aimReticle.node.active = false;
					  this.adjustReticle(MIN_DRAG);
				  } else {
					  this.aimReticle.node.active = true;
					  this.adjustReticle(tempVec.mag());
				  }
				  ++step;
				  if (step == maxSteps) {
					  this.aimReticle.node.active = false;
					  this.scheduleOnce(() => this.fireArrow(strikeVec), this.arrowFireDelay);
				  }
			  }, 0.01,  maxSteps - 1);
		  }).start();
	}

	destroyProjectile() {
		this.projectile?.node?.destroy();
	}

	getScore(): number {
		return this.score;
	}

	calcScore(coin: CoinScript) {
		this.score += coin.getScore() + (HIT_MOD + this.bumpHit);
		this.botScore.string = this.score.toString();

		setTimeout(() => {
			coin.node.angle = 180;
			this.botKills.addChild(coin.node);
			coin.resetPosition();
		}, 20);
	}

	private adjustReticle(magnitude: number) {
		magnitude = Math.min(magnitude, MAG_CAP);
		const magPerc = magnitude / MAG_CAP;
		this.aimReticle.node.scale = magPerc * (this.aimScalingBounds.y - this.aimScalingBounds.x) + this.aimScalingBounds.x;
		this.aimReticle.node.scaleY = -this.aimReticle.node.scaleY;
		this.aimReticle.spacingY = magPerc * (this.aimSpacingBounds.y - this.aimSpacingBounds.x) + this.aimSpacingBounds.x;
	}

	private fireArrow(strikeVec: cc.Vec2) {
		let node = cc.instantiate(this.arrowPrefab);
		node.x = this.aimReticle.node.x;
		node.y = this.aimReticle.node.y;

		node.scaleX = -node.scaleX;
		node.scaleY = -node.scaleY;
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

	private projectile: ArrowScript;
	private bumpHit: number;
	private score: number;
}
