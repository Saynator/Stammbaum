import {App, Editor, MarkdownView, Modal, normalizePath, Notice, Plugin, WorkspaceLeaf} from 'obsidian';
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
					new Notice(`Parents: ${metadata?.parents.join(', ')}, Date of Birth: ${metadata?.dateOfBirth}, Date of Death: ${metadata?.dateOfDeath}`);
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
