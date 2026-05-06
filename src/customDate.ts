import { DEFAULT_SETTINGS, StammbaumPluginSettings } from "settings";

export class customDate {
	settings!: StammbaumPluginSettings;
	dateTime: number;
	dateString: string;
	pattern: RegExp;
	groupPriority: string[];
	groupWeight: Map<string,number>

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
		try {
			this.pattern = RegExp(this.settings.datePattern);
		} catch (e) {
			console.error(`Invalid date pattern "${this.settings.datePattern}". Using default pattern.`);
			this.pattern = RegExp(DEFAULT_SETTINGS.datePattern || '');
		}
		this.groupPriority = this.settings.dateGroupPriority.split(',');
		this.groupWeight = new Map<string,number>();
		const groupWeights = this.settings.dateGroupWeights.split(',').map(n => {return parseInt(n)});
		this.groupPriority.forEach((group,i) => {
			if (i >= groupWeights.length) return;
			this.groupWeight.set(group, groupWeights[i] ?? 0);
		});
	}
	toString() : string{
		return this.dateString ? this.dateString : 'not implemented';
	}

	getValue() : number{
		return this.dateTime ? this.dateTime : this.parseCustomStringValue(this.dateString); //TODO
	}
	[Symbol.toPrimitive](hint: string): string | number {
		return hint === 'string' ? this.toString() : this.getValue();
	}
	parseCustomStringValue(dateString: string) : number {
		return 0;
		const match = dateString.match(this.pattern);
		if (!match || match === undefined) {
			console.warn(`Date string "${dateString}" does not match the pattern "${this.pattern}". Returning 0.`);
			return 0;
		}
		let value = 0;
		for (const groupName of this.groupPriority) {
			const groupValue = match.groups ? match.groups[groupName] : undefined;
			if (groupValue !== undefined) {
				value += groupValue*groupWeight[groupName];
			}
		}
		return value;
	}
}
