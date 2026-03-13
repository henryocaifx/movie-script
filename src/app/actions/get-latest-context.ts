'use server';

import pool from '@/lib/db';

export async function getLatestStoryboardContextAction() {
    try {
        // Get the project_id of the most recently updated project
        const latestProjectResult = await pool.query(`
            SELECT project_id FROM scenes_content 
            ORDER BY updated_at DESC LIMIT 1
        `);

        if (latestProjectResult.rows.length === 0) {
            return { success: true, context: '' };
        }

        const project_id = latestProjectResult.rows[0].project_id;

        // Get all files for this project, sorted by name (scene-1, scene-2)
        // We generally only want the main scenes for context, not individual panels (unless needed)
        // Adjust filter if necessary. Here we take everything for that project.
        const filesResult = await pool.query(`
            SELECT name, content FROM scenes_content 
            WHERE project_id = $1 AND name NOT LIKE '%panel%'
            ORDER BY name ASC
        `, [project_id]);

        let combinedContext = '';
        for (const row of filesResult.rows) {
            combinedContext += `--- DOCUMENT: ${row.name} ---\n${row.content}\n\n`;
        }

        return {
            success: true,
            context: combinedContext.trim()
        };
    } catch (error: any) {
        console.error('Failed to get storyboard context from DB:', error);
        return { success: false, message: error.message || 'Failed to read previous context from database.' };
    }
}
