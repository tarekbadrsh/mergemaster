# MergeMaster - Multi-File Merger for VS Code

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/tarekbadrsh.mergemaster)

Merge multiple code/text files into a single organized document with contextual separators. Perfect for code reviews, documentation, and file organization.

## Table of Contents
- [Features](#features)
- [Usage](#usage)
- [Requirements](#requirements)
- [Extension Settings](#extension-settings)
- [Development](#development)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Release Notes](#release-notes)

## Features

### Core Features
- **Multi-File Selection**: Select files from the workspace explorer or use glob patterns.
- **Smart Merging**: Automatically inserts file headers and section separators.
- **Output Customization**: Choose the destination path and file name.
- **Preserved Context**: Maintains the original file content structure.

### Advanced Features
- **Directory Support**: Recursively merge entire directories of files.
- **Gitignore Integration**: Respects `.gitignore` rules when selecting files.
- **Tree View**: Generates a visual tree structure of merged files.
- **File Organization**: Maintains clear separation between files with ASCII headers.
- **Error Handling**: Robust error handling for file operations and edge cases.

## Usage

1. Open a workspace containing files to merge.
2. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
3. Run the "MergeMaster: Merge Files" command.
4. Select two or more files from the quick pick.
   - You can select individual files or entire directories.
   - Files ignored by `.gitignore` will be excluded by default.
5. Choose the output location via the save dialog.
6. Get a single file with the following format:

```txt
==================================================
<--- Start-File: file1.js --->
==================================================

...original content...

==================================================
<--- End-File: file1.js --->
==================================================

==================================================
<--- Start-File: file2.py --->
==================================================

...original content...

==================================================
<--- End-File: file2.py --->
==================================================
```

## Requirements

- VS Code 1.85 or later
- Workspace must contain mergeable files
- Node.js and npm for development

## Extension Settings

- Supports all text-based files (e.g., `.txt`, `.md`, `.py`, `.js`, `.ts`, `.json`, `.html`, `.css`)
- Binary files are automatically excluded
- Respects `.gitignore` patterns by default

## Development

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/tarekbadrsh/mergemaster.git
   cd mergemaster
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Open in VS Code
   ```bash
   code .
   ```

### Building and Testing
- compile: `npm run compile`
- Watch: `npm run watch`

### Debugging
1. Press `F5` to start debugging
2. Open a test workspace
3. Run the extension commands from the Command Palette

## Architecture

The extension is built with TypeScript and follows a modular architecture:

### Core Components
- `extension.ts`: Entry point for the VS Code extension
- `MergeFilesCommands.ts`: Main command implementation and file processing
- `gitignoreFilter.ts`: Handles `.gitignore` integration

### Key Features Implementation
- File Selection: Uses VS Code's workspace API
- Content Merging: Implements custom merge logic with file separators
- Tree View: Generates ASCII tree structure for visual organization
- Error Handling: Comprehensive error catching and user feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

Please follow the existing code style and add appropriate tests.

## Release Notes

### 1.0.0

Initial release with core merging capability:

- File and directory selection from workspace
- Context-preserving merge output with tree view
- Gitignore integration
- Comprehensive error handling
- Support for all text-based file types

**Enjoy!**

## License

This project is licensed under the MIT License - see the LICENSE file for details.
