// /src/extension.ts:

import { ExtensionContext } from "vscode";
import MergeFilesCommands from "./MergeFilesCommands";

export function activate(context: ExtensionContext) {
	MergeFilesCommands.register(context);
}

export function deactivate() { }
