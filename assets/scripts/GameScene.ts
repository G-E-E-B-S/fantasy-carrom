import AudioManager from "./AudioManager";
import LoadingScreen from "./LoadingScreen";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameScene extends cc.Component {

	@property(cc.Node)
	audioTarget: cc.Node = null;

	@property(cc.JsonAsset)
	soundsJson: cc.JsonAsset = null;

	@property(cc.Node)
	gameSceneNode: cc.Node = null;

	@property({type: cc.Float, min: 0})
	loadTime: number = 3;

	onLoad() {
		cc.director.getPhysicsManager().enabled = true;
		cc.director.getPhysicsManager().gravity = cc.Vec2.ZERO;

		cc.game.addPersistRootNode(this.audioTarget);
		AudioManager.getInstance().init(this.audioTarget);
		AudioManager.getInstance().loadData(this.soundsJson.json);
		AudioManager.getInstance().unMuteAllSounds();
	}

	start(): void {
		this.gameSceneNode.active = false;

		setTimeout(() => {
			this.gameSceneNode.active = true;
			LoadingScreen.hide();
		}, this.loadTime * 1000);
	}
}
