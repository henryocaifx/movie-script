'use server';
/**
 * @fileOverview A Genkit flow that generates visual storyboard panels
 * using the Gemini 2.5 Flash Image (nano-banana) model.
 *
 * - generateVisualStoryboard - A function that handles the visual generation process.
 * - VisualStoryboardInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VisualStoryboardInputSchema = z.object({
  characterImageUri: z.string().describe("A data URI of the character reference image."),
  previousStoryboardUri: z.string().optional().describe("A data URI of the previously generated storyboard for continuity."),
  promptText: z.string().describe("The detailed visual prompt for the current scene."),
  aspectRatio: z.string().default('16:9'),
  resolution: z.string().default('2k'),
});

export type VisualStoryboardInput = z.infer<typeof VisualStoryboardInputSchema>;

export async function generateVisualStoryboard(input: VisualStoryboardInput): Promise<string> {
  return generateVisualStoryboardFlow(input);
}

const generateVisualStoryboardFlow = ai.defineFlow(
  {
    name: 'generateVisualStoryboardFlow',
    inputSchema: VisualStoryboardInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const systemInstruction = `A professional 4-panel storyboard grid in a seamless 2x2 layout. Cinematic realism, shot on ARRI Alexa, 35mm lens, high dynamic range.
Technical Constraints:
Strictly no borders, no gutters, and no dividers between panels.
Strictly no text, labels, numbers, or annotations.
Four distinct photographic scenes captured in a single image.
Grid Composition:
Panel 1 (top left)
Panel 2 (top right)
Panel 3 (bottom left)
Panel 4 (bottom right)
Visual Style: Maintain consistent lighting, color grading, and character appearance across all four panels. Ultra-realistic textures and cinematic film grain.
Resolution: ${input.resolution}. Aspect Ratio: ${input.aspectRatio}.`;

    const promptParts: any[] = [
      { text: systemInstruction },
      { media: { url: input.characterImageUri } }
    ];

    if (input.previousStoryboardUri) {
      promptParts.push({ text: "Reference this previous storyboard output to maintain visual and stylistic continuity for the next sequence:" });
      promptParts.push({ media: { url: input.previousStoryboardUri } });
    }

    promptParts.push({ text: `Generate the following storyboard scene: ${input.promptText}` });

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image',
      prompt: promptParts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate visual storyboard image.');
    }

    return media.url;
  }
);
