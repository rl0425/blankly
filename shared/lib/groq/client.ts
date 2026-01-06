import Groq from 'groq-sdk';

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const DEFAULT_MODEL = 'llama-3.1-70b-versatile';

