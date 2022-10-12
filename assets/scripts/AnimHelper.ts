class AnimationTarget {
	play(animation: cc.Animation, clip?: string, onFinished?: Function, target?: any) {
		animation.targetOff(this);
		animation.stop();
		animation.play(clip);
		if (onFinished) {
			animation.once('finished', () => {
				if (cc.isValid(onFinished)) {
					if (cc.isValid(target)) {
						onFinished.apply(target);
					} else {
						onFinished();
					}
				}
			}, this);
		}
	}
}

export class AnimHelper {
	private static animationTarget: AnimationTarget = new AnimationTarget();

	/**
	 * Helper method to play the clip of animation once and call onFinished function of the target after completion
	 * @param animation
	 * @param clip
	 * @param target
	 * @param onFinished
	 * @param playAfterDelay
	 * @param delayCallback
	 */
	static playClipOnce(animation: cc.Animation, clip: cc.AnimationClip | string, target?: any, onFinished?: Function, playAfterDelay: number = 0, delayCallback?: Function) {
		let clipName = "";
		if (clip) {
			if (clip instanceof cc.AnimationClip) {
				clipName = clip.name;
			} else {
				clipName = clip;
			}
		}
		let func = () => {
			if (delayCallback) {
				delayCallback();
			}
			this.animationTarget.play(animation, clipName, onFinished, target);
		}
		if (playAfterDelay > 0) {
			setTimeout(() => {
				func();
			}, playAfterDelay * 1000);
		} else {
			func();
		}
	}

	/**
	 * Helper method to play array of clips in an animation one after the other.
	 * @param animation
	 * @param onComplete
	 * @param clips
	 */
	static PlayClips(animation: cc.Animation, onComplete: () => any, clips: cc.AnimationClip[]) {
		let index = -1;
		let playNext = () => {
			index++;
			if (index >= clips.length) {
				if (onComplete) {
					onComplete();
				}
				return;
			}
			this.playClipOnce(animation, clips[index], animation.node, playNext);
		};
		playNext();
	}
}
