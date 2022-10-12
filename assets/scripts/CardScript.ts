import { EventHelper } from "./EventHelper";
import { Events } from "./Events";
import { PowerupStats } from "./PowerupController";
import { PowerupTypes } from "./PowerupTypes";

const {ccclass, property} = cc._decorator;

const MIN_DRAG = cc.winSize.width * 0.05;

@ccclass
export default class CardScript extends cc.Component {

	@property(cc.Node)
	cardBackBG: cc.Node = null;

	@property(cc.Sprite)
	cardSprite: cc.Sprite = null;

	@property(cc.Label)
	cardTitle: cc.Label = null;

	@property(cc.Label)
	cardDesc: cc.Label = null;

	@property
	scaleUpFactor: number = 1;

	@property([cc.RenderComponent])
	disableNodes: Array<cc.RenderComponent> = [];

	@property(cc.Material)
	normalMaterial: cc.Material = null;

	@property(cc.Material)
	greyMaterial: cc.Material = null;

	init(cardStats: PowerupStats, tempParent: cc.Node, destNode: cc.Node) {
		this.cardType= cardStats.powerupType;
		this.cardBackBG.color = cardStats.powerupColor;
		this.cardSprite.spriteFrame = cardStats.powerupHeroSprite;
		this.cardTitle.string = cardStats.powerupName;
		this.cardDesc.string = cardStats.powerupDesc;

		this.destNode = destNode;
		this.tempParent = tempParent;
		this.interactionBlocked = false;
		this.orgScale = this.node.scale;

		this.node.on(cc.Node.EventType.TOUCH_START, this.pickCard, this);
		this.node.on(cc.Node.EventType.TOUCH_MOVE, this.moveCard, this);
		this.node.on(cc.Node.EventType.TOUCH_END, this.placeCard, this);
		this.destNode.on(Events.POWERUP_DISABLE, this.disableCard, this);
	}

	start() {
		this.parent = this.node.parent;
	}

	onDestroy(): void {
		this.node.off(cc.Node.EventType.TOUCH_START, this.pickCard, this);
		this.node.off(cc.Node.EventType.TOUCH_MOVE, this.moveCard, this);
		this.node.off(cc.Node.EventType.TOUCH_END, this.placeCard, this);
		this.destNode.off(Events.POWERUP_DISABLE, this.disableCard, this);
	}

	get powerupType(): PowerupTypes {
		return this.cardType;
	}

	set enableCard(flag: boolean) {
		this.interactionBlocked = !flag;
		const mat = flag ? this.normalMaterial : this.greyMaterial;
		this.disableNodes.forEach((node) => {
			node.setMaterial(0, mat);
		});
		if (!flag) {
			this.resetCardParent(this.parent);
			this.setScale(this.orgScale);
		}
	}

	private pickCard(event: cc.Event.EventTouch) {
		this.lastTouchPos = event.touch.getLocation();
		this.resetCardParent(this.tempParent);
		this.setScale(this.scaleUpFactor);
		this.updateCardPos(this.lastTouchPos);
	}

	private moveCard(event: cc.Event.EventTouch) {
		const touchPos = event.touch.getLocation();

		if (this.interactionBlocked) return;

		if (Math.abs(this.lastTouchPos.x - touchPos.x) < MIN_DRAG &&
			Math.abs(this.lastTouchPos.y - touchPos.y) < MIN_DRAG) {
			return;
		}

		this.updateCardPos(touchPos);
	}

	private placeCard(event: cc.Event.EventTouch) {
		const touchPos = this.destNode.convertToNodeSpaceAR(this.node.convertToWorldSpaceAR(event.touch.getLocation()));
		if ( !this.interactionBlocked && !this.lastTouchPos.equals(touchPos) && this.isWithinBounds(touchPos)) {
			this.usePowerup();
		} else {
			this.resetCardParent(this.parent);
			this.setScale(this.orgScale);
		}
	}

	private updateCardPos(pos: cc.Vec2) {
		if (this.interactionBlocked) {
			this.resetCardParent(this.parent);
			this.setScale(this.orgScale);
		} else {
			const updatedPos = this.node.parent.convertToNodeSpaceAR(pos);
			this.node.setPosition(updatedPos);
		}
	}

	private resetCardParent(parent: cc.Node) {
		this.node.removeFromParent(false);
		this.node.setParent(parent);
		this.node.y = 0;
	}

	private isWithinBounds(pos: cc.Vec2): boolean {
		const worldCoord = this.node.convertToWorldSpaceAR(this.destNode.getPosition());
		return pos.x >= (worldCoord.x - this.destNode.width/2) && pos.x <= (worldCoord.x + this.destNode.width/2)
			&& pos.y >= (worldCoord.y - this.destNode.height/2) && pos.y <= (worldCoord.y + this.destNode.height/2);
	}

	private usePowerup() {
		EventHelper.dispatchEvent(Events.POWERUP_USE, cc.game, this.cardType);
		this.node.destroy();
	}

	private disableCard(_event) {
		this.enableCard = false;
	}

	private setScale(scale: number) {
		cc.tween(this.node)
		  .to(0.25, {scale: scale}, {easing: cc.easing.quartInOut})
		  .start();
	}

	private parent: cc.Node;
	private tempParent: cc.Node;
	private destNode: cc.Node;
	private cardType: PowerupTypes;
	private interactionBlocked: boolean;
	private lastTouchPos: cc.Vec2;
	private orgScale: number;
}
