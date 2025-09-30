import { App, FuzzySuggestModal } from "obsidian";

export class FolderSuggestModal extends FuzzySuggestModal<string> {
	private onSelect: (folder: string) => void;

	constructor(
		app: App,
		private folders: string[],
		onSelect: (folder: string) => void
	) {
		super(app);
		this.onSelect = onSelect;
	}

	getItems(): string[] {
		return this.folders;
	}

	getItemText(folder: string): string {
		return folder || "/";
	}

	onChooseItem(folder: string, evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(folder);
	}
}
