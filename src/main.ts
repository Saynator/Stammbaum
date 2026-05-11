import {App, Editor, MarkdownEditView, MarkdownView, Modal, normalizePath, Notice, Plugin, TFile, WorkspaceLeaf, WorkspaceSplit, WorkspaceTabs} from 'obsidian';
import {DEFAULT_SETTINGS, StammbaumPluginSettings, StammbaumPluginSettingsTabs} from "./settings";
import { getRelevantMetadata } from 'metadata';
import { StammbaumView, VIEW_TYPE_STAMMBAUM } from 'stammbaumView';
// Remember to rename these classes and interfaces!

export default class StammbaumPlugin extends Plugin {
	settings!: StammbaumPluginSettings;
	
	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new StammbaumModal(this.app).open();
			}
		});
		this.addCommand({
			id: 'untick-all',
			name: 'Untick all ticking notes',
			callback: () => {
				this.app.vault.getMarkdownFiles().forEach(file => {
					if(this.settings.tickableFiles.contains(file)){ this.settings.tickedFiles.remove(file);
					console.debug(`Unticked ${file.basename}`);}
				});
				this.saveData(this.settings).catch(e => {console.error(e)});
			}
		});
		this.addCommand({
			id: 'tick-this',
			name: 'Tick this file',
			callback: () => {
				this.tickFile(this.app.workspace.getActiveFile());
			}
		});
		this.addCommand({
			id: 'open-unticked-files',
			name: 'Open all unticked files',
			callback: async () => {
				const untickedFiles = this.settings.tickableFiles.filter(file => {
					return !this.settings.tickedFiles.contains(file);
				}); // Filter out all files that were already ticked
				console.debug("Opening files: " + untickedFiles.map(file =>{return file.basename}).join(','));
				await this.app.workspace.getLeaf("split").setViewState({
					type: "base",
					active: true
				});
				for (const file of untickedFiles) {

					const leaf = this.app.workspace.getLeaf(true);

					if (!leaf) continue;
					await leaf.setViewState({
						type: "markdown",
						active: false
					});
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

	}
	tickFile(file: TFile | null){
		if(!(file instanceof TFile)) {console.error(`Could not tick file ${file}. Appears to not be a valid TFile object`);return;}
		this.settings.tickedFiles.push(file);
		if(!this.settings.tickableFiles.contains(file)) this.settings.tickableFiles.push(file);
		console.debug(file);
		this.saveData(this.settings).catch(e => {console.error(e)});
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
