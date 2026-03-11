'use server';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function getTimestamp() {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '-' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
}

/**
 * Saves an individually generated storyboard image to:
 *   storyboard/generated/yyyymmdd-hhmm/storyboard-{sceneNumber}.png
 */
export async function saveGeneratedStoryboardAction(
  sceneNumber: number,
  dataUri: string,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);
    const slicedDir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(slicedDir)) fs.mkdirSync(slicedDir, { recursive: true });

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Save the main 4-panel image
    const filename = `storyboard-${sceneNumber}.png`;
    fs.writeFileSync(path.join(dir, filename), imageBuffer);

    // 2. Slice the image into 4 grids (2x2)
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions for slicing');
    }

    const halfWidth = Math.floor(metadata.width / 2);
    const halfHeight = Math.floor(metadata.height / 2);

    const regions = [
      { name: 'grid-1', left: 0, top: 0 },
      { name: 'grid-2', left: halfWidth, top: 0 },
      { name: 'grid-3', left: 0, top: halfHeight },
      { name: 'grid-4', left: halfWidth, top: halfHeight },
    ];

    for (const region of regions) {
      const sliceFilename = `storyboard-${sceneNumber}-${region.name}.png`;
      await image
        .clone()
        .extract({
          left: region.left,
          top: region.top,
          width: halfWidth,
          height: halfHeight
        })
        .toFile(path.join(slicedDir, sliceFilename));
    }

    return { 
      success: true, 
      message: `Saved ${filename} and sliced grids to storyboard/${sessionTimestamp}`, 
      filename 
    };
  } catch (error: any) {
    console.error('Failed to save generated storyboard image:', error);
    return { success: false, message: error.message || 'Failed to save image to disk.' };
  }
}

/**
 * Saves an archived exported storyboard image to:
 *   storyboard/{subDir}/storyboard-{index+1}.png
 */
export async function saveStoryboardImageAction(index: number, dataUri: string, subDir?: string) {
  try {
    let storyboardDir = path.join(process.cwd(), 'storyboard');
    if (subDir) {
      storyboardDir = path.join(storyboardDir, subDir);
    }

    if (!fs.existsSync(storyboardDir)) {
      fs.mkdirSync(storyboardDir, { recursive: true });
    }

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');

    const filename = `storyboard-${index + 1}.png`;
    const filePath = path.join(storyboardDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return {
      success: true,
      message: `Successfully saved ${filename} to ${storyboardDir}.`,
      filename,
      path: storyboardDir
    };
  } catch (error: any) {
    console.error('Failed to save storyboard image:', error);
    return { success: false, message: error.message || 'Failed to save image to disk.' };
  }
}

/**
 * Reads a generated storyboard image from disk and returns it as a data URI.
 */
export async function getGeneratedStoryboardAction(
  sceneNumber: number,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);
    const filename = `storyboard-${sceneNumber}.png`;
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Image not found: ${filePath}` };
    }

    const imageBuffer = fs.readFileSync(filePath);
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read generated storyboard image:', error);
    return { success: false, message: error.message || 'Failed to read image from disk.' };
  }
}

/**
 * Reads a sliced grid image from disk and returns it as a data URI.
 */
export async function getSlicedGridAction(
  sceneNumber: number,
  gridNumber: number,
  sessionTimestamp: string
) {
  try {
    const dir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);
    const filename = `storyboard-${sceneNumber}-grid-${gridNumber}.png`;
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `Sliced image not found: ${filePath}` };
    }

    const imageBuffer = fs.readFileSync(filePath);
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read sliced grid image:', error);
    return { success: false, message: error.message || 'Failed to read sliced image from disk.' };
  }
}

/**
 * Processes a revised panel: resizes it to match original, replaces original grid,
 * and re-composites the entire master storyboard.
 */
export async function saveRevisedPanelImageAction(
  sceneNumber: number,
  gridNumber: number,
  revisedDataUri: string,
  sessionTimestamp: string
) {
  try {
    const slicedDir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);
    const generatedDir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);

    const originalGridPath = path.join(slicedDir, `storyboard-${sceneNumber}-grid-${gridNumber}.png`);
    
    if (!fs.existsSync(originalGridPath)) {
      throw new Error(`Original grid not found: ${originalGridPath}`);
    }

    // 1. Get original dimensions
    const originalMetadata = await sharp(originalGridPath).metadata();
    if (!originalMetadata.width || !originalMetadata.height) {
      throw new Error('Could not read original grid dimensions');
    }

    // 2. Process revised image: Resize to match original exactly
    const revisedBuffer = Buffer.from(revisedDataUri.split(',')[1], 'base64');
    const processedRevisedBuffer = await sharp(revisedBuffer)
      .resize(originalMetadata.width, originalMetadata.height, { fit: 'fill' }) // "Do not crop, only resize"
      .toBuffer();

    // 3. Replace original grid image
    fs.writeFileSync(originalGridPath, processedRevisedBuffer);

    // 4. Combine all four grid photos as the new storyboard image
    const grids = [1, 2, 3, 4].map(g => path.join(slicedDir, `storyboard-${sceneNumber}-grid-${g}.png`));
    
    for (const gPath of grids) {
      if (!fs.existsSync(gPath)) {
        throw new Error(`Missing grid component for re-compositing: ${gPath}`);
      }
    }

    // Master image should be 2x original grid width and 2x original grid height
    const masterWidth = originalMetadata.width * 2;
    const masterHeight = originalMetadata.height * 2;

    const compositeImage = await sharp({
      create: {
        width: masterWidth,
        height: masterHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite([
      { input: grids[0], left: 0, top: 0 },
      { input: grids[1], left: originalMetadata.width, top: 0 },
      { input: grids[2], left: 0, top: originalMetadata.height },
      { input: grids[3], left: originalMetadata.width, top: originalMetadata.height },
    ])
    .png()
    .toBuffer();

    // 5. Save the new 4-grid image to storyboard/generated/
    const masterFilename = `storyboard-${sceneNumber}.png`;
    const masterPath = path.join(generatedDir, masterFilename);
    fs.writeFileSync(masterPath, compositeImage);

    const masterDataUri = `data:image/png;base64,${compositeImage.toString('base64')}`;

    return { 
      success: true, 
      message: `Updated Panel ${gridNumber} and re-composited Storyboard ${sceneNumber}.`,
      masterDataUri 
    };
  } catch (error: any) {
    console.error('Failed to process revised panel and recomposite:', error);
    return { success: false, message: error.message || 'Failed to update composite image.' };
  }
}
