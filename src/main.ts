import { Plugin, TFile, Notice, MarkdownView, debounce } from "obsidian";
import {
	AutoMoveSettings,
	DEFAULT_SETTINGS,
	AutoMoveSettingTab,
	MoveRule,
	FieldCondition,
	MatchType,
} from "./settings";
import { FileMover } from "./fileMover";
import { FrontmatterParser } from "./frontmatterParser";

export default class AutoMovePlugin extends Plugin {
	settings: AutoMoveSettings;
	fileMover: FileMover;
	frontmatterParser: FrontmatterParser;
	private autoMoveDebounced: (file: TFile) => void;
	private intervalId: number | null = null;

	async onload() {
		await this.loadSettings();

		this.fileMover = new FileMover(this.app);
		this.frontmatterParser = new FrontmatterParser();

		this.autoMoveDebounced = debounce(
			(file: TFile) => this.autoMoveFile(file),
			500
		);

		this.addSettingTab(new AutoMoveSettingTab(this.app, this));
		this.registerCommands();
		this.registerEventListeners();
		this.setupInterval();
	}

	private registerCommands(): void {
		this.addCommand({
			id: "move-current-file",
			name: "Move current file based on frontmatter",
			callback: () => this.moveCurrentFile(),
		});

		this.addCommand({
			id: "scan-all-files",
			name: "Scan and move all files",
			callback: () => this.scanAllFiles(),
		});
	}

	private registerEventListeners(): void {
		if (this.settings.triggerOnSave) {
			this.registerEvent(
				this.app.vault.on("modify", (file) => {
					if (file instanceof TFile && file.extension === "md") {
						this.autoMoveDebounced(file);
					}
				})
			);
		}

		if (this.settings.triggerOnSwitch) {
			this.registerEvent(
				this.app.workspace.on("file-open", (file) => {
					if (file instanceof TFile && file.extension === "md") {
						setTimeout(() => {
							this.autoMoveFile(file);
						}, 100);
					}
				})
			);
		}

		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				if (this.settings.triggerOnInterval && !this.intervalId) {
					this.setupInterval();
				}
			})
		);
	}

	private setupInterval(): void {
		if (this.intervalId) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (
			this.settings.triggerOnInterval &&
			this.settings.intervalMinutes > 0
		) {
			const intervalMs = this.settings.intervalMinutes * 60 * 1000;
			this.intervalId = window.setInterval(() => {
				this.scanAllFiles();
			}, intervalMs);
		}
	}

	private async moveCurrentFile(): Promise<void> {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("No active markdown file");
			return;
		}

		const file = activeView.file;
		if (!file) {
			new Notice("No file found");
			return;
		}

		const moved = await this.autoMoveFile(file);
		if (moved) {
			new Notice(`File moved successfully`);
		} else {
			new Notice(
				"File not moved (no matching rules or already in correct folder)"
			);
		}
	}

	private async scanAllFiles(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		let movedCount = 0;

		new Notice(`Scanning ${files.length} files...`);

		for (const file of files) {
			const moved = await this.autoMoveFile(file, true);
			if (moved) {
				movedCount++;
			}
		}

		new Notice(`Scan complete: ${movedCount} files moved`);
	}

	private async autoMoveFile(file: TFile, silent = false): Promise<boolean> {
		if (!this.settings.enabled || this.settings.rules.length === 0) {
			return false;
		}

		try {
			const content = await this.app.vault.read(file);
			const frontmatter = this.frontmatterParser.parse(content);

			if (!frontmatter) {
				return false;
			}

			for (const rule of this.settings.rules) {
				if (!rule.enabled) continue;

				if (this.evaluateRule(rule, frontmatter)) {
					const targetFolder = rule.targetFolder.replace(/\/$/, "");
					const currentFolder = file.parent?.path || "";

					if (currentFolder === targetFolder) {
						return false;
					}

					const moved = await this.fileMover.moveFile(
						file,
						targetFolder,
						rule.createFolderIfNotExist
					);

					if (moved && !silent) {
						new Notice(
							`Moved "${file.basename}" to "${targetFolder}"`
						);
					}

					return moved;
				}
			}
		} catch (error: unknown) {
			console.error("Error processing file:", error);
			if (!silent) {
				const message =
					error instanceof Error ? error.message : String(error);
				new Notice(`Error processing file: ${message}`);
			}
		}

		return false;
	}

	private evaluateRule(
		rule: MoveRule,
		frontmatter: Record<string, unknown>
	): boolean {
		if (rule.conditions.length === 0) {
			return false;
		}

		const results = rule.conditions.map((condition) =>
			this.evaluateCondition(condition, frontmatter)
		);

		return rule.logicOperator === "AND"
			? results.every((r) => r)
			: results.some((r) => r);
	}

	private evaluateCondition(
		condition: FieldCondition,
		frontmatter: Record<string, unknown>
	): boolean {
		const fieldValue = this.frontmatterParser.getFieldValue(
			frontmatter,
			condition.field
		);

		if (fieldValue === null || fieldValue === undefined) {
			return false;
		}

		return this.matchesValue(
			fieldValue,
			condition.value,
			condition.matchType
		);
	}

	private matchesValue(
		fieldValue: unknown,
		ruleValue: string,
		matchType: MatchType
	): boolean {
		const fieldStr = String(fieldValue).toLowerCase();
		const ruleStr = ruleValue.toLowerCase();

		switch (matchType) {
			case "exact":
				return fieldStr === ruleStr;
			case "contains":
				return fieldStr.includes(ruleStr);
			case "regex":
				try {
					const regex = new RegExp(ruleValue, "i");
					return regex.test(String(fieldValue));
				} catch {
					return false;
				}
			default:
				return false;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		this.migrateSettings();
	}

	private migrateSettings(): void {
		let needsSave = false;

		for (const rule of this.settings.rules) {
			// Migrate old single-field format to new multi-condition format
			if (!rule.conditions && "field" in rule && "value" in rule) {
				const legacyRule = rule as unknown as {
					field: string;
					value: string;
					matchType: MatchType;
				};
				rule.conditions = [
					{
						id: Date.now().toString(),
						field: legacyRule.field || "",
						value: legacyRule.value || "",
						matchType: legacyRule.matchType || "exact",
					},
				];
				rule.logicOperator = "AND";
				needsSave = true;
			}

			// Ensure conditions array exists
			if (!rule.conditions) {
				rule.conditions = [];
				needsSave = true;
			}

			// Ensure logicOperator exists
			if (!rule.logicOperator) {
				rule.logicOperator = "AND";
				needsSave = true;
			}
		}

		if (needsSave) {
			this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.setupInterval();
	}

	onunload() {
		if (this.intervalId) {
			window.clearInterval(this.intervalId);
		}
	}
}
