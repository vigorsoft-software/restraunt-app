'use server';
/**
 * @fileOverview A Genkit flow for generating appetizing dish descriptions from a list of ingredients.
 *
 * - generateDishDescription - A function that handles the dish description generation process.
 * - GenerateDishDescriptionInput - The input type for the generateDishDescription function.
 * - GenerateDishDescriptionOutput - The return type for the generateDishDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDishDescriptionInputSchema = z.object({
  ingredients: z
    .array(z.string())
    .min(1)
    .describe('A list of raw ingredients for the dish.'),
});
export type GenerateDishDescriptionInput = z.infer<
  typeof GenerateDishDescriptionInputSchema
>;

const GenerateDishDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('An appetizing, creative, and concise description of the dish.'),
});
export type GenerateDishDescriptionOutput = z.infer<
  typeof GenerateDishDescriptionOutputSchema
>;

export async function generateDishDescription(
  input: GenerateDishDescriptionInput
): Promise<GenerateDishDescriptionOutput> {
  return generateDishDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDishDescriptionPrompt',
  input: {schema: GenerateDishDescriptionInputSchema},
  output: {schema: GenerateDishDescriptionOutputSchema},
  prompt: `You are a world-renowned chef and a master of culinary descriptions. Your task is to craft an enticing and mouth-watering description for a dish, using only the provided list of ingredients.

Be creative, concise, and highlight the unique flavors and textures that these ingredients would bring to a gourmet dining experience. Avoid simply listing the ingredients; instead, weave them into a compelling narrative that makes diners eager to try the dish.

Ingredients:
{{#each ingredients}}- {{{this}}}
{{/each}}`,
});

const generateDishDescriptionFlow = ai.defineFlow(
  {
    name: 'generateDishDescriptionFlow',
    inputSchema: GenerateDishDescriptionInputSchema,
    outputSchema: GenerateDishDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
