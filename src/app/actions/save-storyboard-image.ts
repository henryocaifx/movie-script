'use server';

import sharp from 'sharp';
import { uploadToS3, getFromS3, existsInS3 } from '@/lib/s3';

function getTimestamp() {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '-' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
}

/**
 * Saves an individually generated storyboard image to SeaweedFS:
 *   storyboard/generated/yyyymmdd-hhmm/storyboard-{sceneNumber}.png
 */
export async function saveGeneratedStoryboardAction(
  sceneNumber: number,
  dataUri: string,
  sessionTimestamp: string
) {
  try {
    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Save the main 4-panel image to S3
    const filename = `storyboard-${sceneNumber}.png`;
    const mainKey = `storyboard/generated/${sessionTimestamp}/${filename}`;
    await uploadToS3(mainKey, imageBuffer);

    // 2. Slice the image into 4 grids (2x2) and save to S3
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
      const sliceKey = `storyboard/sliced/${sessionTimestamp}/${sliceFilename}`;
      
      const sliceBuffer = await image
        .clone()
        .extract({
          left: region.left,
          top: region.top,
          width: halfWidth,
          height: halfHeight
        })
        .toBuffer();
      
      await uploadToS3(sliceKey, sliceBuffer);
    }

    return { 
      success: true, 
      message: `Saved ${filename} and sliced grids to SeaweedFS (storyboard/${sessionTimestamp})`, 
      filename 
    };
  } catch (error: any) {
    console.error('Failed to save generated storyboard image to S3:', error);
    return { success: false, message: error.message || 'Failed to save image to object storage.' };
  }
}

/**
 * Saves an archived exported storyboard image to SeaweedFS:
 *   storyboard/{subDir}/storyboard-{index+1}.png
 */
export async function saveStoryboardImageAction(index: number, dataUri: string, subDir?: string) {
  try {
    let baseKey = 'storyboard';
    if (subDir) {
      baseKey = `${baseKey}/${subDir}`;
    }

    const base64Data = dataUri.split(',')[1];
    if (!base64Data) throw new Error('Invalid image data format');

    const filename = `storyboard-${index + 1}.png`;
    const key = `${baseKey}/${filename}`;

    await uploadToS3(key, Buffer.from(base64Data, 'base64'));

    return {
      success: true,
      message: `Successfully saved ${filename} to SeaweedFS path: ${baseKey}.`,
      filename,
      path: baseKey
    };
  } catch (error: any) {
    console.error('Failed to save storyboard image to S3:', error);
    return { success: false, message: error.message || 'Failed to save image to object storage.' };
  }
}

/**
 * Reads a generated storyboard image from SeaweedFS and returns it as a data URI.
 */
export async function getGeneratedStoryboardAction(
  sceneNumber: number,
  sessionTimestamp: string
) {
  try {
    const filename = `storyboard-${sceneNumber}.png`;
    const key = `storyboard/generated/${sessionTimestamp}/${filename}`;

    const imageBuffer = await getFromS3(key);
    if (!imageBuffer) {
      return { success: false, message: `Image not found in S3: ${key}` };
    }

    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read generated storyboard image from S3:', error);
    return { success: false, message: error.message || 'Failed to read image from object storage.' };
  }
}

/**
 * Reads a sliced grid image from SeaweedFS and returns it as a data URI.
 */
export async function getSlicedGridAction(
  sceneNumber: number,
  gridNumber: number,
  sessionTimestamp: string
) {
  try {
    const filename = `storyboard-${sceneNumber}-grid-${gridNumber}.png`;
    const key = `storyboard/sliced/${sessionTimestamp}/${filename}`;

    const imageBuffer = await getFromS3(key);
    if (!imageBuffer) {
      return { success: false, message: `Sliced image not found in S3: ${key}` };
    }

    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    return { success: true, dataUri, filename };
  } catch (error: any) {
    console.error('Failed to read sliced grid image from S3:', error);
    return { success: false, message: error.message || 'Failed to read sliced image from object storage.' };
  }
}

/**
 * Processes a revised panel: resizes it to match original, replaces original grid in S3,
 * and re-composites the entire master storyboard in S3.
 */
export async function saveRevisedPanelImageAction(
  sceneNumber: number,
  gridNumber: number,
  revisedDataUri: string,
  sessionTimestamp: string
) {
  try {
    const originalGridKey = `storyboard/sliced/${sessionTimestamp}/storyboard-${sceneNumber}-grid-${gridNumber}.png`;
    
    const originalGridBuffer = await getFromS3(originalGridKey);
    if (!originalGridBuffer) {
      throw new Error(`Original grid not found in S3: ${originalGridKey}`);
    }

    // 1. Get original dimensions
    const originalMetadata = await sharp(originalGridBuffer).metadata();
    if (!originalMetadata.width || !originalMetadata.height) {
      throw new Error('Could not read original grid dimensions');
    }

    // 2. Process revised image: Resize to match original exactly
    const revisedBuffer = Buffer.from(revisedDataUri.split(',')[1], 'base64');
    const processedRevisedBuffer = await sharp(revisedBuffer)
      .resize(originalMetadata.width, originalMetadata.height, { fit: 'fill' })
      .toBuffer();

    // 3. Replace original grid image in S3
    await uploadToS3(originalGridKey, processedRevisedBuffer);

    // 4. Combine all four grid photos as the new storyboard image
    const gridKeys = [1, 2, 3, 4].map(g => `storyboard/sliced/${sessionTimestamp}/storyboard-${sceneNumber}-grid-${g}.png`);
    
    const gridBuffers: Buffer[] = [];
    for (const key of gridKeys) {
      const buf = await getFromS3(key);
      if (!buf) {
        throw new Error(`Missing grid component in S3 for re-compositing: ${key}`);
      }
      gridBuffers.push(buf);
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
      { input: gridBuffers[0], left: 0, top: 0 },
      { input: gridBuffers[1], left: originalMetadata.width, top: 0 },
      { input: gridBuffers[2], left: 0, top: originalMetadata.height },
      { input: gridBuffers[3], left: originalMetadata.width, top: originalMetadata.height },
    ])
    .png()
    .toBuffer();

    // 5. Save the new 4-grid image to storyboard/generated/ in S3
    const masterFilename = `storyboard-${sceneNumber}.png`;
    const masterKey = `storyboard/generated/${sessionTimestamp}/${masterFilename}`;
    await uploadToS3(masterKey, compositeImage);

    const masterDataUri = `data:image/png;base64,${compositeImage.toString('base64')}`;

    return { 
      success: true, 
      message: `Updated Panel ${gridNumber} and re-composited Storyboard ${sceneNumber} in SeaweedFS.`,
      masterDataUri 
    };
  } catch (error: any) {
    console.error('Failed to process revised panel and recomposite in S3:', error);
    return { success: false, message: error.message || 'Failed to update composite image in object storage.' };
  }
}
