import { GoogleGenerativeAI } from '@google/generative-ai';

const model = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
export const genAI = model.getGenerativeModel({ model: 'gemini-2.0-flash' });
