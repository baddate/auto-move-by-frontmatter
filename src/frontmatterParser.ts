import { parseYaml } from "obsidian";

type Frontmatter = Record<string, unknown>;

export class FrontmatterParser {
	/**
	 * Parse frontmatter from file content.
	 */
	parse(content: string): Frontmatter | null {
		// Support both LF and CRLF
		const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
		const match = content.match(frontmatterRegex);

		if (!match || !match[1]) {
			return null;
		}

		try {
			const parsed = parseYaml(match[1]) as unknown;
			if (this.isRecord(parsed)) {
				return parsed;
			}
			// if YAML parsed to non-object, treat as no frontmatter
			return null;
		} catch (error: unknown) {
			console.error("Error parsing frontmatter:", error);
			return null;
		}
	}

	/**
	 * Get a field value from frontmatter. Supports nested paths like "parent.child[0].field".
	 */
	getFieldValue(
		frontmatter: Frontmatter | null,
		fieldPath: string
	): unknown | null {
		if (!frontmatter || !fieldPath) {
			return null;
		}

		const parts = fieldPath.split(".");
		let current: unknown = frontmatter;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return null;
			}

			// Handle array index like field[0]
			const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
			if (arrayMatch) {
				const fieldName = arrayMatch[1];
				const index = parseInt(arrayMatch[2], 10);

				if (!this.isRecord(current)) return null;
				current = current[fieldName];
				if (Array.isArray(current)) {
					if (index < current.length) {
						current = current[index];
					} else {
						return null;
					}
				} else {
					return null;
				}
			} else {
				if (!this.isRecord(current)) return null;
				current = current[part];
			}
		}

		return current === undefined ? null : current;
	}

	/**
	 * Set a field value in frontmatter and return updated content.
	 * Note: this implementation creates nested objects if necessary.
	 * It does not support assigning to array indices (e.g. "arr[0]") during set.
	 */
	setFieldValue(content: string, fieldPath: string, value: unknown): string {
		// Support both LF and CRLF
		const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
		const match = content.match(frontmatterRegex);

		let frontmatter: Frontmatter = {};
		let restContent = content;

		if (match && match[1]) {
			try {
				const parsed = parseYaml(match[1]) as unknown;
				if (this.isRecord(parsed)) {
					frontmatter = parsed;
				} else {
					frontmatter = {};
				}
				restContent = content.substring(match[0].length);
			} catch (error: unknown) {
				console.error("Error parsing frontmatter:", error);
				// If parsing fails, keep original content unchanged
				return content;
			}
		} else {
			restContent = content;
		}

		// Create nested objects as needed (does not create arrays)
		const parts = fieldPath.split(".");
		let current: unknown = frontmatter;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!this.isRecord(current)) {
				// If current is not an object, replace it with an object
				current = {};
			}
			const curRecord = current as Frontmatter;
			if (
				!(part in curRecord) ||
				typeof curRecord[part] !== "object" ||
				curRecord[part] === null
			) {
				// Create object if missing or not an object
				curRecord[part] = {};
			}
			current = curRecord[part];
		}

		const lastKey = parts[parts.length - 1];
		if (!this.isRecord(current)) {
			// Fallback: if current is not object, reassign to root
			(frontmatter as Frontmatter)[lastKey] = value;
		} else {
			(current as Frontmatter)[lastKey] = value;
		}

		const yamlStr = this.stringifyYaml(frontmatter);
		return `---\n${yamlStr}---\n${restContent}`;
	}

	/**
	 * Convert object to YAML string (simple serializer).
	 */
	private stringifyYaml(obj: Frontmatter): string {
		const lines: string[] = [];
		this.stringifyYamlRecursive(obj, lines, 0);
		return lines.join("\n") + "\n";
	}

	private stringifyYamlRecursive(
		obj: unknown,
		lines: string[],
		indent: number
	): void {
		if (!this.isRecord(obj)) return;
		const indentStr = "  ".repeat(indent);

		for (const [key, value] of Object.entries(obj)) {
			if (value === null || value === undefined) {
				lines.push(`${indentStr}${key}: `);
			} else if (this.isRecord(value)) {
				lines.push(`${indentStr}${key}:`);
				this.stringifyYamlRecursive(value, lines, indent + 1);
			} else if (Array.isArray(value)) {
				lines.push(`${indentStr}${key}:`);
				for (const item of value) {
					if (this.isRecord(item)) {
						lines.push(`${indentStr}  -`);
						this.stringifyYamlRecursive(item, lines, indent + 2);
					} else {
						lines.push(`${indentStr}  - ${this.formatValue(item)}`);
					}
				}
			} else {
				lines.push(`${indentStr}${key}: ${this.formatValue(value)}`);
			}
		}
	}

	private formatValue(value: unknown): string {
		if (typeof value === "string") {
			// Quote if contains special chars or line breaks or leading/trailing spaces
			if (
				value.includes(":") ||
				value.includes("#") ||
				value.includes("\n") ||
				value.startsWith(" ") ||
				value.endsWith(" ")
			) {
				return `"${value.replace(/"/g, '\\"')}"`;
			}
			return value;
		} else if (typeof value === "boolean") {
			return value ? "true" : "false";
		} else if (typeof value === "number") {
			return String(value);
		} else if (value instanceof Date) {
			return value.toISOString();
		} else {
			return String(value);
		}
	}

	/**
	 * Get all frontmatter field paths (dot notation).
	 */
	getAllFields(frontmatter: Frontmatter | null, prefix = ""): string[] {
		const fields: string[] = [];

		if (!frontmatter || typeof frontmatter !== "object") {
			return fields;
		}

		for (const [key, value] of Object.entries(frontmatter)) {
			const fieldPath = prefix ? `${prefix}.${key}` : key;
			fields.push(fieldPath);

			if (value && typeof value === "object" && !Array.isArray(value)) {
				fields.push(
					...this.getAllFields(value as Frontmatter, fieldPath)
				);
			}
		}

		return fields;
	}

	/**
	 * Check whether frontmatter has the specified field path.
	 */
	hasField(frontmatter: Frontmatter | null, fieldPath: string): boolean {
		return this.getFieldValue(frontmatter, fieldPath) !== null;
	}

	/**
	 * Get multiple fields at once.
	 */
	getMultipleFields(
		frontmatter: Frontmatter | null,
		fieldPaths: string[]
	): Map<string, unknown> {
		const result = new Map<string, unknown>();

		for (const fieldPath of fieldPaths) {
			const value = this.getFieldValue(frontmatter, fieldPath);
			if (value !== null) {
				result.set(fieldPath, value);
			}
		}

		return result;
	}

	/**
	 * Type guard: check if value is a plain record (object) and not an array.
	 */
	private isRecord(value: unknown): value is Record<string, unknown> {
		return (
			typeof value === "object" && value !== null && !Array.isArray(value)
		);
	}
}
