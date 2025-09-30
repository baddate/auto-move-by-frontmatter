> [!WARNING]
> **WIP: This plugin is still under development.**
> Features and behavior may change between releases. Please use with caution and report any issues on GitHub.

# Auto Move by Frontmatter Plugin for Obsidian

[简体中文](./README_ZH.md)

Automatically organize your notes by moving files to designated folders based on their frontmatter fields. Perfect for maintaining a clean and structured vault!

## Features

-   🎯 **Multi-Field Matching**: Configure rules with multiple frontmatter field conditions
-   🔀 **Flexible Logic**: Use AND/OR operators to combine conditions
-   ⚡ **Multiple Triggers**: Auto-move on save, file switch, or periodic intervals
-   🎨 **Smart Matching**: Support exact, contains, and regex matching patterns
-   📁 **Auto-Create Folders**: Automatically create target folders if they don't exist
-   🔄 **Batch Operations**: Scan and move all files at once
-   🎛️ **Easy Configuration**: Intuitive UI with folder suggestions and live preview

## Installation

### From Obsidian Community Plugins

> [!NOTE]
> Community plugin installation is currently unavailable. Please use manual installation below.

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Auto Move by Frontmatter"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/baddate/auto-move-by-frontmatter/releases)
2. Extract the files into your vault's `.obsidian/plugins/auto-move-by-frontmatter/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Usage

### Basic Setup

1. Open Settings → Auto Move by Frontmatter
2. Enable the plugin
3. Click "Add Rule" to create your first rule
4. Configure the rule conditions and target folder

### Creating Rules

Each rule consists of:

-   **Conditions**: One or more frontmatter field conditions
-   **Logic Operator**: AND (all must match) or OR (any must match)
-   **Target Folder**: Where matching files should be moved
-   **Auto-Create**: Whether to create the folder if it doesn't exist

### Example Rules

#### Example 1: Daily Notes

Move all daily notes to a dedicated folder:

```yaml
Condition 1:
    Field: type
    Match Type: Exact
    Value: daily

Target Folder: Daily Notes
```

#### Example 2: Active Projects

Move active work projects using multiple conditions:

```yaml
Condition 1:
    Field: category
    Match Type: Exact
    Value: project

Condition 2:
    Field: status
    Match Type: Exact
    Value: active

Logic Operator: AND
Target Folder: Projects/Active
```

#### Example 3: Multiple Categories

Move files from several categories to one folder:

```yaml
Condition 1:
    Field: category
    Match Type: Contains
    Value: work

Condition 2:
    Field: category
    Match Type: Contains
    Value: business

Logic Operator: OR
Target Folder: Professional
```

#### Example 4: Regex Pattern

Move files with date-based tags:

```yaml
Condition 1:
    Field: tags
    Match Type: Regex
    Value: \d{4}-\d{2}-\d{2}

Target Folder: Archive/Dated
```

### Match Types

-   **Exact**: Field value must exactly match (case-insensitive)
-   **Contains**: Field value must contain the rule value (case-insensitive)
-   **Regex**: Field value must match the regular expression pattern (case-insensitive)

### Trigger Conditions

Configure when files should be automatically moved:

-   **On Save**: Move files when they are saved (default)
-   **On File Switch**: Move files when switching between files
-   **On Interval**: Periodically scan and move all files (configurable minutes)

### Commands

The plugin provides two commands accessible via Command Palette (Ctrl/Cmd + P):

-   **Move current file based on frontmatter**: Manually trigger move for the active file
-   **Scan and move all files**: Scan entire vault and move all matching files

## Frontmatter Examples

### Simple Frontmatter

```yaml
---
type: daily
status: active
---
```

### Nested Fields

```yaml
---
metadata:
    category: project
    priority: high
tags:
    - work
    - important
---
```

Access nested fields using dot notation: `metadata.category`

### Array Fields

```yaml
---
tags:
    - meeting
    - project
---
```

The plugin checks if any array element matches the rule.

## Configuration

### Global Settings

-   **Enable auto move**: Toggle the entire plugin on/off
-   **Trigger on save**: Move files automatically when saved
-   **Trigger on file switch**: Move files when switching between them
-   **Trigger on interval**: Enable periodic scanning
-   **Interval (minutes)**: How often to scan (when interval trigger is enabled)

### Rule Settings

Each rule can be:

-   **Enabled/Disabled**: Toggle individual rules
-   **Multiple Conditions**: Add as many conditions as needed
-   **Logic Operator**: Choose AND or OR for combining conditions
-   **Target Folder**: Use the folder picker or type manually
-   **Create Folder**: Auto-create folder if it doesn't exist

## Tips & Best Practices

1. **Start Simple**: Begin with one or two rules and expand as needed
2. **Test First**: Use the manual command to test rules before enabling auto-move
3. **Use Specific Conditions**: More specific conditions prevent unwanted moves
4. **Order Matters**: Rules are evaluated in order; first match wins
5. **Backup Your Vault**: Always backup before running batch operations
6. **Check Regex**: Test regex patterns in a regex tester before using them
7. **Monitor Moves**: Keep an eye on notifications to catch unexpected behavior

## Troubleshooting

### Files Not Moving

-   Check if the plugin is enabled
-   Verify frontmatter syntax is correct
-   Ensure at least one trigger condition is enabled
-   Check if the file already exists in the target folder

### Wrong Files Being Moved

-   Review your match conditions (they may be too broad)
-   Use "Exact" match instead of "Contains" for precise matching
-   Check if multiple rules might be conflicting

### Folder Not Created

-   Ensure "Create folder if not exists" is enabled for the rule
-   Check folder path for invalid characters: `< > : " | ? *`
-   Verify you have write permissions in your vault

### Performance Issues

-   Reduce interval frequency if using periodic scanning
-   Consider disabling "Trigger on file switch" for large vaults
-   Use more specific conditions to reduce unnecessary checks

## Compatibility

-   **Obsidian Version**: Requires Obsidian v1.0.0 or higher
-   **Mobile**: Fully supported on iOS and Android
-   **Sync**: Compatible with Obsidian Sync and third-party sync solutions

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/baddate/auto-move-by-frontmatter.git
cd auto-move-by-frontmatter

# Install dependencies
npm install

# Build the plugin
npm run build

# Development mode with auto-reload
npm run dev
```

### Project Structure

```
auto-move-by-frontmatter/
├── src/
│   ├── main.ts              # Plugin main entry
│   ├── settings.ts          # Settings UI and types
│   ├── fileMover.ts         # File moving logic
│   ├── frontmatterParser.ts # YAML parsing utilities
│   └── fileSuggester.ts     # Folder suggestion modal
├── styles.css               # Plugin styles
├── manifest.json            # Plugin manifest
└── README.md               # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Changelog

### Version 1.1.0

-   ✨ Added multi-field condition support
-   ✨ Added AND/OR logic operators
-   🎨 Improved UI with better visual hierarchy
-   ♿ Enhanced accessibility with focus states
-   🔧 Optimized code structure and performance
-   🐛 Fixed folder suggestion positioning issues

### Version 1.0.0

-   🎉 Initial release
-   ⚡ Basic frontmatter-based file moving
-   🎯 Multiple trigger conditions
-   📁 Auto-create folders

## License

[MIT License](LICENSE)

## Support

-   🐛 [Issue Tracker](https://github.com/baddate/auto-move-by-frontmatter/issues)
-   💬 [Discussions](https://github.com/baddate/auto-move-by-frontmatter/discussions)

## Credits

Created and maintained by [Mercas](https://github.com/baddate)

Special thanks to:

-   The Obsidian team for creating an amazing platform
-   The Obsidian plugin developer community
-   All contributors and users who provided feedback

---

If you find this plugin helpful, consider:

-   ⭐ Starring the repository
-   🐛 Reporting issues
-   💡 Suggesting new features
