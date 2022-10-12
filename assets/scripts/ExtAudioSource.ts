import AudioManager from "./AudioManager";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ExtAudioSource extends cc.Component {

	@property([cc.String])
	audioList: string[] = [""];

	@property({type: cc.Float, min: 0, max: 1, step: 0.1, slide: true})
	volume: number = 1;

	@property
	isMusic: boolean = false;

	@property
	isLoop: boolean = false;

	@property({type: cc.Integer, min: -1})
	maxPlayCount: number = -1;

	@property
	playOnLoad: boolean = false;

	@property({type: cc.Integer, min: 0})
	audioIndex: number = 0;

	start() {
		if (this.playOnLoad)
			this._playAudio();
	}

	playAudio(audioIdx : number=0) {
		this.audioIndex = audioIdx;
		this._playAudio();
	}

	stopAudio() {
		let index = Math.floor(this.audioIndex);
		if (this.isMusic) {
			AudioManager.getInstance().stopMusic();
		} else {
			AudioManager.getInstance().stopSound(this.audioList[index]);
		}
	}

	private _playAudio() {
		if (this.maxPlayCount > -1 && this.playCount >= this.maxPlayCount) {
			return;
		}
		this.playCount++;
		let index = Math.floor(this.audioIndex);
		if (this.isMusic) {
			AudioManager.getInstance().playMusic(this.audioList[index]);
		} else {
			AudioManager.getInstance().playSound(this.audioList[index], 0, true, this.volume, null, null, this.isLoop);
		}
	}

	private playCount: number = 0;
}
