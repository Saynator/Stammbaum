
import StammbaumPlugin from 'main';
import { getRelevantMetadata } from 'metadata';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Connector } from 'connector';
import { customDate } from 'customDate';

export class StammbaumElement{
	name: string
	dateOfBirth: customDate
	dateOfDeath: customDate
	parents: string[]
	htmlElement?: HTMLElement;
	connectors: Connector[] = [];
	constructor(name: string, dateOfBirth: string | customDate, dateOfDeath: string | customDate) {
		this.name = name;
		this.dateOfBirth = dateOfBirth instanceof customDate ? dateOfBirth : new customDate(dateOfBirth);
		this.dateOfDeath = dateOfDeath instanceof customDate ? dateOfDeath : new customDate(dateOfDeath);
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
		fileMetadata.sort((a, b) => { // Sort by date of birth
			if (!a || !b) return 0;
			const dateA = a.relevantMetadata?.dateOfBirth ? a.relevantMetadata.dateOfBirth: new customDate(0);
			const dateB = b.relevantMetadata?.dateOfBirth ? b.relevantMetadata.dateOfBirth: new customDate(0);
			return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
		});
		const oldest = fileMetadata[0] ? fileMetadata[0].relevantMetadata.dateOfBirth : new customDate(0);
		const youngest = fileMetadata[-1] ? fileMetadata[-1].relevantMetadata.dateOfBirth : new customDate(0);
		let col = 0;
		for (const fileMeta of fileMetadata) {
			const file = fileMeta?.file;
			const relevantMetadata = fileMeta?.relevantMetadata;
			if(!file || !relevantMetadata) {
				continue;
			}
			const stElement = new StammbaumElement(
				file.basename,
				relevantMetadata.dateOfBirth ?? new customDate(0),
				relevantMetadata.dateOfDeath ?? new customDate(0)
			);

			//Calculate row
			
			const row = youngest && oldest ? (stElement.dateOfBirth + youngest)/oldest: 0.5;

			stElement.htmlElement = stParent.createEl('div', { cls: 'stammbaum-element' });
			stElement.htmlElement.style.position = 'absolute';
			stElement.htmlElement.style.left = `${40 * 220 + col}px`;
			stElement.htmlElement.style.top = `${40 + Number(stParent.getBoundingClientRect().height/row) * 140}px`;
			stElement.htmlElement.style.touchAction = 'none';
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
						const connector = new Connector({ ele1: element.htmlElement, ele2: potParent.htmlElement, lineStyle: '2px solid #fff', containerElement: stParent });
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
