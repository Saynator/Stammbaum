
import StammbaumPlugin from 'main';
import { getRelevantMetadata } from 'metadata';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Connector } from 'connector';
import { customDate } from 'customDate';
import { StammbaumPluginSettings } from 'settings';

export class StammbaumElement{
	name: string
	dateOfBirth: customDate
	dateOfDeath: customDate
	parents: string[]
	htmlElement?: HTMLElement;
	connectors: Connector[] = [];
	hierarchyLevel?: number;
	constructor(name: string, dateOfBirth: string | customDate, dateOfDeath: string | customDate, settings: StammbaumPluginSettings) {
		this.name = name;
		this.dateOfBirth = dateOfBirth instanceof customDate ? dateOfBirth : new customDate(dateOfBirth,settings);
		this.dateOfDeath = dateOfDeath instanceof customDate ? dateOfDeath : new customDate(dateOfDeath,settings);
		this.parents = [];
		this.hierarchyLevel = 0;
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
		fileMetadata.filter((data => data != undefined));
		fileMetadata.sort((a, b) => { // Sort by date of birth
			if (!a || !b) return 0;
			const dateA = a.relevantMetadata?.dateOfBirth ? a.relevantMetadata.dateOfBirth: new customDate(0,this.plugin.settings);
			const dateB = b.relevantMetadata?.dateOfBirth ? b.relevantMetadata.dateOfBirth: new customDate(0,this.plugin.settings);
			return dateA.getValue() < dateB.getValue() ? -1 : dateA.getValue() > dateB.getValue() ? 1 : 0;
		});
		const oldest = fileMetadata[0] ? fileMetadata[0].relevantMetadata.dateOfBirth.getValue() : 0;
		const youngest = fileMetadata[fileMetadata.length-1] ? fileMetadata[fileMetadata.length - 1].relevantMetadata.dateOfBirth.getValue() : 0;
		let col = 0;
		for (const fileMeta of fileMetadata) {
			const file = fileMeta?.file;
			const relevantMetadata = fileMeta?.relevantMetadata;
			if(!file || !relevantMetadata) {
				continue;
			}
			const stElement = new StammbaumElement(
				file.basename,
				relevantMetadata.dateOfBirth ?? new customDate(0,this.plugin.settings),
				relevantMetadata.dateOfDeath ?? new customDate(0,this.plugin.settings),
				this.plugin.settings
			);

			//Calculate row
			const row = youngest && oldest && youngest != oldest ? (stElement.dateOfBirth.getValue() - youngest)/(oldest-youngest): 0.5;

			stElement.htmlElement = stParent.createEl('div', { cls: 'stammbaum-element' });
			stElement.htmlElement.setCssProps({
				position: 'absolute',
				left: `${1.1*col}px`,
				top: `${/*Number(stParent.getBoundingClientRect().height/row) * */ 100+row+/*stElement.htmlElement.getBoundingClientRect().height/2*/ + 10}px`,
				'touch-action': 'none'
			});
			
			stElement.htmlElement.createEl('h3', { text: file.basename, cls: 'stammbaum-name' }).addEventListener('click', (evt) => {
				evt.preventDefault();
				void this.app.workspace.openLinkText(file.basename, '', false);
			});
			stElement.htmlElement.createEl('p', { text: `${this.plugin.settings.birthSymbol} ${relevantMetadata.dateOfBirth}`,cls: 'stammbaum-date-of-birth' });
			stElement.htmlElement.createEl('p', { text: `${this.plugin.settings.deathSymbol} ${relevantMetadata.dateOfDeath}`,cls: 'stammbaum-date-of-death' });
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
			
			stElement.htmlElement.addEventListener('pointerdown', (ev) => {
				if (!stElement.htmlElement) return;
				ev.preventDefault();
				const element = stElement.htmlElement;
				const startRect = element.getBoundingClientRect();
				const offsetX = ev.clientX - startRect.left;
				const offsetY = ev.clientY - startRect.top;
				element.classList.add('dragging');

				const moveHandler = (moveEvent: PointerEvent) => {
					const parentRect = stParent.getBoundingClientRect();
					element.style.left = `${moveEvent.clientX - offsetX + stParent.scrollLeft - parentRect.left}px`;
					element.style.top = `${moveEvent.clientY - offsetY +stParent.scrollTop - parentRect.top}px`;
					stElement.connectors.forEach(connector => {
						connector.moved();
					});
				};

				const upHandler = () => {
					element.classList.remove('dragging');
					document.removeEventListener('pointermove', moveHandler);
					document.removeEventListener('pointerup', upHandler);
				};

				document.addEventListener('pointermove', moveHandler);
				document.addEventListener('pointerup', upHandler, { once: true });
			});
			col+=stElement.htmlElement?.getBoundingClientRect().width || 0;
		}
		// After all elements are created, connect parents and children
		this.stammbaumElements.forEach(element => {
			this.stammbaumElements.forEach(potParent => {
				if (element.parents.includes(potParent.name)) {
					if (element.htmlElement && potParent.htmlElement) {
						const connector = new Connector({ child: element.htmlElement, parent: potParent.htmlElement, lineStyle: '2px solid #fff', containerElement: stParent });
						element.connectors.push(connector);
						potParent.connectors.push(connector);
					}
					console.debug(`Connecting ${element.name} and ${potParent.name}`);
				}
			});
		});
	}
	async onClose() {}
}
