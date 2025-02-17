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


// Merge files after resolving directories recursively
async function mergeFiles(currentFile: Uri, selectedFiles: Uri[]): Promise<void> {
    const outputPath = await selectOutputLocation();
    if (!outputPath) return;

    const fileSet = new Set<string>();

    // Process each selected file/directory
    for (const file of selectedFiles) {
        try {
            // Use workspace.fs.stat to obtain file information because Uri does not have an isFile property
            const stat = await workspace.fs.stat(file);
            if (stat.type === FileType.File) {
                fileSet.add(file.fsPath);
            } else if (stat.type === FileType.Directory) {
                // Recursively get all file Uris inside this directory
                const recursiveFiles = await listFiles(file);
                for (const file of recursiveFiles) {
                    fileSet.add(file.fsPath);
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
    await fsPromises.writeFile(outputPath, finalContent);
}

namespace MergeFilesCommands {
    export function register(context: ExtensionContext) {
        context.subscriptions.push(commands.registerCommand('mergemaster.merge', mergeFiles));
    }
}

export default MergeFilesCommands;
