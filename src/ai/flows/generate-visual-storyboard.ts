'use server';
/**
 * @fileOverview A Genkit flow that generates visual storyboard panels
 * using the Gemini 3.1 Flash Image Preview model.
 *
 * - generateVisualStoryboard - A function that handles the visual generation process.
 * - VisualStoryboardInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CharacterReferenceSchema = z.object({
  name: z.string().describe("The name of the character."),
  imageUri: z.string().describe("A data URI of the character reference image."),
});

const VisualStoryboardInputSchema = z.object({
  characters: z.array(CharacterReferenceSchema).describe("List of character names and their reference images."),
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
Visual Style: Maintain consistent lighting, color grading, and character appearance across all four panels based on the provided character references. Ultra-realistic textures and cinematic film grain.
Resolution: ${input.resolution}. Aspect Ratio: ${input.aspectRatio}.`;

    const promptParts: any[] = [
      { text: systemInstruction },
    ];

    if (input.characters.length > 0) {
      promptParts.push({ text: "The following images are reference portraits for the characters in the script. Please ensure their appearances match these references exactly whenever they appear in theStoryboard panels:" });
      input.characters.forEach(char => {
        promptParts.push({ text: `Character Name: ${char.name}` });
        promptParts.push({ media: { url: char.imageUri } });
      });
    }

    if (input.previousStoryboardUri) {
      promptParts.push({ text: "Reference this previous storyboard output to maintain visual and stylistic continuity for the next sequence:" });
      promptParts.push({ media: { url: input.previousStoryboardUri } });
    }

    promptParts.push({ text: `Generate the following storyboard scene: ${input.promptText}` });

    const { media } = await ai.generate({
      model: 'googleai/gemini-3.1-flash-image-preview',
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
