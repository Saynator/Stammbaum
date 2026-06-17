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

	public static basicDateType: customDateType = { name: "Basic ahh dates", tokens: [{ name: "Minute", range: 60 }] };
	public static dateTypes = new Map<string,customDateType>([["basicDateType", customDate.basicDateType]]);
	public static defaultDateType = this.basicDateType;
	settings!: StammbaumPluginSettings;
	dateTime: number;
	dateString: string;
	dateType: customDateType;

	constructor(dateString: string, dateType?: customDateType, settings?: StammbaumPluginSettings);
	constructor(date: Date, dateType?: customDateType, settings?: StammbaumPluginSettings);
	constructor(dateTime: number, dateType?: customDateType, settings?: StammbaumPluginSettings);
	constructor(date: undefined, dateType?: customDateType, settings?: StammbaumPluginSettings);
	constructor(date: string | Date | number | undefined, dateType?: customDateType, settings?: StammbaumPluginSettings) {
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
		this.dateType = dateType || customDate.defaultDateType;
	}
	toString() : string{
		return this.dateString ? this.dateString : this.makeStringfromValue();
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
	makeStringfromValue() : string {

		this.dateString = "";
		for (const token of this.dateType.tokens) {
			if (typeof token.range === "number") {
				const tokenTime = this.dateTime % token.range;
				this.dateString.concat(token.representation ? token.representation.replace("%s",tokenTime.toString()) : tokenTime.toString() ,this.dateString);
			}
			else {
				for(let subToken of token.range){
					// TODO
				}
			}
		}
		return this.dateString;
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
