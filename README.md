# mergemaster - Multi-File Merger for VS Code

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/tarekbadrsh.mergemaster)

Merge multiple code/text files into a single organized document with contextual separators.

## Features

- **Multi-File Selection**: Select files from workspace explorer
- **Smart Merging**: Auto-inserts file headers/section separators
- **Output Customization**: Choose destination path/file name
- **Preserved Context**: Maintains original file content structure

## Usage

1. Open workspace containing files to merge
2. Open command palette (`Ctrl+Shift+P`)
3. Run "MergeMaster: Merge Files" command
4. Select 2+ files from quick pick
5. Choose output location via save dialog
6. Get single file with format:

```txt
// File: file1.js
...original content...
// End of file1.js

// File: file2.py
...original content...
// End of file2.py
```

## Requirements

- VS Code 1.85+
- Workspace must contain mergeable files

## Extension Settings

Currently supports text-based files (.txt, .md, .py, .js, etc). Binary files are excluded.

## Release Notes

### 1.0.0

Initial release with core merging capability:

- File selection from workspace
- Context-preserving merge output
- Basic error handling

**Enjoy!**
