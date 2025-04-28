import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function geminiApiRequest(contents: any) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return text;
}