export class EventHelper {
	static dispatchEvent(eventName: string, target: any, userData?: any) {
		const event = new cc.Event.EventCustom(eventName, true);
		event.setUserData(userData);
		target.dispatchEvent(event);
	}
}
