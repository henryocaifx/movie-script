'use server';
/**
 * @fileOverview A Genkit flow that generates a multi-scene cinematic storyboard
 * based on user-provided character details and a basic movie idea.
 *
 * - generateCinematicStoryboard - A function that handles the storyboard generation process.
 * - GenerateCinematicStoryboardInput - The input type for the generateCinematicStoryboard function.
 * - GenerateCinematicStoryboardOutput - The return type for the generateCinematicStoryboard function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCinematicStoryboardInputSchema = z.object({
  charactersDescription: z.string().describe('A description of the characters involved in the movie, including their number, names, and key traits. Example: "A brave knight named Sir Reginald and a cunning sorceress named Maleficent." or "Three characters: a young scientist, her robot companion, and a mischievous alien."'),
  movieIdea: z.string().describe('The basic plot idea or premise for the movie. Example: "A quest to find a magical artifact that can save their dying world."'),
  previousContext: z.string().optional().describe('Text context from previous scenes or storyboards to ensure narrative continuity.'),
});
export type GenerateCinematicStoryboardInput = z.infer<typeof GenerateCinematicStoryboardInputSchema>;

// The output is a raw string formatted with specific markers as described in the prompt.
const GenerateCinematicStoryboardOutputSchema = z.string().describe('The generated multi-scene cinematic storyboard as a string, formatted with SCENE_START, PANEL_X, IMAGE_PROMPT, and SCENE_END markers for each scene.');
export type GenerateCinematicStoryboardOutput = z.infer<typeof GenerateCinematicStoryboardOutputSchema>;

export async function generateCinematicStoryboard(input: GenerateCinematicStoryboardInput): Promise<GenerateCinematicStoryboardOutput> {
  return generateCinematicStoryboardFlow(input);
}

const cinematicStoryboardPrompt = ai.definePrompt({
  name: 'cinematicStoryboardPrompt',
  input: { schema: GenerateCinematicStoryboardInputSchema },
  model: 'googleai/gemini-3-flash-preview',
  prompt: `You are a Professional Cinematographer and Prompt Engineer. Your goal is to expand a basic idea into a logically paced multi-scene storyboard.

Here is the movie idea and character information:
Characters: {{{charactersDescription}}}
Movie Idea: {{{movieIdea}}}
{{#if previousContext}}
Previous Storyboard Context (for narrative and visual style continuity ONLY — do NOT continue the scene numbering from these documents):
{{{previousContext}}}
{{/if}}

Task:
1. Analyze the provided character details and basic movie idea.
2. Determine the necessary number of scenes to tell a full story arc, ensuring logical pacing. You MUST generate between 2 and 4 scenes (min=2, max=4).
3. CRITICAL: Scene numbering MUST ALWAYS start at 1 for this new storyboard. The first scene is SCENE_START: 1, the second is SCENE_START: 2, and so on. Never carry over scene numbers from a previous context.
4. For each scene, create a 4-grid storyboard layout.
5. Crucially, ensure strict character consistency across all scenes and panels. Character clothing, age, and features must remain identical throughout the storyboard. Describe this consistency clearly in your panel descriptions and especially in the IMAGE_PROMPT.
6. Use technical camera terms (e.g., "wide shot," "close-up," "dolly zoom," "rim lighting," "anamorphic lens," "tracking shot," "dutch angle," "macro focus") in your descriptions to convey specific visual intentions.
7. Focus heavily on visual action, character expressions, and environmental details rather than dialogue. Assume any dialogue will be added later.
8. The "IMAGE_PROMPT" for each scene must be a single, highly detailed paragraph, optimized for high-end AI image generators. It should combine visual elements from all four panels of that scene, explicitly mentioning camera angles, lighting, character consistency, and atmospheric details to create a cohesive 4-grid image. Ensure it is explicitly for an 8k cinematic output.

Strictly adhere to the following output format for every scene. Do not include any additional text, introductory/concluding remarks, or explanations outside of this exact format. Output one "---" marker after each SCENE_END block:

---
SCENE_START: [Scene Number, beginning at 1]
PANEL_1: [Detailed visual description for panel 1, including camera angle and action]
PANEL_2: [Detailed visual description for panel 2, including camera angle and action]
PANEL_3: [Detailed visual description for panel 3, including camera angle and action]
PANEL_4: [Detailed visual description for panel 4, including camera angle and action]
IMAGE_PROMPT: [A high-detail, 8k, cinematic, single-paragraph prompt for a 4-grid layout combining all visual elements for this scene, emphasizing character consistency, lighting, camera angles, and atmosphere. Example: "An 8k cinematic 4-grid storyboard layout. Panel 1: Wide shot, a lone figure in a tattered cloak stands atop a windswept peak under a stormy sky, backlit by distant lightning. Panel 2: Close-up, the figure's determined face, eyes narrowed, rain dripping from a consistent tattered cloak. Panel 3: Low angle, the figure's gloved hand grips a worn sword, reflected in a puddle. Panel 4: Medium shot, the figure begins a slow descent down the rocky path, the same tattered cloak billowing in the wind. Consistent character features, tattered cloak, and sword throughout."]
SCENE_END
---

Begin generating the storyboard now. Remember: the first scene MUST be SCENE_START: 1.`,
});

const generateCinematicStoryboardFlow = ai.defineFlow(
  {
    name: 'generateCinematicStoryboardFlow',
    inputSchema: GenerateCinematicStoryboardInputSchema,
    outputSchema: GenerateCinematicStoryboardOutputSchema,
  },
  async (input) => {
    const response = await cinematicStoryboardPrompt(input);
    return response.text;
  }
);
