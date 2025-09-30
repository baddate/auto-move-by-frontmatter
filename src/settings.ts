import {
	App,
	PluginSettingTab,
	Setting,
	TextComponent,
	TFolder,
} from "obsidian";
import AutoMovePlugin from "./main";
import { FolderSuggestModal } from "fileSuggester";

export type MatchType = "exact" | "contains" | "regex";
export type LogicOperator = "AND" | "OR";

export interface FieldCondition {
	id: string;
	field: string;
	value: string;
	matchType: MatchType;
}

export interface MoveRule {
	id: string;
	enabled: boolean;
	conditions: FieldCondition[];
	logicOperator: LogicOperator;
	targetFolder: string;
	createFolderIfNotExist: boolean;
}

export interface AutoMoveSettings {
	enabled: boolean;
	rules: MoveRule[];
	triggerOnSave: boolean;
	triggerOnSwitch: boolean;
	triggerOnInterval: boolean;
	intervalMinutes: number;
}

export const DEFAULT_SETTINGS: AutoMoveSettings = {
	enabled: true,
	rules: [],
	triggerOnSave: true,
	triggerOnSwitch: false,
	triggerOnInterval: false,
	intervalMinutes: 30,
};

export class AutoMoveSettingTab extends PluginSettingTab {
	plugin: AutoMovePlugin;

	constructor(app: App, plugin: AutoMovePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Auto Move Settings" });

		this.renderGlobalSettings(containerEl);
		this.renderTriggerSettings(containerEl);
		this.renderRulesSection(containerEl);
		this.renderUsageInstructions(containerEl);
	}

	private renderGlobalSettings(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Enable auto move")
			.setDesc("Toggle automatic file moving based on frontmatter")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderTriggerSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "Trigger Conditions" });

		new Setting(containerEl)
			.setName("Trigger on save")
			.setDesc("Move files automatically when they are saved")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.triggerOnSave)
					.onChange(async (value) => {
						this.plugin.settings.triggerOnSave = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Trigger on file switch")
			.setDesc("Move files when switching between files")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.triggerOnSwitch)
					.onChange(async (value) => {
						this.plugin.settings.triggerOnSwitch = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Trigger on interval")
			.setDesc("Scan and move files periodically")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.triggerOnInterval)
					.onChange(async (value) => {
						this.plugin.settings.triggerOnInterval = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Interval (minutes)")
			.setDesc("How often to scan files when interval trigger is enabled")
			.addText((text) =>
				text
					.setPlaceholder("30")
					.setValue(String(this.plugin.settings.intervalMinutes))
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.intervalMinutes = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}

	private renderRulesSection(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "Move Rules" });

		const rulesContainer = containerEl.createDiv("rules-container");
		this.displayRules(rulesContainer);

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText("Add Rule")
				.setCta()
				.onClick(async () => {
					const newRule: MoveRule = {
						id: Date.now().toString(),
						enabled: true,
						conditions: [
							{
								id: Date.now().toString(),
								field: "",
								value: "",
								matchType: "exact",
							},
						],
						logicOperator: "AND",
						targetFolder: "",
						createFolderIfNotExist: true,
					};
					this.plugin.settings.rules.push(newRule);
					await this.plugin.saveSettings();
					this.display();
				})
		);
	}

	private displayRules(container: HTMLElement): void {
		container.empty();

		this.plugin.settings.rules.forEach((rule, index) => {
			const ruleContainer = container.createDiv("rule-container");
			ruleContainer.style.border =
				"1px solid var(--background-modifier-border)";
			ruleContainer.style.padding = "10px";
			ruleContainer.style.marginBottom = "10px";
			ruleContainer.style.borderRadius = "5px";

			this.renderRuleHeader(ruleContainer, rule, index);
			this.renderConditions(ruleContainer, rule);
			this.renderLogicOperator(ruleContainer, rule);
			this.renderAddConditionButton(ruleContainer, rule);
			this.renderTargetFolder(ruleContainer, rule);
			this.renderCreateFolderOption(ruleContainer, rule);
		});
	}

	private renderRuleHeader(
		container: HTMLElement,
		rule: MoveRule,
		index: number
	): void {
		new Setting(container)
			.setName(`Rule ${index + 1}`)
			.addToggle((toggle) =>
				toggle.setValue(rule.enabled).onChange(async (value) => {
					rule.enabled = value;
					await this.plugin.saveSettings();
				})
			)
			.addButton((button) =>
				button
					.setButtonText("Delete")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.rules.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}

	private renderConditions(container: HTMLElement, rule: MoveRule): void {
		const conditionsContainer = container.createDiv("conditions-container");
		conditionsContainer.style.marginLeft = "20px";
		conditionsContainer.style.marginTop = "10px";
		conditionsContainer.style.marginBottom = "10px";

		rule.conditions.forEach((condition, condIndex) => {
			const conditionContainer =
				conditionsContainer.createDiv("condition-item");
			conditionContainer.style.padding = "8px";
			conditionContainer.style.marginBottom = "8px";
			conditionContainer.style.border =
				"1px dashed var(--background-modifier-border)";
			conditionContainer.style.borderRadius = "3px";

			const headerDiv = conditionContainer.createDiv();
			headerDiv.style.display = "flex";
			headerDiv.style.justifyContent = "space-between";
			headerDiv.style.alignItems = "center";
			headerDiv.style.marginBottom = "8px";

			headerDiv.createEl("strong", {
				text: `Condition ${condIndex + 1}`,
			});

			if (rule.conditions.length > 1) {
				const deleteBtn = headerDiv.createEl("button", {
					text: "Remove",
					cls: "mod-warning",
				});
				deleteBtn.style.fontSize = "12px";
				deleteBtn.style.padding = "2px 8px";
				deleteBtn.onclick = async () => {
					rule.conditions.splice(condIndex, 1);
					await this.plugin.saveSettings();
					this.display();
				};
			}

			new Setting(conditionContainer)
				.setName("Field")
				.setDesc("Frontmatter field name (e.g., type, status)")
				.addText((text) =>
					text
						.setPlaceholder("type")
						.setValue(condition.field)
						.onChange(async (value) => {
							condition.field = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(conditionContainer)
				.setName("Match type")
				.addDropdown((dropdown) =>
					dropdown
						.addOption("exact", "Exact match")
						.addOption("contains", "Contains")
						.addOption("regex", "Regular expression")
						.setValue(condition.matchType)
						.onChange(async (value: MatchType) => {
							condition.matchType = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(conditionContainer)
				.setName("Value")
				.setDesc("The value to match against")
				.addText((text) =>
					text
						.setPlaceholder("daily")
						.setValue(condition.value)
						.onChange(async (value) => {
							condition.value = value;
							await this.plugin.saveSettings();
						})
				);
		});
	}

	private renderLogicOperator(container: HTMLElement, rule: MoveRule): void {
		if (rule.conditions.length > 1) {
			new Setting(container)
				.setName("Logic operator")
				.setDesc(
					"AND: All conditions must match | OR: Any condition must match"
				)
				.addDropdown((dropdown) =>
					dropdown
						.addOption("AND", "AND (all must match)")
						.addOption("OR", "OR (any must match)")
						.setValue(rule.logicOperator)
						.onChange(async (value: LogicOperator) => {
							rule.logicOperator = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}

	private renderAddConditionButton(
		container: HTMLElement,
		rule: MoveRule
	): void {
		new Setting(container).addButton((button) =>
			button.setButtonText("Add Condition").onClick(async () => {
				const newCondition: FieldCondition = {
					id: Date.now().toString(),
					field: "",
					value: "",
					matchType: "exact",
				};
				rule.conditions.push(newCondition);
				await this.plugin.saveSettings();
				this.display();
			})
		);
	}

	private renderTargetFolder(container: HTMLElement, rule: MoveRule): void {
		new Setting(container)
			.setName("Target folder")
			.setDesc("The folder to move matching files to")
			.addText((text) => {
				const textComponent = text
					.setPlaceholder("Daily Notes")
					.setValue(rule.targetFolder)
					.onChange(async (value) => {
						rule.targetFolder = value;
						await this.plugin.saveSettings();
					});

				const inputEl = textComponent.inputEl;
				let suggestionContainer: HTMLElement | null = null;
				let repositionHandler: (() => void) | null = null;

				const getMatchingFolders = (): string[] => {
					const q = inputEl.value.trim().toLowerCase();
					return this.app.vault
						.getAllLoadedFiles()
						.filter((f) => f instanceof TFolder)
						.map((f) => f.path)
						.filter((p) => p.toLowerCase().includes(q))
						.slice(0, 20);
				};

				const createSuggestionBox = () => {
					if (!suggestionContainer) {
						suggestionContainer = document.createElement("div");
						suggestionContainer.className =
							"folder-suggestion-container";
						suggestionContainer.style.position = "absolute";
						suggestionContainer.style.display = "none";
						suggestionContainer.style.zIndex = "1000";
						suggestionContainer.style.backgroundColor =
							"var(--background-primary)";
						suggestionContainer.style.border =
							"1px solid var(--background-modifier-border)";
						suggestionContainer.style.borderRadius = "4px";
						suggestionContainer.style.maxHeight = "200px";
						suggestionContainer.style.overflowY = "auto";
						document.body.appendChild(suggestionContainer);

						repositionHandler = () => {
							if (!suggestionContainer) return;
							const rect = inputEl.getBoundingClientRect();
							suggestionContainer.style.left = `${
								rect.left + window.scrollX
							}px`;
							suggestionContainer.style.top = `${
								rect.bottom + window.scrollY
							}px`;
							suggestionContainer.style.width = `${rect.width}px`;
						};

						window.addEventListener(
							"scroll",
							repositionHandler,
							true
						);
						window.addEventListener("resize", repositionHandler);
					}
				};

				const destroySuggestionBox = () => {
					if (suggestionContainer) {
						suggestionContainer.remove();
						suggestionContainer = null;
					}
					if (repositionHandler) {
						window.removeEventListener(
							"scroll",
							repositionHandler,
							true
						);
						window.removeEventListener("resize", repositionHandler);
						repositionHandler = null;
					}
				};

				const updateSuggestions = () => {
					createSuggestionBox();
					if (!suggestionContainer) return;

					const folders = getMatchingFolders();
					suggestionContainer.innerHTML = "";

					if (folders.length === 0) {
						suggestionContainer.style.display = "none";
						return;
					}

					folders.forEach((folder) => {
						const item = document.createElement("div");
						item.className = "folder-suggestion-item";
						item.textContent = folder;
						item.style.padding = "8px";
						item.style.cursor = "pointer";

						item.addEventListener("mouseenter", () => {
							item.style.backgroundColor =
								"var(--background-modifier-hover)";
						});
						item.addEventListener("mouseleave", () => {
							item.style.backgroundColor = "";
						});

						item.addEventListener("pointerdown", async (evt) => {
							evt.preventDefault();
							evt.stopPropagation();
							textComponent.setValue(folder);
							rule.targetFolder = folder;
							await this.plugin.saveSettings();
							destroySuggestionBox();
							inputEl.focus();
						});

						if (!suggestionContainer) return;
						suggestionContainer.appendChild(item);
					});

					suggestionContainer.style.display = "block";
					if (repositionHandler) repositionHandler();
				};

				inputEl.addEventListener("focus", () => {
					updateSuggestions();
				});

				inputEl.addEventListener("input", () => {
					updateSuggestions();
				});

				inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Escape") {
						destroySuggestionBox();
						inputEl.blur();
					}
				});

				inputEl.addEventListener("blur", () => {
					setTimeout(() => {
						destroySuggestionBox();
					}, 150);
				});

				inputEl.style.width = "70%";
				if (!inputEl.parentElement) return;
				const browseButton = inputEl.parentElement.createEl("button", {
					text: "Browse",
					cls: "mod-cta",
				});
				browseButton.style.marginLeft = "5px";
				browseButton.onclick = () => {
					this.showFolderSuggestions(textComponent);
				};

				return textComponent;
			});
	}

	private renderCreateFolderOption(
		container: HTMLElement,
		rule: MoveRule
	): void {
		new Setting(container)
			.setName("Create folder if not exists")
			.setDesc(
				"Automatically create the target folder if it doesn't exist"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(rule.createFolderIfNotExist)
					.onChange(async (value) => {
						rule.createFolderIfNotExist = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderUsageInstructions(containerEl: HTMLElement): void {
		containerEl.createEl("h3", { text: "Usage Instructions" });
		const instructionsEl = containerEl.createEl("div", {
			cls: "setting-item-description",
		});
		instructionsEl.createEl("p", {
			text: "Configure rules to automatically move notes based on their frontmatter fields.",
		});
		instructionsEl.createEl("p", {
			text: "Each rule can have multiple conditions. Use AND logic to require all conditions, or OR logic to match any condition.",
		});
		instructionsEl.createEl("p", {
			text: 'Example: Add two conditions - field "type" equals "daily" AND field "status" equals "active" to move notes matching both criteria.',
		});
		instructionsEl.createEl("p", { text: "Supported match types:" });
		const list = instructionsEl.createEl("ul");
		list.createEl("li", {
			text: "Exact: Field value must exactly match the rule value",
		});
		list.createEl("li", {
			text: "Contains: Field value must contain the rule value",
		});
		list.createEl("li", {
			text: "Regex: Field value must match the regular expression",
		});
	}

	private showFolderSuggestions(textComponent: TextComponent): void {
		const folders = this.app.vault
			.getAllLoadedFiles()
			.filter((f) => f instanceof TFolder)
			.map((f) => f.path)
			.filter((p) => p !== "")
			.sort();

		const modal = new FolderSuggestModal(this.app, folders, (folder) => {
			textComponent.setValue(folder);
			textComponent.onChanged();
		});
		modal.open();
	}
}
