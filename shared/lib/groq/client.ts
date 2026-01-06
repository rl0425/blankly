import Groq from 'groq-sdk';

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 최신 모델 사용 (llama-3.1-70b-versatile는 decommissioned)
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

