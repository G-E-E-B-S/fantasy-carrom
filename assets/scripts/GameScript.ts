import BotScript from "./BotScript";
import CardScript from "./CardScript";
import CoinScript from "./CoinScript";
import { Events } from "./Events";
import GameOverPopup from "./GameOverPopup";
import Set from "./models/Set";
import PlayerScript from "./PlayerScript";
import PocketScript from "./PocketScript";
import PowerupController  from "./PowerupController";
import { PowerupTypes } from "./PowerupTypes";
import WallScript from "./WallScript";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameScript extends cc.Component {

	@property({type: cc.Integer, min: 0})
	timePerTurn: number = 30;

	@property(cc.ProgressBar)
	timerBar: cc.ProgressBar = null;

	@property([WallScript])
	wallColliders: Array<WallScript> = [];

	@property([PocketScript])
	playerPocketColliders: Array<PocketScript> = [];

	@property([PocketScript])
	opponentPocketColliders: Array<PocketScript> = [];

	@property(PlayerScript)
	player: PlayerScript = null;

	@property(BotScript)
	bot: BotScript = null;

	@property(CoinScript)
	queen: CoinScript = null;

	@property
	minEnemyCount = 0;

	@property(CoinScript)
	enemies: Array<CoinScript> = [];

	@property
	maxCards: number = 4;

	@property(cc.Node)
	cardHolder: cc.Node = null;

	@property(cc.Node)
	playerTurnNode: cc.Node = null;

	@property(cc.Node)
	opponentTurnNode: cc.Node = null;

	@property(cc.Prefab)
	gameOverPrefab: cc.Prefab = null;

	@property(cc.Node)
	gameOverNode: cc.Node = null;

	start() {
		cc.game.on(Events.COIN_POCKETED, this.updateScore, this);
		cc.game.on(Events.PROJECTILE_FIRED, this.onFire, this);
		cc.game.on(Events.PROJECTILE_STOPPED, this.endTurn, this);
		cc.game.on(Events.PROJECTILE_DESTROYED, this.projectileDestroyed, this);
		cc.game.on(Events.POWERUP_USE, this.onPowerupUse, this);

		this.playerTurn = true;
		this.gameEnded = false;
		this.queenPocketed = false;
		this.projectileFired = false;
		this.projectileActive = false;
		this.activePowerups = new Set();

		this.populateCards();

		this.queen.unmovable = true;
		this.startTurn();
	}

	onDestroy() {
		cc.game.off(Events.COIN_POCKETED, this.updateScore, this);
		cc.game.off(Events.PROJECTILE_FIRED, this.onFire, this);
		cc.game.off(Events.PROJECTILE_STOPPED, this.endTurn, this);
		cc.game.off(Events.PROJECTILE_DESTROYED, this.projectileDestroyed, this);
		cc.game.off(Events.POWERUP_USE, this.onPowerupUse, this);
	}

	update(dt) {
		if (!this.projectileFired) return;

		if (this.projectileActive) return;

		if (!this.queen.hasStopped()) return;

		for (let enemy of this.enemies) {
			if (!enemy.hasStopped()) return;
		}

		this.endTurn();
	}

	startTurn() {
		this.turnTime = 0;
		this.stopTimer();
		this.timerBar.progress = 1;

		this.turnTimeout = setTimeout(() => {
			this.stopTimer();
			this.timerBar.progress = 0;
			if (!this.projectileFired) this.endTurn();
		}, this.timePerTurn * 1000);

		this.turnInterval = setInterval(() => {
			this.timerBar.progress = 1 - this.turnTime / this.timePerTurn;
			++this.turnTime;
		}, 1000);

		if (this.playerTurn) {
			this.playerTurnNode.active = true;
			this.opponentTurnNode.active = false;
			this.player.interactionAllowed = true;
			this.player.projectileListenerActive = true;
			this.bot.projectileListenerActive = false;
			this.player.destroyProjectile();
			this.togglePowerups(true);
		} else {
			this.opponentTurnNode.active = true;
			this.playerTurnNode.active = false;
			this.bot.attemptMove();
			this.bot.projectileListenerActive = true;
			this.player.projectileListenerActive = false;
			this.bot.destroyProjectile();
			this.powerupAction();
		}
	}

	endTurn() {
		this.projectileFired = false;
		this.projectileActive = false;

		if (this.playerTurn) {
			this.player.interactionAllowed = false;
			this.player.destroyProjectile();
			this.togglePowerups(false);
		} else {
			this.bot.destroyProjectile();
			this.stopPowerupAction();
			this.populateCards();
		}

		this.playerTurn = !this.playerTurn;

		setTimeout(() => {
			if (this.enemies.length <= this.minEnemyCount) {
				this.queen.unmovable = false;
			}
		}, 25);

		if (!this.gameEnded) this.startTurn();
	}

	private updateScore(event: cc.Event.EventCustom) {
		let coin = event.getUserData();
		if (coin.isQueen) this.queenPocketed = true;
		this.enemies = this.enemies.filter(obj => obj != coin);
		if (this.playerTurn) {
			this.player.calcScore(coin);
		} else {
			this.bot.calcScore(coin);
		}

		if (this.hasGameEnded()) {
			this.gameEnded = true;
			this.stopTimer();

			let node = cc.instantiate(this.gameOverPrefab);
			let gameOver = node.getComponent(GameOverPopup);

			gameOver.init(this.player.getScore() > this.bot.getScore(), this.player.getScore() == this.bot.getScore(), this.player.getScore());

			this.gameOverNode.addChild(node);
		}
	}

	private onFire() {
		this.projectileFired = true;
		this.projectileActive = true;
		if (this.playerTurn) {
			this.togglePowerups(false);
			this.player.interactionAllowed = false;
		}
		this.stopTimer();
		this.timerBar.progress = 0;
	}

	private togglePowerups(enable: boolean) {
		if (!enable) PowerupController.getInstance().disableCurrentCard();
		this.cardHolder.children.forEach((cardNode) => {
			let card = cardNode.getComponent(CardScript);
			card.enableCard = enable;
		});
	}

	private projectileDestroyed(event: cc.Event.EventCustom) {
		if (this.playerTurn) {
			this.projectileActive = false;
			this.player.projectileDestroyed(event);
		} else {
			this.projectileActive = false;
			this.bot.projectileDestroyed(event);
		}
	}

	private onPowerupUse(event: cc.Event.EventCustom) {
		this.togglePowerups(false);
		let cardType = event.getUserData() as PowerupTypes;
		this.activePowerups.add(cardType)
		PowerupController.getInstance().usePowerup(cardType);
	}

	private powerupAction() {
		for(let powerup of this.activePowerups.toArray()) {
			switch (powerup) {
				case PowerupTypes.HOLE_PLUG:
					this.opponentPocketColliders.forEach((pocket) => {
						pocket.allowPocketing = false;
					});
					break;
				case PowerupTypes.WALL_PCHKK:
					this.wallColliders.forEach((wall) => {
						wall.sticky = true;
					});
					break;
				case PowerupTypes.WALL_BOOM:
					this.wallColliders.forEach((wall) => {
						wall.jumpy = true;
					});
					break;
				case PowerupTypes.MO_SPEED:
					if (this.enemies.length <= this.minEnemyCount)
						this.queen.slippy = true;
					this.enemies.forEach((enemy) => {
						enemy.slippy = true;
					});
					break;
			}
			PowerupController.getInstance().showEffect(powerup);
		}
	}

	private stopPowerupAction() {
		for (let powerup of this.activePowerups.toArray()) {
			switch (powerup) {
				case PowerupTypes.HOLE_PLUG:
					this.opponentPocketColliders.forEach((pocket) => {
						pocket.allowPocketing = true;
					});
					break;
				case PowerupTypes.WALL_PCHKK:
					this.wallColliders.forEach((wall) => {
						wall.sticky = false;
					});
					break;
				case PowerupTypes.WALL_BOOM:
					this.wallColliders.forEach((wall) => {
						wall.jumpy = false;
					});
					break;
				case PowerupTypes.MO_SPEED:
					if (this.enemies.length <= this.minEnemyCount)
						this.queen.slippy = false;
					this.enemies.forEach((enemy) => {
						enemy.slippy = false;
					});
					break;
			}
			PowerupController.getInstance().hideEffect(powerup);
		}
		this.activePowerups.clear();
	}

	private populateCards() {
		while(this.cardHolder.childrenCount < this.maxCards) {
			this.cardHolder.addChild(PowerupController.getInstance().getNewCard());
		}
	}

	private hasGameEnded(): boolean {
		return this.queenPocketed && this.enemies.length == 0;
	}

	private stopTimer() {
		clearTimeout(this.turnTimeout);
		clearInterval(this.turnInterval);
	}

	private playerTurn: boolean;
	private projectileFired: boolean;
	private projectileActive: boolean;
	private activePowerups: Set<PowerupTypes>;
	private turnTime: number;
	private turnTimeout: any;
	private turnInterval: any;
	private queenPocketed: boolean;
	private gameEnded: boolean;
}
