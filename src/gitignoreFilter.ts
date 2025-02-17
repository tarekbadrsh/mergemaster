import { join, relative } from 'path';
import ignore from 'ignore';
import { readFileSync } from 'fs';

async function getGitignoreFilter(workspaceRoot: string, respectGitignore: boolean = true): Promise<(path: string) => boolean> {
    if (!respectGitignore) {
        return () => true; // Accept all files when gitignore is disabled
    }

    try {
        const ig = ignore();
        const gitignorePath = join(workspaceRoot, '.gitignore');

        try {
            const gitignoreContent = readFileSync(gitignorePath, 'utf8');
            ig.add(gitignoreContent);
        } catch (error) {
            console.log('.gitignore not found, proceeding without ignore rules');
        }

        return (path: string) => {
            const relativePath = relative(workspaceRoot, path);
            return !ig.ignores(relativePath);
        };
    } catch (error) {
        console.error('Error creating gitignore filter:', error);
        return () => true; // Fallback to accepting all files
    }
}

export default getGitignoreFilter;