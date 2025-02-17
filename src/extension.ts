// /src/extension.ts:

/**
 * Entry point for the MergeMaster VS Code extension.
 * This file handles the activation and deactivation of the extension.
 */

import { ExtensionContext } from "vscode";
import MergeFilesCommands from "./MergeFilesCommands";

/**
 * Activates the MergeMaster extension.
 * This function is called when the extension is first loaded by VS Code.
 * 
 * @param context - The extension context provided by VS Code
 */
export function activate(context: ExtensionContext) {
	MergeFilesCommands.register(context);
}

/**
 * Handles the deactivation of the MergeMaster extension.
 * This function is called when VS Code is shutting down or the extension is being disabled.
 * Currently, no cleanup is required.
 */
export function deactivate() { }
