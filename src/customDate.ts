import { DEFAULT_SETTINGS, StammbaumPluginSettings } from "settings";

export class customDate {
	settings!: StammbaumPluginSettings;
	dateTime: number;
	dateString: string;
	pattern: RegExp;
	groupPriority: string[];

	constructor(dateString: string, settings: StammbaumPluginSettings);
	constructor(date: Date, settings: StammbaumPluginSettings);
	constructor(dateTime: number, settings: StammbaumPluginSettings);
	constructor(date: undefined, settings: StammbaumPluginSettings);
	constructor(date: string | Date | number | undefined, settings: StammbaumPluginSettings) {
		this.settings = settings || DEFAULT_SETTINGS;
		if (typeof date === "number") {
			this.dateTime = date;
			this.dateString = this.toString();
		} else if (date === undefined) {
			this.dateTime = 0;
			this.dateString = this.toString();
		} else {
			this.dateTime = date instanceof Date ? date.getTime() : this.getValue();
			this.dateString = date instanceof Date ? date.toISOString() : date;
		}
		//this.pattern = RegExp(this.settings.datePattern) ? RegExp(this.settings.datePattern) : RegExp(DEFAULT_SETTINGS.datePattern || '');
		//this.groupPriority = this.settings.dateGroupPriority.split(',');
	}
	toString() : string{
		return this.dateString ? this.dateString : 'not implemented';
	}

	getValue() : number{
		return this.dateTime ? this.dateTime : 0; //TODO
	}
	[Symbol.toPrimitive](hint: string): string | number {
		return hint === 'string' ? this.toString() : this.getValue();
	}
}
