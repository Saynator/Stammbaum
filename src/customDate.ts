import { DEFAULT_SETTINGS, StammbaumPluginSettings } from "settings";

interface customDateType {
	// The display name of the date type
	name: string
	
	// @property
	// Context Sensitive Grammar
	//
	// The order of the tokens in this array determines the hierarchy.
	// Example: "Hour",24 - Simple representation of hours, as they are consistently 24 per day.
	// 			"Day",[{interval: 1,value: 31},{interval: 1,value: 30},{interval: 12,value: 28,offset: 1},{interval: 48,value: 29,offset: 1},{interval: 4800,value: 28,offset: 1},{interval:19200,value:29,offset:1}] - Complex representation of days per larger unit (aka months).
	// The highest interval is binding per default, if you want to change that use the bindingHierarchy property.
	// To enforce the ranges when interpreting a number set the forceRanges parameter in the parse method.
	tokens : Array<{
		name: string, // The display name of the token
		range: number | {interval: number, 
			value: number,
			bindingHierarchy?: number,
			offset?: number}[],
		representation?: string
	}>;
	};

export class customDate {
	
	public static dateTypes = Array<customDateType>();

	settings!: StammbaumPluginSettings;
	dateTime: number;
	dateString: string;

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
	static compare(date1 : customDate, date2 : customDate){
		return false;
	}
	[Symbol.toPrimitive](hint: string): string | number {
		return hint === 'string' ? this.toString() : this.getValue();
	}
	parseCustomStringValue(dateString: string, forceRanges = false) : number {
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
