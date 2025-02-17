// src/gitignoreFilter.ts

/**
 * This module provides functionality to filter files based on .gitignore rules.
 * It uses the 'ignore' package to parse and apply gitignore patterns.
 */

import { join, relative } from 'path';
import ignore from 'ignore';
import { readFileSync } from 'fs';

/**
 * Creates a filter function that checks if files should be included based on .gitignore rules.
 * 
 * @param workspaceRoot - The root directory of the workspace where .gitignore is located
 * @param respectGitignore - Whether to apply .gitignore rules (defaults to true)
 * @returns A function that takes a file path and returns true if the file should be included
 * 
 * The returned filter function:
 * - Returns true for all files if respectGitignore is false
 * - Returns true for files not matched by .gitignore patterns
 * - Returns false for files matched by .gitignore patterns
 * - Returns true for all files if there's an error reading .gitignore
 */
async function getGitignoreFilter(workspaceRoot: string, respectGitignore: boolean = true): Promise<(path: string) => boolean> {
    // If gitignore is disabled, accept all files
    if (!respectGitignore) {
        return () => true;
    }

    try {
        // Create a new ignore instance
        const ig = ignore();
        const gitignorePath = join(workspaceRoot, '.gitignore');

        try {
            // Read and parse .gitignore file
            const gitignoreContent = readFileSync(gitignorePath, 'utf8');
            ig.add(gitignoreContent);
        } catch (error) {
            console.log('.gitignore not found, proceeding without ignore rules');
        }

        // Return a filter function that checks if a file should be ignored
        return (path: string) => {
            const relativePath = relative(workspaceRoot, path);
            return !ig.ignores(relativePath);
        };
    } catch (error) {
        console.error('Error creating gitignore filter:', error);
        return () => true; // Fallback to accepting all files on error
    }
}

export default getGitignoreFilter;