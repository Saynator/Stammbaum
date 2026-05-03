import {App, PluginSettingTab, Setting} from "obsidian";
import StammbaumPlugin from "./main";

export interface StammbaumPluginSettings {
	stammbaumSetting: string;
	namelistLocation: string;
	parentsProperty: string;
	dateOfBirthProperty: string;
	dateOfDeathProperty: string;
	relationshipIndicator: string;
	birthSymbol: string;
	deathSymbol: string;
}

export const DEFAULT_SETTINGS: StammbaumPluginSettings = {
	stammbaumSetting: 'default',
	namelistLocation: 'Namensliste.md',
	parentsProperty: 'Parents',
	dateOfBirthProperty: 'Date of birth',
	dateOfDeathProperty: 'Date of death',
	relationshipIndicator: '# Relationships',
	birthSymbol: '*',
	deathSymbol: '✝'
}

export class StammbaumPluginSettingsTabs extends PluginSettingTab {
	plugin: StammbaumPlugin;

	constructor(app: App, plugin: StammbaumPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	async loadSettings() {
		const data = (await this.plugin.loadData()) as Partial<StammbaumPluginSettings> | undefined;
		this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}
	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.stammbaumSetting)
				.onChange(async (value) => {
					this.plugin.settings.stammbaumSetting = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Name list location')
			.setDesc('Location of the name list')
			.addText(text => text
				.setPlaceholder('Namensliste')
				.setValue(this.plugin.settings.namelistLocation)
				.onChange(async (value) => {
					this.plugin.settings.namelistLocation = value;
					await this.plugin.saveSettings();
				}));

		/*
		//
		//
		// IDENTIFIER SETTINGS
		//
		//
		*/
		new Setting(containerEl).setHeading().setName('Identifier');

		
		new Setting(containerEl)
			.setName('Parents')
			.setDesc('The name of the parent property')
			.addText(text => text
				.setPlaceholder('Parents')
				.setValue(this.plugin.settings.parentsProperty)
				.onChange(async (value) => {
					this.plugin.settings.parentsProperty = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Date of birth')
			.setDesc('The name of the date of birth property')
			.addText(text => text
				.setPlaceholder('Date of birth')
				.setValue(this.plugin.settings.dateOfBirthProperty)
				.onChange(async (value) => {
					this.plugin.settings.dateOfBirthProperty = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Date of death')
			.setDesc('The name of the date of death property')
			.addText(text => text
				.setPlaceholder('Date of death')
				.setValue(this.plugin.settings.dateOfDeathProperty)
				.onChange(async (value) => {
					this.plugin.settings.dateOfDeathProperty = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Relationship indicator')
			.setDesc('The name of the relationship indicator')
			.addText(text => text
				.setPlaceholder('Relationships')
				.setValue(this.plugin.settings.relationshipIndicator)
				.onChange(async (value) => {
					this.plugin.settings.relationshipIndicator = value;
					await this.plugin.saveSettings();
				}));

		/*
		//
		//
		// Custom Display Names Settings
		//
		//
		*/
		new Setting(containerEl).setHeading().setName('Custom display names');

		new Setting(containerEl)
			.setName('Birth symbol')
			.setDesc('The birth symbol to use in the family tree display')
			.addText(text => text
				.setPlaceholder('*')
				.setValue(this.plugin.settings.birthSymbol)
				.onChange(async (value) => {
					this.plugin.settings.birthSymbol = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('Death symbol')
			.setDesc('The death symbol to use in the family tree display')
			.addText(text => text
				.setPlaceholder('✝')
				.setValue(this.plugin.settings.deathSymbol)
				.onChange(async (value) => {
					this.plugin.settings.deathSymbol = value;
					await this.plugin.saveSettings();
				}));
	}
}
