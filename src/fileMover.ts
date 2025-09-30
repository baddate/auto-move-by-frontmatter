import { App, TFile, TFolder, Notice, normalizePath } from "obsidian";

export class FileMover {
	constructor(private app: App) {}

	async moveFile(
		file: TFile,
		targetFolderPath: string,
		createIfNotExist = true
	): Promise<boolean> {
		try {
			// Normalize path
			targetFolderPath = normalizePath(targetFolderPath);

			// Check if target folder exists
			let targetFolder =
				this.app.vault.getAbstractFileByPath(targetFolderPath);

			if (!targetFolder) {
				if (createIfNotExist) {
					// Create folder
					await this.createFolder(targetFolderPath);
					targetFolder =
						this.app.vault.getAbstractFileByPath(targetFolderPath);

					if (!targetFolder) {
						console.error(
							`Failed to create folder: ${targetFolderPath}`
						);
						return false;
					}
				} else {
					console.error(
						`Target folder does not exist: ${targetFolderPath}`
					);
					new Notice(
						`Target folder does not exist: ${targetFolderPath}`
					);
					return false;
				}
			}

			// Ensure target is a folder
			if (!(targetFolder instanceof TFolder)) {
				console.error(`Target is not a folder: ${targetFolderPath}`);
				new Notice(`Target is not a folder: ${targetFolderPath}`);
				return false;
			}

			// Build new path
			const newPath = normalizePath(`${targetFolderPath}/${file.name}`);

			// Check if target file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(newPath);
			if (existingFile) {
				// If target file exists, generate new filename
				const newFileName = await this.getUniqueFileName(
					targetFolderPath,
					file.basename,
					file.extension
				);
				const uniquePath = normalizePath(
					`${targetFolderPath}/${newFileName}`
				);
				await this.app.fileManager.renameFile(file, uniquePath);
			} else {
				// Move file
				await this.app.fileManager.renameFile(file, newPath);
			}

			return true;
		} catch (error) {
			console.error("Error moving file:", error);
			new Notice(`Error moving file: ${error.message}`);
			return false;
		}
	}

	private async createFolder(folderPath: string): Promise<void> {
		const parts = folderPath.split("/").filter((p) => p.length > 0);
		let currentPath = "";

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const folder = this.app.vault.getAbstractFileByPath(currentPath);

			if (!folder) {
				await this.app.vault.createFolder(currentPath);
			} else if (!(folder instanceof TFolder)) {
				throw new Error(
					`Path exists but is not a folder: ${currentPath}`
				);
			}
		}
	}

	private async getUniqueFileName(
		folderPath: string,
		basename: string,
		extension: string
	): Promise<string> {
		let counter = 1;
		let newName = `${basename}.${extension}`;
		let newPath = normalizePath(`${folderPath}/${newName}`);

		while (this.app.vault.getAbstractFileByPath(newPath)) {
			newName = `${basename} ${counter}.${extension}`;
			newPath = normalizePath(`${folderPath}/${newName}`);
			counter++;
		}

		return newName;
	}

	async batchMoveFiles(
		files: TFile[],
		targetFolderPath: string,
		createIfNotExist = true
	): Promise<number> {
		let movedCount = 0;

		for (const file of files) {
			const success = await this.moveFile(
				file,
				targetFolderPath,
				createIfNotExist
			);
			if (success) {
				movedCount++;
			}
		}

		return movedCount;
	}

	getAvailableFolders(): string[] {
		const folders: string[] = ["/"];

		const allFiles = this.app.vault.getAllLoadedFiles();
		for (const file of allFiles) {
			if (file instanceof TFolder && file.path !== "/") {
				folders.push(file.path);
			}
		}

		return folders.sort();
	}

	validateFolderPath(path: string): boolean {
		// Check for invalid characters in path
		const invalidChars = ["<", ">", ":", '"', "|", "?", "*"];
		for (const char of invalidChars) {
			if (path.includes(char)) {
				return false;
			}
		}

		// Check if path starts with slash (except root directory)
		if (path.length > 1 && path.startsWith("/")) {
			return false;
		}

		return true;
	}
}
