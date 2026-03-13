'use server';

import pool from '@/lib/db';

export async function saveScenesAction(scenes: { filename: string; content: string }[], subDir?: string) {
  try {
    const project_id = subDir || 'default';

    for (const scene of scenes) {
      let sceneNum: number | null = null;
      let panelNum: number | null = null;
      
      // Strip .md if present
      const cleanName = scene.filename.replace(/\.md$/, '');

      const sceneMatch = cleanName.match(/scene-(\d+)/);
      if (sceneMatch) sceneNum = parseInt(sceneMatch[1]);

      const panelMatch = cleanName.match(/panel-(\d+)/);
      if (panelMatch) panelNum = parseInt(panelMatch[1]);

      const isTruncated = /scene-\d+-panel-\d+/.test(cleanName);
      
      await pool.query(`
        INSERT INTO scenes_content (project_id, name, scene, panel, is_truncated, content, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (project_id, name) DO UPDATE SET
          is_truncated = EXCLUDED.is_truncated,
          content = EXCLUDED.content,
          updated_at = CURRENT_TIMESTAMP
      `, [project_id, cleanName, sceneNum, panelNum, isTruncated, scene.content]);
    }

    return {
      success: true,
      message: `Successfully saved ${scenes.length} scenes to database project ${project_id}.`,
      path: project_id
    };
  } catch (error: any) {
    console.error('Failed to save scenes to DB:', error);
    return { success: false, message: error.message || 'Failed to save scenes to database.' };
  }
}

export async function getSceneAction(filename: string, subDir: string) {
  try {
    const cleanName = filename.replace(/\.md$/, '');
    const result = await pool.query(
      'SELECT content FROM scenes_content WHERE project_id = $1 AND name = $2',
      [subDir, cleanName]
    );

    if (result.rows.length === 0) {
      return { success: false, message: `Scene not found in DB: ${subDir}/${cleanName}` };
    }

    return { success: true, content: result.rows[0].content };
  } catch (error: any) {
    console.error('Failed to read scene from DB:', error);
    return { success: false, message: error.message || 'Failed to read scene from database.' };
  }
}

export async function savePanelAction(
  sceneNumber: string,
  panelIndex: number,
  content: string,
  subDir: string
) {
  try {
    const project_id = subDir;
    const panelName = `scene-${sceneNumber}-panel-${panelIndex + 1}`;
    const sceneName = `scene-${sceneNumber}`;

    // 1. Save/Update individual panel record (always truncated as it's a single panel)
    await pool.query(`
      INSERT INTO scenes_content (project_id, name, scene, panel, is_truncated, content, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (project_id, name) DO UPDATE SET
        is_truncated = EXCLUDED.is_truncated,
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
    `, [project_id, panelName, parseInt(sceneNumber), panelIndex + 1, true, content]);

    // 2. Update the main scene content in DB
    const sceneResult = await pool.query(
      'SELECT content FROM scenes_content WHERE project_id = $1 AND name = $2',
      [project_id, sceneName]
    );

    if (sceneResult.rows.length > 0) {
      let sceneContent = sceneResult.rows[0].content;
      
      const panelLabel = `**Panel ${panelIndex + 1}**:`;
      const regex = new RegExp(`(\\d+\\.\\s*\\*\\*Panel ${panelIndex + 1}\\*\\*:).*`, 'g');
      
      if (regex.test(sceneContent)) {
        sceneContent = sceneContent.replace(regex, `$1 ${content}`);
        
        await pool.query(
          'UPDATE scenes_content SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE project_id = $2 AND name = $3',
          [sceneContent, project_id, sceneName]
        );
      } else {
        console.warn(`Could not find Panel ${panelIndex + 1} in ${sceneName} for update in DB.`);
      }
    }

    return { 
      success: true, 
      message: `Successfully updated Panel ${panelIndex + 1} for Scene ${sceneNumber} in database.` 
    };
  } catch (error: any) {
    console.error('Failed to save panel to DB:', error);
    return { success: false, message: error.message || 'Failed to save panel to database.' };
  }
}