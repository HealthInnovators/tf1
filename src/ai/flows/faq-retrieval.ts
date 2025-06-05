'use server';

/**
 * @fileOverview This file defines a Genkit flow for answering user queries based on a predefined FAQ.
 *
 * - answerFaq - A function that takes a user query as input and returns an answer from the FAQ.
 * - AnswerFaqInput - The input type for the answerFaq function.
 * - AnswerFaqOutput - The return type for the answerFaq function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerFaqInputSchema = z.object({
  query: z.string().describe('The user query about T-Fiber services.'),
  faq: z.string().describe('The predefined FAQ content.'),
});
export type AnswerFaqInput = z.infer<typeof AnswerFaqInputSchema>;

const AnswerFaqOutputSchema = z.object({
  answer: z.string().describe('The answer to the user query based on the FAQ.'),
});
export type AnswerFaqOutput = z.infer<typeof AnswerFaqOutputSchema>;

export async function answerFaq(input: AnswerFaqInput): Promise<AnswerFaqOutput> {
  return answerFaqFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerFaqPrompt',
  input: {schema: AnswerFaqInputSchema},
  output: {schema: AnswerFaqOutputSchema},
  prompt: `You are a chatbot for T-Fiber, a broadband internet provider. Use the following FAQ to answer the user's query. If the FAQ does not contain the answer, respond that you do not know.

FAQ:
{{{faq}}}

Query: {{{query}}}

Answer: `,
});

const answerFaqFlow = ai.defineFlow(
  {
    name: 'answerFaqFlow',
    inputSchema: AnswerFaqInputSchema,
    outputSchema: AnswerFaqOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
