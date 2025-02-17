// /src/extension.ts:

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new FileTreeProvider();
	vscode.window.registerTreeDataProvider('mergemaster.filesView', treeDataProvider);

	let disposable = vscode.commands.registerCommand('mergemaster.merge', async (uri: vscode.Uri) => {
		const selectedFiles = await getSelectedFiles();
		if (!selectedFiles || selectedFiles.length < 2) {
			vscode.window.showErrorMessage('Please select at least 2 files to merge');
			return;
		}

		const outputPath = await selectOutputLocation();
		if (!outputPath) return;

		try {
			await mergeFiles(selectedFiles, outputPath);
			vscode.window.showInformationMessage('Files merged successfully!');
		} catch (error) {
			vscode.window.showErrorMessage(`Error merging files: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
}

class FileTreeProvider implements vscode.TreeDataProvider<any> {
	getTreeItem(element: any): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: any): vscode.ProviderResult<any[]> {
		return [];
	}
}


async function getSelectedFiles(): Promise<string[]> {
	// Current incorrect implementation
	const activeExplorer = vscode.window.activeTextEditor;
	if (!activeExplorer) return [];

	// Should be replaced with:
	if (!vscode.workspace.workspaceFolders) {
		return [];
	}

	return vscode.workspace.findFiles('**/*', '**/node_modules/**')
		.then(files => files.map(file => file.fsPath));
}

async function selectOutputLocation(): Promise<string | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return undefined;

	const result = await vscode.window.showSaveDialog({
		defaultUri: vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, 'merged_output.txt')),
		filters: {
			'Text Files': ['txt'],
			'All Files': ['*']
		}
	});

	return result?.fsPath;
}

async function mergeFiles(files: string[], outputPath: string): Promise<void> {
	let mergedContent = '';

	for (const file of files) {
		const content = await fs.promises.readFile(file, 'utf8');
		mergedContent += `\n// File: ${path.basename(file)}\n`;
		mergedContent += `${content}\n`;
		mergedContent += `\n// End of ${path.basename(file)}\n`;
	}

	await fs.promises.writeFile(outputPath, mergedContent);
}

export function deactivate() { }
