'use server';

import fs from 'fs';
import path from 'path';

export async function getLatestStoryboardContextAction() {
    try {
        const scenesDir = path.join(process.cwd(), 'scenes');
        if (!fs.existsSync(scenesDir)) {
            return { success: true, context: '' };
        }

        // List all subdirectories (timestamped)
        const subDirs = fs.readdirSync(scenesDir)
            .filter(f => fs.statSync(path.join(scenesDir, f)).isDirectory())
            .sort() // Alphabetical sort works for YYYYMMDD-HHMM
            .reverse(); // Latest first

        if (subDirs.length === 0) {
            return { success: true, context: '' };
        }

        const latestDir = path.join(scenesDir, subDirs[0]);
        const files = fs.readdirSync(latestDir)
            .filter(f => f.endsWith('.md'))
            .sort(); // Scene 1, Scene 2, etc.

        let combinedContext = '';
        for (const file of files) {
            const content = fs.readFileSync(path.join(latestDir, file), 'utf8');
            combinedContext += `--- DOCUMENT: ${file} ---\n${content}\n\n`;
        }

        return {
            success: true,
            context: combinedContext.trim()
        };
    } catch (error: any) {
        console.error('Failed to get storyboard context:', error);
        return { success: false, message: error.message || 'Failed to read previous context.' };
    }
}
