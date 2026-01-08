import Groq from 'groq-sdk';

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqInstance) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqInstance;
}

// Backward compatibility: groq 변수로도 접근 가능
export const groq = {
  get chat() {
    return getGroqClient().chat;
  }
};

// 최신 모델 사용 (llama-3.1-70b-versatile는 decommissioned)
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

