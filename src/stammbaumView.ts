
import StammbaumPlugin from 'main';
import { getRelevantMetadata } from 'metadata';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Connector } from 'connector';

class StammbaumElement{
	name: string
	dateOfBirth: string
	dateOfDeath: string
	parents: string[]
	htmlElement?: HTMLElement;
	constructor(name: string, dateOfBirth: string, dateOfDeath: string) {
		this.name = name;
		this.dateOfBirth = dateOfBirth;
		this.dateOfDeath = dateOfDeath;
		this.parents = [];
	}
}

export const VIEW_TYPE_STAMMBAUM = 'stammbaum-view';
export class StammbaumView extends ItemView {
	plugin: StammbaumPlugin;
	stammbaumElements: StammbaumElement[] = [];
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
		stParent.style.position = 'relative';

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
			const stElement = new StammbaumElement(
				file.basename,
				relevantMetadata.dateOfBirth ?? '',
				relevantMetadata.dateOfDeath ?? ''
			);
			stElement.htmlElement = stParent.createEl('div', { cls: 'stammbaum-element' });
			stElement.htmlElement.createEl('h3', { text: file.basename,cls: 'stammbaum-name' });
			stElement.htmlElement.createEl('p', { text: `Date of Birth: ${relevantMetadata.dateOfBirth}`,cls: 'stammbaum-date-of-birth' });
			stElement.htmlElement.createEl('p', { text: `Date of Death: ${relevantMetadata.dateOfDeath}`,cls: 'stammbaum-date-of-death' });
			if(relevantMetadata?.parents) {
				const stElParents = stElement.htmlElement.createEl('h4', { text: `Parents`,cls: 'stammbaum-parents' });
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
						stElement.parents.push(parent); // Add the parent if it exists in the vault
					} else {
						stElParents.createEl('p',{text:parent});
					}
				});
			}
			this.stammbaumElements.push(stElement);
		}
		// After all elements are created, connect parents and children
		this.stammbaumElements.forEach(element => {
			this.stammbaumElements.forEach(potParent => {
				if (element.parents.includes(potParent.name)) {
					if (element.htmlElement && potParent.htmlElement) new Connector({ ele1: element.htmlElement, ele2: potParent.htmlElement, lineStyle: '2px solid #fff', containerElement: stParent });
					console.debug(`Connecting ${element.name} and ${potParent.name}`);
				}
			});
		});
	}
	async onClose() {}
}

function connectStammbaumElements(element1: HTMLElement, element2: HTMLElement) {
	const startRect = element1.getBoundingClientRect();
	const endRect = element2.getBoundingClientRect();
	
	// Calculate center points of each element
	const startX = startRect.left + startRect.width / 2 + window.scrollX;
	const startY = startRect.top + startRect.height / 2 + window.scrollY;
	const endX = endRect.left + endRect.width / 2 + window.scrollX;
	const endY = endRect.top + endRect.height / 2 + window.scrollY;
	const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('x1', startX.toString());
	line.setAttribute('y1', startY.toString());
	line.setAttribute('x2', endX.toString());
	line.setAttribute('y2', endY.toString());
	line.setAttribute('stroke', 'green');
	line.setAttribute('stroke-width', '2');
	document.body.appendChild(line);
}