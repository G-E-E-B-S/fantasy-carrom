import PriorityQueue from "./models/PriorityQueue";
import { EventHelper } from "./EventHelper";

export enum AudioEvents {
	SOUND_MUTE = "SOUND_MUTE",
	SOUND_UNMUTE = "SOUND_UNMUTE",
	LOAD_LAZY_AUDIO = "LOAD_LAZY_AUDIO",
	MUSIC_MUTE = "MUSIC_MUTE",
	MUSIC_UNMUTE = "MUSIC_UNMUTE"
}

const SoundsLoaded = "soundsLoaded";
const IntervalToCheckIfAudioPlaying = 0.1;
type SoundPlayedCallback = (any?) => any;
enum AudioType {
	Music,
	Sound
}

enum ChannelStatus {
	Idle,
	Loading,
	Playing
}

class AudioChannel {
	source: cc.AudioSource = null;
	status: ChannelStatus = ChannelStatus.Idle;
	request: PlayRequest = null;
	node: cc.Node = null;
}

class PlayRequest {
	type: AudioType;
	url: string;
	maxLatency: number;
	mustPlay: boolean;
	volume: number;
	requestedAt: number;
	onComplete: (any?) => any;
	payload: any;
	loop: boolean;
	id: number;
}

const compareRequestTimes = (reqA: PlayRequest, reqB: PlayRequest) => {
	if (reqA.requestedAt > reqB.requestedAt) {
		return -1;
	} else if (reqA.requestedAt < reqB.requestedAt) {
		return 1;
	}
	return 0;
}

const comparePlayRequest = (reqA: PlayRequest, reqB: PlayRequest) => {
	if (!reqA.mustPlay && reqB.mustPlay) {
		return -1;
	}
	if (!reqB.mustPlay && reqA.mustPlay) {
		return 1;
	}
	return compareRequestTimes(reqA, reqB);
}

export interface AudioConfig {
	id: string;
	path: string;
}

export default class AudioManager {
	constructor() {
		this.soundMute = false;
		this.musicMute = false;
		this.appIsInForeground = true;
		this.lazyLoadAudio = true;
		this.eventTarget = new cc.EventTarget();
		cc.game.on(cc.game.EVENT_HIDE, (_event) => { this.onAppToBackground(); });
		cc.game.on(cc.game.EVENT_SHOW, (_event) => { this.onAppToForeground(); });
	}

	static getInstance() {
		if (!AudioManager.instance) {
			AudioManager.instance = new AudioManager();
		}
		return AudioManager.instance;
	}

	loadData(soundsJson: any) {
		this.audios = soundsJson;
	}

	static sound(id: string) {
		this.getInstance().playSound(id);
	}

	static music(id: string) {
		this.getInstance().playMusic(id);
	}

	isSoundMute(): boolean {
		return this.soundMute;
	}

	isMusicMute(): boolean {
		return this.musicMute;
	}

	init(targetNode: cc.Node, channelBufferSize: number = 5) {
		if (this.musicChannel) {
			return;
		}

		if (!cc.sys.localStorage.getItem("SOUND_ON")) {
			this.saveLocalSound(true);
			this.saveLocalMusic(true);
		} else {
			this.soundMute = !cc.sys.localStorage.getItem("SOUND_ON");
		}

		if (cc.sys.localStorage.getItem(SoundsLoaded)) {
			this.loadLazyAudio();
		}

		this.musicChannel = new AudioChannel();
		this.musicChannel.source = new cc.AudioSource();
		this.musicChannel.source.playOnLoad = true;
		this.musicChannel.source.loop = true;
		for (let i = 0; i != channelBufferSize; ++i) {
			this.createChannel();
		}

		this.targetNode = targetNode;
		this.tickTimer = cc.tween(this.targetNode);
		this.tickTimer
		    .delay(0.5)
		    .call(this.timerTickComplete.bind(this))
		    .repeatForever(this.tickTimer)
		    .start();
	}

	onGameEnd() {
		if (!cc.sys.localStorage.getItem(SoundsLoaded)) {
			this.loadLazyAudio();
			cc.sys.localStorage.setItem(SoundsLoaded, String(Number()));
		}
	}

	loadLazyAudio() {
		if (this.lazyLoadAudio) {
			return;
		}
		this.lazyLoadAudio = true;
		EventHelper.dispatchEvent(AudioEvents.LOAD_LAZY_AUDIO, this.eventTarget);
	}

	getEventDispatcher(): cc.EventTarget {
		return this.eventTarget;
	}

	muteAllSounds() {
		this.setSoundMute(true);
		EventHelper.dispatchEvent(AudioEvents.SOUND_MUTE, this.eventTarget, null);
	}

	unMuteAllSounds() {
		this.setSoundMute(false);
		EventHelper.dispatchEvent(AudioEvents.SOUND_UNMUTE, this.eventTarget, null);
	}

	muteAllMusic() {
		this.setMusicMute(true);
		EventHelper.dispatchEvent(AudioEvents.MUSIC_MUTE, this.eventTarget, null);
	}

	unMuteAllMusic() {
		this.setMusicMute(false);
		EventHelper.dispatchEvent(AudioEvents.MUSIC_UNMUTE, this.eventTarget, null);
	}

	playMusic(id: string, volume: number = 1) {
		if (!this.lazyLoadAudio) {
			return;
		}

		let config = this.getAudioConfig(id);
		if (!config) {
			console.log(`Couldn't find Audio config for music ${id}`);
			return;
		}

		let request: PlayRequest = {
			type: AudioType.Music,
			url: config.path,
			maxLatency: 0,
			mustPlay: true,
			volume: volume,
			requestedAt: Date.now(),
			onComplete: null,
			payload: null,
			loop: true,
			id: AudioManager.requestIdentity++,
		}
		this.playInChannel(this.musicChannel, request);
	}

	stopMusic() {
		if (this.musicChannel.source.isPlaying) {
			this.musicChannel.source.stop();
		}
	}

	playSound(id: string, maxLatency: number = 0,
	          mustPlay: boolean = true,
	          volume: number = 1,
	          onComplete: SoundPlayedCallback = null, payload = null, loop: boolean = false) {
		if (!this.lazyLoadAudio) {
			return;
		}
		if (!id || id.length < 1) {
			return;
		}
		let config = this.getAudioConfig(id);
		if (!config) {
			console.log(`Couldn't find Audio config for sound ${id}`);
			return;
		}
		let channel = this.getIdleChannel(maxLatency == 0 && mustPlay);
		let request: PlayRequest = {
			type: AudioType.Sound,
			url: config.path,
			maxLatency: maxLatency,
			mustPlay: mustPlay,
			volume: volume,
			requestedAt: Date.now(),
			onComplete: onComplete,
			payload: payload,
			loop: loop,
			id: AudioManager.requestIdentity++,
		}
		if (channel) {
			this.playInChannel(channel, request);
		} else {
			this.sfxQueues.enqueue(request);
		}
	}

	stopSound(id: string) {
		if (!id || id.length < 1) {
			return;
		}
		let config = this.getAudioConfig(id);
		if (!config) {
			console.log(`Couldn't find Audio config for sound ${id}`);
			return;
		}
		this.channels.forEach(channel => {
			if (channel.request && channel.request.url == config.path) {
				this.releaseChannel(channel);
				return;
			}
		});
	}

	stopTickTimer() {
		if (this.tickTimer) {
			this.tickTimer.stop();
		}
	}

	private onAppToBackground() {
		this.appIsInForeground = false;
		this.updateMusicVolumes();
		this.updateSoundVolumes();
	}

	private onAppToForeground() {
		this.appIsInForeground = true;
		this.updateMusicVolumes();
		this.updateSoundVolumes();
	}

	private playInChannel(channel: AudioChannel, request: PlayRequest) {
		this.idleChannelsCount--;
		channel.status = ChannelStatus.Loading;
		channel.request = request;
		cc.resources.load(request.url, cc.AudioClip, (err, asset) => {
			if (err) {
				return;
			}

			this.onAudioLoaded(asset as cc.AudioClip, {
				channel: channel,
				request: request
			});
		});
	}

	private onAudioLoaded(clip: cc.AudioClip, payload) {
		let channel: AudioChannel = payload.channel;
		let request: PlayRequest = payload.request;
		if (!channel.request) {
			return;
		}
		if (channel.request.id != request.id) {
			return;
		}
		this.fixChannelNode(channel);
		channel.status = ChannelStatus.Playing;
		channel.source.clip = clip;
		channel.source.loop = request.loop;
		channel.source.node.targetOff(this);
		//this.log('listening to finish');
		channel.source.node.once('finished', (_obj) => {
			console.log(`AudioSource finished`);
		}, this);
		channel.source.play();
		if (request.type == AudioType.Sound) {
			channel.source.volume = this.getSoundVolume(request);
			setTimeout(() => {
				this.checkIfStillPlayingCallback(channel);
			}, IntervalToCheckIfAudioPlaying);
		} else {
			channel.source.volume = this.getMusicVolume(request);
		}
	}
	private fixChannelNode(channel: AudioChannel) {
		try {
			if (!channel.node || !cc.isValid(channel.node)) {
				channel.node = new cc.Node();
				if (channel.source) {
					channel.source.node = channel.node;
				}
			}
			if (cc.isValid(this.targetNode) && !cc.isValid(channel.node.parent)) {
				this.targetNode.addChild(channel.node);
			}
		} catch (e) { }
	}
	private checkIfStillPlayingCallback(channel: AudioChannel) {
		const checkIfStillPlaying = () => {
			if (channel.source.isPlaying) {
				setTimeout(() => {
					checkIfStillPlaying();
				}, IntervalToCheckIfAudioPlaying);
			} else {
				this.releaseChannel(channel);
			}
		}
		return checkIfStillPlaying;
	}
	private getSoundVolume(request: PlayRequest) {
		return this.soundMute ? 0 : request.volume;
	}
	private getMusicVolume(request: PlayRequest) {
		return this.musicMute ? 0 : request.volume;
	}

	private releaseChannel(channel: AudioChannel) {
		let request = channel.request;
		if (!request) {
			return;
		}
		channel.status = ChannelStatus.Idle;
		channel.request = null;
		if (channel.source.isPlaying) {
			channel.source.stop();
		}
		this.idleChannelsCount++;
		console.log(`for sound ${request.url}`);
		if (request.onComplete) {
			if (request.onComplete.length > 0) {
				request.onComplete(request.payload);
			} else {
				request.onComplete(request.payload);
			}
		}
	}

	protected timerTickComplete() {
		if (!this.sfxQueues.size()) {
			return;
		}
		/**
		 * First play those which must be played
		 */
		this.playOldQueuedSFX();
		/**
		 * Now play the rest if there's an idle channel
		 */
		this.playRemainingSFX();
	}
	private playOldQueuedSFX() {
		const timeNow = Date.now();
		while (this.sfxQueues.size()) {
			const request = this.sfxQueues.peek();
			if (timeNow - request.requestedAt >= request.maxLatency) {
				let channel = this.getIdleChannel(request.mustPlay);
				if (channel) {
					this.playInChannel(channel, request);
					this.sfxQueues.dequeue();
					continue;
				}
			}
			break;
		}
	}
	private playRemainingSFX() {
		while (this.sfxQueues.size()) {
			const request = this.sfxQueues.peek();
			let channel = this.getIdleChannel();
			if (channel) {
				this.playInChannel(channel, request);
				this.sfxQueues.dequeue();
			} else {
				this.idleChannelsCount = 0;
				break;
			}
		}
	}

	private setSoundMute(isMute: boolean) {
		this.soundMute = isMute;
		this.saveLocalSound(!isMute);
		console.log(`setting sound mute - ${isMute}`);
		this.updateSoundVolumes();
	}

	private updateSoundVolumes() {
		this.channels.forEach(channel => {
			if (channel.status == ChannelStatus.Playing && channel.request && channel.request.type == AudioType.Sound) {
				channel.source.volume = (this.soundMute || !this.appIsInForeground) ? 0 : channel.request.volume;
			}
		});
	}

	private setMusicMute(isMute: boolean) {
		this.musicMute = isMute;
		this.saveLocalMusic(!isMute);
		console.log(`setting music mute - ${isMute}`);
		this.updateMusicVolumes();
	}

	private updateMusicVolumes() {
		if (!this.musicChannel) {
			return;
		}
		if (this.musicChannel.status == ChannelStatus.Playing && this.musicChannel.request && this.musicChannel.request.type == AudioType.Music) {
			this.musicChannel.source.volume = (this.musicMute || !this.appIsInForeground) ? 0 : this.musicChannel.request.volume;
		}
	}

	private saveLocalSound(enable: boolean) {
		cc.sys.localStorage.setItem("SOUND_ON", enable ? "true" : "false");
	}

	private saveLocalMusic(enable: boolean) {
	}

	private createChannel(): AudioChannel {
		let channel = new AudioChannel();
		channel.source = new cc.AudioSource();
		channel.source.playOnLoad = false;
		this.channels.push(channel);
		this.idleChannelsCount++;
		return channel;
	}

	private getIdleChannel(dontFail: boolean = false): AudioChannel {
		for (let i = 0; i != this.channels.length; ++i) {
			if (this.channels[i].status == ChannelStatus.Idle) {
				return this.channels[i];
			}
		}
		if (dontFail) {
			return this.createChannel();
		}
		return null;
	}

	getAudioConfig(id: string): AudioConfig {
		return this.audios[id];
	}

	private static instance: AudioManager;
	private static requestIdentity: number = 0;
	private soundMute: boolean;
	private musicMute: boolean;
	private appIsInForeground: boolean;
	private lazyLoadAudio: boolean;
	private eventTarget: cc.EventTarget;
	private targetNode: cc.Node;
	private idleChannelsCount: number = 0;
	private musicChannel: AudioChannel;
	private channels: Array<AudioChannel> = [];
	private sfxQueues = new PriorityQueue(comparePlayRequest);
	private audios: { [index: string]: AudioConfig } = {};
	private tickTimer: cc.Tween;
}
