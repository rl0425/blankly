import { Difficulty, ProblemType } from '@/shared/types';

export function getAnalyzeContentPrompt(
  content: string,
  difficulty: Difficulty = 'medium',
  problemType: ProblemType = 'fill_blank'
) {
  return `당신은 교육 콘텐츠 전문가입니다. 
사용자가 제공한 학습 자료를 분석하고, 효과적인 빈칸 채우기 문제를 만드세요.

# 입력 자료
${content}

# 빈칸 생성 규칙
1. **중요도 기반 선택**
   - 핵심 개념, 용어, 숫자, 고유명사 우선
   - 문맥상 중요한 단어/구절
   - 학습 효과가 높은 부분

2. **난이도 조절** (요청 난이도: ${difficulty})
   - Easy: 명확한 답이 있는 단어 (예: 고유명사, 숫자)
   - Medium: 문맥 파악 필요한 단어 (예: 동사, 형용사)
   - Hard: 추론 필요한 구절 (예: 개념 정의)

3. **빈칸 개수**
   - 문장당 1-2개 빈칸
   - 너무 많으면 문제가 모호해짐
   - 최소 문맥은 남겨둘 것

4. **다양성**
   - 다양한 유형의 단어 선택
   - 명사만 빈칸 ❌
   - 동사, 형용사, 숫자, 개념 등 골고루

# 출력 형식 (JSON만 반환)
{
  "segments": [
    {
      "original": "원본 문장 전체",
      "blank_version": "빈칸이 들어간 문장 (빈칸은 _____ 로 표시)",
      "blanked_words": [
        {
          "word": "빈칸으로 만든 단어",
          "position": 0,
          "hint": "힌트 (선택적)",
          "alternatives": ["유사 정답1", "유사 정답2"]
        }
      ],
      "difficulty": "easy" | "medium" | "hard",
      "explanation": "왜 이 단어가 중요한지",
      "order": 1
    }
  ],
  "summary": {
    "total_sentences": 50,
    "total_blanks": 75,
    "difficulty_distribution": {
      "easy": 30,
      "medium": 35,
      "hard": 10
    },
    "suggested_days": 5
  }
}

반드시 유효한 JSON 형식으로만 응답하세요.`;
}

export function getGradeAnswerPrompt(
  question: string,
  correctAnswer: string,
  userAnswer: string
) {
  return `당신은 공정한 채점자입니다.

문제: ${question}
정답: ${correctAnswer}
학생 답안: ${userAnswer}

채점 기준:
- 의미가 같으면 정답
- 철자 오류는 관대하게
- 대소문자 구분 안 함
- 공백, 특수문자 무시

출력 형식 (JSON):
{
  "is_correct": true/false,
  "score": 0-100,
  "feedback": "피드백",
  "improvement_tip": "개선 조언 (오답일 경우)"
}

반드시 유효한 JSON 형식으로만 응답하세요.`;
}

