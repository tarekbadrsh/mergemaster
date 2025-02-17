// /src/MergeFilesCommands.ts

/**
 * Core functionality for the MergeMaster VS Code extension.
 * This module handles file selection, content merging, and output generation.
 * It provides the main command implementation for merging multiple files into a single document.
 */

import { promises as fsPromises } from 'fs';
import { join, relative, basename } from 'path';
import type { ExtensionContext } from 'vscode';
import { commands, Uri, workspace, window, FileType, env } from 'vscode';
import getGitignoreFilter from './gitignoreFilter';

/**
 * Prompts the user to select a location for the merged output file.
 * Opens a save dialog with default settings for text files.
 * 
 * @returns Promise resolving to the selected file path or undefined if cancelled
 */
async function selectOutputLocation(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders) {
        return undefined;
    }

    const result = await window.showSaveDialog({
        defaultUri: Uri.file(join(workspaceFolders[0].uri.fsPath, 'merged_output.txt')),
        filters: {
            'Text Files': ['txt'],
            'All Files': ['*']
        }
    });

    return result?.fsPath;
}

/**
 * Recursively lists all files within a directory.
 * Traverses subdirectories and collects all file URIs.
 * 
 * @param uri - The URI of the directory to scan
 * @returns Promise resolving to an array of file URIs
 */
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


/**
 * Builds a tree representation of the selected files.
 * Creates a visual directory structure using ASCII characters.
 * 
 * @param fileSet - Set of file paths to include in the tree
 * @returns Promise resolving to a string containing the ASCII tree representation
 */
async function buildTreeFromRoot(fileSet: Set<string>): Promise<string> {
    // Convert file paths into relative paths with the workspace root name
    const relativePaths = new Set<string>();
    for (const path of fileSet) {
        const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
        let relativePath = workspaceRoot ? relative(workspaceRoot, path) : basename(path);
        if (workspaceRoot) {
            const rootName = basename(workspaceRoot);
            relativePath = `${rootName}/${relativePath}`;
        }
        relativePaths.add(relativePath);
    }

    // Define a tree node with a name, a Map for children nodes, and a flag for files.
    interface TreeNode {
        name: string;
        children: Map<string, TreeNode>;
        isFile: boolean;
    }

    // Create a dummy root node.
    const tree: TreeNode = { name: "", children: new Map(), isFile: false };

    // Build the tree by splitting each relative path and inserting each segment.
    for (const fullPath of relativePaths) {
        const parts = fullPath.split('/');
        let currentNode = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1; // last segment is the file name
            if (!currentNode.children.has(part)) {
                currentNode.children.set(part, { name: part, children: new Map(), isFile });
            }
            currentNode = currentNode.children.get(part)!;
        }
    }

    // Recursively render the tree using the standard tree branch markers.
    function renderTree(node: TreeNode, prefix: string): string {
        let output = "";
        // Sort keys alphabetically.
        const children = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
        children.forEach((child, index) => {
            const isLast = index === children.length - 1;
            const connector = isLast ? "└── " : "├── ";
            if (child.children.size > 0 && !child.isFile) {
                // Append a '/' to directory names.
                output += `${prefix}${connector}${child.name}/\n`;
                // Adjust the prefix for subsequent levels.
                const nextPrefix = prefix + (isLast ? "    " : "│   ");
                output += renderTree(child, nextPrefix);
            } else {
                output += `${prefix}${connector}${child.name}\n`;
            }
        });
        return output;
    }

    // Assume a single common root if available, otherwise list roots individually.
    let treeResult = "";
    const rootNodes = Array.from(tree.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (rootNodes.length === 1) {
        treeResult += `${rootNodes[0].name}/\n`;
        treeResult += renderTree(rootNodes[0], "");
    } else {
        rootNodes.forEach((node) => {
            treeResult += `${node.name}${node.children.size > 0 && !node.isFile ? "/" : ""}\n`;
            treeResult += renderTree(node, "");
        });
    }

    return treeResult;
}


/**
 * Builds the merged content from all selected files.
 * Adds file headers and separators between file contents.
 * 
 * @param fileSet - Set of file paths to merge
 * @returns Promise resolving to the merged content string
 */
async function buildFilesContent(fileSet: Set<string>): Promise<string> {
    let mergedContent = '';
    for (const path of fileSet) {
        const content = await fsPromises.readFile(path, 'utf8');
        const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
        let relativePath = workspaceRoot ? relative(workspaceRoot, path) : basename(path);
        if (workspaceRoot) {
            const rootName = basename(workspaceRoot);
            relativePath = `${rootName}/${relativePath}`;
        }
        mergedContent += `\n${'='.repeat(50)}\n`;
        mergedContent += `<--- Start-File: ${relativePath} --->\n`;
        mergedContent += `${'='.repeat(50)}\n\n`;
        mergedContent += `${content}\n\n`;
        mergedContent += `${'='.repeat(50)}\n`;
        mergedContent += `<--- End-File: ${relativePath} --->\n`;
        mergedContent += `${'='.repeat(50)}\n`;
    }
    return mergedContent;
}


/**
 * Retrieves and processes the content of all selected files.
 * Handles both individual files and directories recursively.
 * Applies gitignore filtering if enabled.
 * 
 * @param currentFile - The currently active file URI
 * @param selectedFiles - Array of selected file/directory URIs
 * @param respectGitignore - Whether to respect .gitignore rules
 * @returns Promise resolving to the final merged content
 */
async function getFilesContent(currentFile: Uri, selectedFiles: Uri[], respectGitignore: boolean): Promise<string> {
    const workspaceRoot = workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        throw new Error('No workspace folder found');
    }
    const gitignoreFilter = await getGitignoreFilter(workspaceRoot, respectGitignore);

    const fileSet = new Set<string>();
    // Process each selected file/directory
    for (const file of selectedFiles) {
        try {
            // Use workspace.fs.stat to obtain file information because Uri does not have an isFile property
            const stat = await workspace.fs.stat(file);
            if (stat.type === FileType.File) {
                if (gitignoreFilter(file.fsPath)) {
                    fileSet.add(file.fsPath);
                }
            } else if (stat.type === FileType.Directory) {
                // Recursively get all file Uris inside this directory
                const recursiveFiles = await listFiles(file);
                for (const file of recursiveFiles) {
                    if (gitignoreFilter(file.fsPath)) {
                        fileSet.add(file.fsPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${file.fsPath}: ${error}`);
        }
    }

    // Build final content with tree structure
    const treeContent = await buildTreeFromRoot(fileSet);
    const mergedContent = await buildFilesContent(fileSet);
    const finalContent = `${treeContent}\n\n\n${mergedContent}`;

    return finalContent;
    // await fsPromises.writeFile(outputPath, finalContent);
}

/**
 * Exports selected files to a single merged text file.
 * Handles the entire process from file selection to content generation and saving.
 * 
 * @param currentFile - The currently active file URI
 * @param selectedFiles - Array of selected file/directory URIs
 * @param respectGitignore - Whether to respect .gitignore rules
 * @returns Promise that resolves when the export is complete
 */
async function ExportFiles(currentFile: Uri, selectedFiles: Uri[], respectGitignore: boolean): Promise<void> {
    try {
        const outputPath = await selectOutputLocation();
        if (!outputPath) {
            return;
        }
        const finalContent = await getFilesContent(currentFile, selectedFiles, respectGitignore);
        await fsPromises.writeFile(outputPath, finalContent);
    } catch (err) {
        console.error(`Error reading file ${err}`);
        throw err;
    }
}

// Get content of a single file as string
async function CopyFiles(currentFile: Uri, selectedFiles: Uri[], respectGitignore: boolean): Promise<void> {
    try {
        const finalContent = await getFilesContent(currentFile, selectedFiles, respectGitignore);
        await env.clipboard.writeText(finalContent);
        window.showInformationMessage(`Selected Files Content copied to clipboard`);
    } catch (err) {
        console.error(`Error reading file ${err}`);
        throw err;
    }
}

/**
 * Namespace containing the command registration and implementation for the MergeMaster extension.
 */
namespace MergeFilesCommands {
    export function register(context: ExtensionContext) {
        // Register merge command
        context.subscriptions.push(
            commands.registerCommand('mergemaster.merge', async (currentFile: Uri, selectedFiles: Uri[]) => {
                const config = workspace.getConfiguration('mergemaster');
                const respectGitignore = config.get<boolean>('respectGitignore', true);
                await ExportFiles(currentFile, selectedFiles, respectGitignore);
            })
        );

        // Register copy content command
        context.subscriptions.push(
            commands.registerCommand('mergemaster.copyContent', async (currentFile: Uri, selectedFiles: Uri[]) => {
                const config = workspace.getConfiguration('mergemaster');
                const respectGitignore = config.get<boolean>('respectGitignore', true);
                await CopyFiles(currentFile, selectedFiles, respectGitignore);
            })
        );
    }
}

export default MergeFilesCommands;
