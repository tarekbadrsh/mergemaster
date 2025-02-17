// /src/MergeFilesCommands.ts

import { promises as fsPromises } from 'fs';
import { join, relative, basename } from 'path';
import type { ExtensionContext } from 'vscode';
import { commands, Uri, workspace, window, FileType } from 'vscode';

// Prompt user for output file location
async function selectOutputLocation(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) return undefined;

    const result = await window.showSaveDialog({
        defaultUri: Uri.file(join(workspaceFolders[0].uri.fsPath, 'merged_output.txt')),
        filters: {
            'Text Files': ['txt'],
            'All Files': ['*']
        }
    });

    return result?.fsPath;
}

// Recursive helper to list all files inside a directory
async function listFiles(uri: Uri): Promise<Uri[]> {
    const uris: Uri[] = [];
    try {
        // readDirectory returns an array of [name, FileType] tuples
        const entries = await workspace.fs.readDirectory(uri);
        for (const [name, type] of entries) {
            const childUri = Uri.joinPath(uri, name);
            if (type === FileType.File) {
                uris.push(childUri);
            } else if (type === FileType.Directory) {
                // Recursively get files in subdirectories
                const subFiles = await listFiles(childUri);
                uris.push(...subFiles);
            }
        }
    } catch (err) {
        console.error(`Error reading directory ${uri.fsPath}: ${err}`);
    }
    return uris;
}

// Merge files after resolving directories recursively
async function mergeFiles(currentFile: Uri, selectedFiles: Uri[]): Promise<void> {
    const outputPath = await selectOutputLocation();
    if (!outputPath) return;

    let mergedContent = '';
    const fileUris: Uri[] = [];

    // Process each selected file/directory
    for (const file of selectedFiles) {
        try {
            // Use workspace.fs.stat to obtain file information because Uri does not have an isFile property
            const stat = await workspace.fs.stat(file);
            if (stat.type === FileType.File) {
                fileUris.push(file);
            } else if (stat.type === FileType.Directory) {
                // Recursively get all file Uris inside this directory
                const recursiveFiles = await listFiles(file);
                fileUris.push(...recursiveFiles);
            }
        } catch (error) {
            console.error(`Error processing ${file.fsPath}: ${error}`);
        }
    }

    // Iterate over each file Uri and append its content to mergedContent
    for (const fileUri of fileUris) {
        const content = await fsPromises.readFile(fileUri.fsPath, 'utf8');
        const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
        const relativePath = workspaceRoot ? relative(workspaceRoot, fileUri.fsPath) : basename(fileUri.fsPath);
        mergedContent += `\n${'='.repeat(50)}\n`;
        mergedContent += `<--- Start-File: ${relativePath} --->\n`;
        mergedContent += `${'='.repeat(50)}\n\n`;
        mergedContent += `${content}\n\n`;
        mergedContent += `${'='.repeat(50)}\n`;
        mergedContent += `<--- End-File: ${relativePath} --->\n`;
        mergedContent += `${'='.repeat(50)}\n`;
    }

    await fsPromises.writeFile(outputPath, mergedContent);
}

namespace MergeFilesCommands {
    export function register(context: ExtensionContext) {
        context.subscriptions.push(commands.registerCommand('mergemaster.merge', mergeFiles));
    }
}

export default MergeFilesCommands;
