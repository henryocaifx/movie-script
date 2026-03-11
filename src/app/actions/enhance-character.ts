'use server';

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const COMFY_URL = 'http://localhost:8189';

export async function enhanceCharacterAction(
  sceneNumber: number,
  gridNumber: number,
  sessionTimestamp: string
) {
  try {
    const slicedDir = path.join(process.cwd(), 'storyboard', 'sliced', sessionTimestamp);
    const inputFilename = `storyboard-${sceneNumber}-grid-${gridNumber}.png`;
    const inputPath = path.join(slicedDir, inputFilename);
    const outputFilename = `storyboard-${sceneNumber}-grid-${gridNumber}-sc.png`;
    const outputPath = path.join(slicedDir, outputFilename);

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Sliced image not found: ${inputPath}`);
    }

    // 1. Upload image to ComfyUI
    const imageBuffer = fs.readFileSync(inputPath);
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('image', blob, inputFilename);
    formData.append('overwrite', 'true');

    const uploadResponse = await fetch(`${COMFY_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image to ComfyUI: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const comfyFilename = uploadData.name;

    // 2. Prepare workflow
    const workflowPath = path.join(process.cwd(), 'public', 'z-i2i.json');
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

    // Update the input image filename in node 958
    if (workflow["958"] && workflow["958"].inputs) {
      workflow["958"].inputs.image = comfyFilename;
    }

    // 3. Queue prompt
    const promptResponse = await fetch(`${COMFY_URL}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptResponse.ok) {
      throw new Error(`Failed to queue prompt in ComfyUI: ${promptResponse.statusText}`);
    }

    const promptData = await promptResponse.json();
    const promptId = promptData.prompt_id;
    console.log(`[ComfyUI] Prompt queued, ID: ${promptId}`);

    // 4. Wait for completion
    let completed = false;
    let outputImageData: any = null;

    // Max wait 10 minutes (120 * 5s)
    const maxRetries = 120;
    for (let i = 0; i < maxRetries; i++) {
      process.stdout.write(`.`); // Simple progress indicator in terminal
      await new Promise(resolve => setTimeout(resolve, 5000));

      const historyResponse = await fetch(`${COMFY_URL}/history/${promptId}`);
      if (!historyResponse.ok) continue;

      const historyData = await historyResponse.json();
      if (historyData[promptId]) {
        console.log(`\n[ComfyUI] Prompt ${promptId} finished execution.`);
        const historyEntry = historyData[promptId];
        
        // Check for node errors
        if (historyEntry.status?.messages) {
            const errors = historyEntry.status.messages.filter((m: any) => m[0] === 'error');
            if (errors.length > 0) {
                console.error('[ComfyUI] Execution Errors:', JSON.stringify(errors, null, 2));
                throw new Error(`ComfyUI Error: ${errors[0][1]?.message || 'Unknown node error'}`);
            }
        }

        completed = true;
        
        // Log available outputs for debugging
        const availableNodes = Object.keys(historyEntry.outputs);
        console.log(`[ComfyUI] Available output nodes: ${availableNodes.join(', ')}`);

        // Find the output from node 984 (PreviewImage) or 950 (InpaintStitchImproved)
        // Node 984 is "Output 2 Post-Face Detail"
        const nodeOutput = historyEntry.outputs["984"];
        if (nodeOutput && nodeOutput.images && nodeOutput.images.length > 0) {
          outputImageData = nodeOutput.images[0];
          console.log(`[ComfyUI] Found output in node 984`);
          break;
        }
        
        // Fallback to node 950
        const fallbackOutput = historyEntry.outputs["950"];
        if (fallbackOutput && fallbackOutput.images && fallbackOutput.images.length > 0) {
            outputImageData = fallbackOutput.images[0];
            console.log(`[ComfyUI] Found output in node 950`);
            break;
        }

        // Final fallback: any node that has images
        for (const nodeId of availableNodes) {
            const out = historyEntry.outputs[nodeId];
            if (out.images && out.images.length > 0) {
                outputImageData = out.images[0];
                console.log(`[ComfyUI] Found fallback output in node ${nodeId}`);
                break;
            }
        }
        break;
      }
    }

    if (!completed) {
      throw new Error(`ComfyUI prompt ${promptId} timed out after 10 minutes.`);
    }

    if (!outputImageData) {
      throw new Error(`ComfyUI prompt ${promptId} completed but produced no image output.`);
    }

    // 5. Download output image
    const outputUrl = `${COMFY_URL}/view?filename=${outputImageData.filename}&subfolder=${outputImageData.subfolder || ''}&type=${outputImageData.type || 'output'}`;
    const imageResponse = await fetch(outputUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download output image from ComfyUI: ${imageResponse.statusText}`);
    }

    const enhancedBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 6. Resize to match original input dimension
    const inputMetadata = await sharp(imageBuffer).metadata();
    if (!inputMetadata.width || !inputMetadata.height) {
        throw new Error('Could not determine original image dimensions');
    }

    const finalBuffer = await sharp(enhancedBuffer)
      .resize(inputMetadata.width, inputMetadata.height, { fit: 'fill' })
      .toBuffer();

    // 7. Overwrite original grid with enhanced version
    fs.writeFileSync(inputPath, finalBuffer);

    // 8. Re-composite the master storyboard image (4-panel grid)
    const generatedDir = path.join(process.cwd(), 'storyboard', 'generated', sessionTimestamp);
    if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

    // Load all four grid photos
    const grids = [1, 2, 3, 4].map(g => path.join(slicedDir, `storyboard-${sceneNumber}-grid-${g}.png`));
    
    for (const gPath of grids) {
      if (!fs.existsSync(gPath)) {
        throw new Error(`Missing grid component for re-compositing: ${gPath}`);
      }
    }

    // Master image should be 2x original grid size
    const masterWidth = inputMetadata.width * 2;
    const masterHeight = inputMetadata.height * 2;

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
      { input: grids[1], left: inputMetadata.width, top: 0 },
      { input: grids[2], left: 0, top: inputMetadata.height },
      { input: grids[3], left: inputMetadata.width, top: inputMetadata.height },
    ])
    .png()
    .toBuffer();

    // 9. Save the new master 4-grid image
    const masterFilename = `storyboard-${sceneNumber}.png`;
    const masterPath = path.join(generatedDir, masterFilename);
    fs.writeFileSync(masterPath, compositeImage);

    const masterDataUri = `data:image/png;base64,${compositeImage.toString('base64')}`;

    return {
      success: true,
      message: `Enhanced Character and updated Master Storyboard ${sceneNumber}.`,
      filename: masterFilename,
      path: masterPath,
      masterDataUri
    };
  } catch (error: any) {
    console.error('Enhancement Failed:', error);
    return { success: false, message: error.message || 'Failed to enhance character.' };
  }
}
