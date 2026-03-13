import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'henry_db',
  user: process.env.DB_USER || 'henry',
  password: process.env.DB_PASSWORD || 'example123',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenes_content (
        id SERIAL PRIMARY KEY,
        project_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        scene INTEGER,
        panel INTEGER,
        is_truncated BOOLEAN DEFAULT FALSE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes_content(project_id);
    `);

    const scenesRoot = path.join(process.cwd(), 'scenes');
    if (!fs.existsSync(scenesRoot)) {
      console.log('No scenes directory found. Skipping migration.');
      return;
    }

    const projects = fs.readdirSync(scenesRoot).filter(f => 
      fs.statSync(path.join(scenesRoot, f)).isDirectory()
    );

    console.log(`Found ${projects.length} projects to migrate.`);

    for (const project_id of projects) {
      const projectPath = path.join(scenesRoot, project_id);
      const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));

      for (const filename of files) {
        const filePath = path.join(projectPath, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);

        // Parse scene and panel from filename
        // Examples: scene-1.md, scene-1-panel-1.md
        let scene: number | null = null;
        let panel: number | null = null;

        const sceneMatch = filename.match(/scene-(\d+)/);
        if (sceneMatch) scene = parseInt(sceneMatch[1]);

        const panelMatch = filename.match(/panel-(\d+)/);
        if (panelMatch) panel = parseInt(panelMatch[1]);

        const cleanName = filename.replace(/\.md$/, '');
        const isTruncated = /scene-\d+-panel-\d+/.test(cleanName);
        console.log(`Migrating ${project_id}/${cleanName}... (truncated: ${isTruncated})`);

        await client.query(`
          INSERT INTO scenes_content (project_id, name, scene, panel, is_truncated, content, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (project_id, name) DO UPDATE SET
            is_truncated = EXCLUDED.is_truncated,
            content = EXCLUDED.content,
            updated_at = EXCLUDED.updated_at
        `, [
          project_id,
          cleanName,
          scene,
          panel,
          isTruncated,
          content,
          stats.birthtime,
          stats.mtime
        ]);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
