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
  userAnswer: string,
  alternatives?: string[],
  strictness: "strict" | "normal" | "lenient" = "normal"
) {
  const alternativesText = alternatives && alternatives.length > 0
    ? `\n인정되는 대체 정답들: ${alternatives.join(", ")}`
    : "";

  const strictnessInstructions = {
    strict: `
**채점 기준: 엄격 (Strict) - 용어/단어 문제용**
- **최우선**: alternatives 목록을 먼저 확인! alternatives에 있으면 무조건 정답
- 정답 또는 alternatives와 **정확히 일치**하거나 **완벽한 동의어**면 정답
- 대소문자 무시 (예: "DOM" = "dom")
- 띄어쓰기 무시 (예: "실행컨텍스트" = "실행 컨텍스트")
- **명백한 동의어 허용** (예: "정의된" = "선언된", "생성" = "만들기")
- 하지만 **전혀 다른 개념**은 오답 (예: "버츄얼" ≠ "실행 컨텍스트")
- 경미한 오타는 허용 (예: "렉시컬" = "렉시칼")`,
    
    normal: `
**채점 기준: 보통 (Normal)**
- 의미가 유사하면 정답
- 경미한 오타는 허용 (1-2글자)
- 한글/영어 번역 모두 허용
- 동의어, 유사 표현 허용
- alternatives 참고`,
    
    lenient: `
**채점 기준: 느슨 (Lenient)**
- 핵심 키워드만 포함되어도 정답
- 오타 관대하게 허용
- 부분 정답도 정답 처리
- 맥락상 답의 의도가 맞으면 정답
- 추가 설명이 있어도 정답 인정`
  };

  return `당신은 공정한 채점자입니다.

${strictnessInstructions[strictness]}

문제: ${question}
정답: ${correctAnswer}${alternativesText}
학생 답안: ${userAnswer}

채점 기준 (다음 중 하나라도 해당하면 정답):
1. **의미가 같으면 정답**
   - 동의어 인정 (예: "빠른" = "신속한" = "fast" = "quick")
   - 번역 인정 (예: "가상" = "Virtual" = "virtual" = "버츄얼" = "버추얼")
   
2. **언어/표기 변형 모두 인정**
   - 한글 ↔ 영어 (예: "돔" = "DOM" = "dom")
   - 대소문자 무시 (예: "JavaScript" = "javascript" = "JAVASCRIPT")
   - 띄어쓰기 무시 (예: "자바스크립트" = "자바 스크립트")
   
3. **축약형/풀네임 모두 인정**
   - "JS" = "JavaScript" = "자바스크립트"
   - "HTML" = "HyperText Markup Language"
   
4. **경미한 철자 오류 관대하게**
   - "버츄얼" = "버추얼" = "버쳬얼"
   - "리액트" = "리엑트"

5. **숫자/단위 변형**
   - "10개" = "10" = "십" = "ten"

**중요**: 
- **엄격 모드**에서는 정답/alternatives와 정확히 일치하는 것만 정답!
- **보통/느슨 모드**에서는 학생이 핵심 개념을 이해했다면 표현이 달라도 정답 처리!

출력 형식 (JSON):
{
  "is_correct": true/false,
  "score": 0-100,
  "feedback": "피드백 (정답이면 칭찬, 오답이면 정답 힌트)",
  "improvement_tip": "개선 조언 (오답일 경우만)"
}

반드시 유효한 JSON 형식으로만 응답하세요.`;
}

