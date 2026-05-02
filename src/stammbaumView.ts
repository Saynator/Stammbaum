
import StammbaumPlugin from 'main';
import { getRelevantMetadata } from 'metadata';
import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
export const VIEW_TYPE_STAMMBAUM = 'stammbaum-view';
export class StammbaumView extends ItemView {
	plugin: StammbaumPlugin;
	constructor(leaf: WorkspaceLeaf, plugin: StammbaumPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return 'stammbaum-view';
	}
	getDisplayText() {
		return 'Stammbaum';
	}
	async onOpen() {
		const container = this.containerEl;
		container.empty();
		const stParent = container.createEl('div', { cls: 'stammbaum-parent' });

		const files = this.app.vault.getMarkdownFiles();
		const fileMetadata = await Promise.all(
			files.map(async (file) => {
				//if (!(file instanceof TFile)) {console.error("Tried to read non-file whilst gathering Stammbaum info");}
				const relevantMetadata = await getRelevantMetadata(file,this.app.vault,this.plugin.settings);
				if(!relevantMetadata) {
					console.debug(`No relevant metadata found for file ${file.path}`);
					return;
				}
				return {file, relevantMetadata};
			})
		);
		for (const fileMeta of fileMetadata) {
			const file = fileMeta?.file;
			const relevantMetadata = fileMeta?.relevantMetadata;
			if(!file || !relevantMetadata) {
				continue;
			}
			const stElement = stParent.createEl('div', { cls: 'stammbaum-element' });
			stElement.createEl('h3', { text: file.basename,cls: 'stammbaum-name' });
			stElement.createEl('p', { text: `Date of Birth: ${relevantMetadata.dateOfBirth}`,cls: 'stammbaum-date-of-birth' });
			stElement.createEl('p', { text: `Date of Death: ${relevantMetadata.dateOfDeath}`,cls: 'stammbaum-date-of-death' });
			if(relevantMetadata?.parents) {
				const stElParents = stElement.createEl('h4', { text: `Parents`,cls: 'stammbaum-parents' });
				relevantMetadata.parents.forEach(parent => {
					parent = parent.replace(/["\[\]]/g, '').trim();
					const parentFile = this.app.metadataCache.getFirstLinkpathDest(parent, '');
					
					if (parentFile) {
					const link = stElParents.createEl('a', {
						text: parent,
						cls: 'internal-link'
					});

					link.addEventListener('click', (evt) => {
						evt.preventDefault();
						void this.app.workspace.openLinkText(parent, '', false);
					});
					} else {
						stElParents.createEl('p',{text:parent});
					}
				});
			}
		}
	}
	async onClose() {}
}
