import {App, Editor, MarkdownView, Modal, normalizePath, Notice, Plugin, TFile, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, StammbaumPluginSettings, StammbaumPluginSettingsTabs} from "./settings";
import { getRelevantMetadata } from 'metadata';
import { StammbaumView, VIEW_TYPE_STAMMBAUM } from 'stammbaumView';
// Remember to rename these classes and interfaces!

export default class StammbaumPlugin extends Plugin {
	settings!: StammbaumPluginSettings;
	tickButton!: HTMLElement;
	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'untick-all',
			name: 'Untick all ticking notes',
			callback: () => {
				this.app.vault.getMarkdownFiles().forEach(file => {
					if(this.settings.tickableFiles.contains(file.path)){ this.settings.tickedFiles = this.settings.tickedFiles.split('|').filter(f => f !== file.path).join('|');
					console.debug(`Unticked ${file.basename}`);}
				});
				this.saveData(this.settings).catch(e => {console.error(e)});
				this.updateTickButton(tickButton);
			}
		});
		this.addCommand({
			id: 'tick-this',
			name: 'Tick this file',
			editorCallback: () => {
				this.tickFile(this.app.workspace.getActiveFile());
				this.updateTickButton(tickButton);
			}
		});
		this.addCommand({
			id: 'open-unticked-files',
			name: 'Open all unticked files',
			callback: async () => {
				const untickedFiles = this.settings.tickableFiles.split('|').filter(file => {
					return !this.settings.tickedFiles.split('|').contains(file);
				}); // Filter out all files that were already ticked
				console.debug("Opening files: " + untickedFiles.map(file =>{return file}).join('|'));
				await this.app.workspace.getLeaf("split").setViewState({
					type: "base",
					active: true
				});
				for (const filepath of untickedFiles) {

					const leaf = this.app.workspace.getLeaf(true);

					if (!leaf) continue;
					await leaf.setViewState({
						type: "markdown",
						active: false
					});
					const file = this.app.vault.getFileByPath(normalizePath(filepath));
					if (!file) {
						console.error(`File at ${filepath} not found in vault.`);
						continue;
					}
					leaf.openFile(file).catch(e => {console.error(`Failed to open file ${file.basename}: ${e}`)});
					leaf.setGroup('unticked');
				}
			}
		})
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'add-to-tree',
			name: 'Add to tree',
			editorCallback: (editor: Editor) => {
				console.warn(this.app.workspace.getActiveFile());
				const currentFile = this.app.workspace.getActiveFile();
				if (!currentFile) {
					new Notice('No active file found.');
					return;
				}
				getRelevantMetadata(currentFile, this.app.vault,this.settings).then(metadata => {
					new Notice(`Parents: ${metadata?.parents.join(', ')}, Date of Birth: ${metadata?.dateOfBirth.dateString}, Date of Death: ${metadata?.dateOfDeath.dateString}`);
				}).catch(err => {
					console.error(err);
				});
			}
		});
		this.addCommand({
			id: 'remove-tickable',
			name: 'Make file untickable',
			editorCallback: (editor: Editor) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return;
				if(this.settings.tickableFiles.contains(file.path)){
					this.settings.tickedFiles = this.settings.tickedFiles.split('|').filter(f => f !== file.path).join('|');
					this.settings.tickableFiles = this.settings.tickableFiles.split('|').filter(f => f !== file.path).join('|');
					console.debug(`Removed ${file.basename}`);
					this.saveData(this.settings).catch(e => {console.error(e)});
					this.updateTickButton(this.tickButton);
			}}});
		this.addCommand({
			id: 'insert-random-name',
			name: 'Insert random name',

			editorCallback: async (editor: Editor) => {
				const namelist = this.app.vault.getFileByPath(`${normalizePath(this.settings.namelistLocation)}`);
				// Read from first-names.txt and replace selection with a random name
				const randomName = namelist ? await this.app.vault.read(namelist).then(data => {
					const names = data.split('\n');
					return names[Math.floor(Math.random() * names.length)];
				}
				).catch(err => {return console.error(err);}) : 'Error';
				editor.replaceSelection(String(randomName) || '');
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new StammbaumModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new StammbaumPluginSettingsTabs(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		this.registerView(
			VIEW_TYPE_STAMMBAUM,
			(leaf) => new StammbaumView(leaf, this)
		);
		this.addRibbonIcon('dice', 'Open stammbaum', async (evt: MouseEvent) => {
			// Called when the user  the icon.
			await this.openStammbaumView();
		});
		const tickButton = this.addStatusBarItem().createEl('p', {text:"Tick",cls:"tick-button"});
		tickButton.onclick = () => {
			const file =this.app.workspace.getActiveFile();
			if (!file) return;
			this.toggleTick(file);
			this.updateTickButton(tickButton)
		};
		this.tickButton=tickButton;
		this.app.workspace.on('active-leaf-change',(leaf: WorkspaceLeaf | null) => {this.updateTickButton(tickButton)});
		tickButton.toggleClass("ticked",this.settings.tickedFiles.contains('|'+this.app.workspace.getActiveFile()?.path || "false" +'|'));
	}
	updateTickButton(tickButton: HTMLElement){
		const isTicked = this.settings.tickedFiles.contains('|'+this.app.workspace.getActiveFile()?.path || "#" +'|');
		const isTickable = this.settings.tickableFiles.contains('|'+this.app.workspace.getActiveFile()?.path || "#" +'|');
		tickButton.toggleClass("ticked",isTicked);
		tickButton.toggleClass("untickable",!isTickable);
		if(isTicked) tickButton.textContent = "Untick";
		else tickButton.textContent = "Tick";
	}
	
	tickFile(file: TFile){
		if(!this.settings.tickedFiles.contains('|' + file.path + '|')) this.settings.tickedFiles = this.settings.tickedFiles.concat('|' + file.path + '|');
		if(!this.settings.tickableFiles.contains('|' + file.path + '|')) this.settings.tickableFiles = this.settings.tickableFiles.concat('|' + file.path + '|');
		console.debug(`Ticked ${file.basename}`);
		new Notice(`Ticked file ${file.basename}`,1000);
		this.saveData(this.settings).catch(e => {console.error(e)});
	}
	untickFile(file: TFile){
		this.settings.tickedFiles = this.settings.tickedFiles.split('|').filter(f => f !== file.path).join('|');
		console.debug(`Unticked ${file.basename}`);
		new Notice(`Unticked file ${file.basename}`,1000);
		this.saveData(this.settings).catch(e => {console.error(e)});
	}
	toggleTick(file: TFile | null){
		if(!(file instanceof TFile)) {console.error(`Could not tick file ${file}. Appears to not be a valid TFile object`);return;}
		if(!this.settings.tickedFiles.contains('|' + file.path + '|')) this.tickFile(file);
		else this.untickFile(file);

		// TODO
		}
	
	async openStammbaumView() {
		const {workspace} = this.app;
		let leaf: WorkspaceLeaf;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_STAMMBAUM);
		if (leaves.length > 0) { // get the first leaf, if none exists, create a new one
			if(leaves[0] instanceof WorkspaceLeaf) {
				leaf = leaves[0];
			}
			else {
				leaf = workspace.getLeaf(false);
				await leaf.setViewState({
					type: VIEW_TYPE_STAMMBAUM,
					active: true,
				});
			}
		}
		else {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_STAMMBAUM,
				active: true,
			});

		}
		await workspace.revealLeaf(leaf).catch(err => console.error(err));
	}
	onunload() {
		console.debug('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<StammbaumPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class StammbaumModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
