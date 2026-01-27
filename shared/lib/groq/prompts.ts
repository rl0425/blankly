import { Difficulty, ProblemType } from '@/shared/types';

export function getAnalyzeContentPrompt(
  content: string,
  difficulty: Difficulty = 'medium',
  _problemType: ProblemType = 'fill_blank'
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
- 경미한 오타는 허용 (예: "렉시컬" = "렉시칼")
- **서술형**: 정답 키워드가 있어도 틀린 내용이 포함되면 부분 정답 처리 또는 오답`,
    
    normal: `
**채점 기준: 보통 (Normal)**
- 의미가 유사하면 정답
- 경미한 오타는 허용 (1-2글자)
- 한글/영어 번역 모두 허용
- 동의어, 유사 표현 허용
- alternatives 참고
- **서술형 특별 규칙**:
  * 정답 키워드가 포함되어 있더라도, **틀린 내용이 있으면 반드시 지적**
  * 크리티컬한 오류(예: 반대 개념, 잘못된 사실)가 있으면 오답 처리
  * 부분적으로 맞는 경우: 점수 차등 부여 (예: 50점, 70점)
  * 정답 키워드 + 틀린 내용 = 부분 정답 (점수 차등) 또는 오답 (크리티컬 오류 시)`,
    
    lenient: `
**채점 기준: 느슨 (Lenient)**
- 핵심 키워드만 포함되어도 정답
- 오타 관대하게 허용
- 부분 정답도 정답 처리
- 맥락상 답의 의도가 맞으면 정답
- 추가 설명이 있어도 정답 인정
- **서술형**: 크리티컬한 오류가 아닌 한 관대하게 평가하되, 틀린 부분은 피드백에 포함`
  };

  return `당신은 공정하고 엄격한 채점자입니다.

${strictnessInstructions[strictness]}

문제: ${question}
정답: ${correctAnswer}${alternativesText}
학생 답안: ${userAnswer}

### [의미 없는 답변 처리]
다음과 같은 답변은 **무조건 오답** 처리:
- 단일 특수문자만 입력 (?, !, -, _, 등)
- "모름", "모르겠음", "몰라" 등
- 빈 문자열 또는 공백만 입력
- 문제와 전혀 관련 없는 랜덤 문자열

### [채점 프로세스]

**1단계: 복수 정답 확인**
- correct_answer에 "/" 구분자가 있으면, 각 정답을 분리하여 모두 확인
- 예: "개발 속도 향상 / 트랜스파일 / 번들링" → 3개의 정답 모두 인정
- alternatives 목록에 학생 답안이 포함되어 있으면 **즉시 정답 처리**
- alternatives의 모든 항목을 확인하세요 (첫 번째 정답만 확인하지 말 것)

**2단계: 의미 분석 (서술형의 경우)**
- 정답 키워드가 포함되어 있는지 확인
- **동시에 틀린 내용이 있는지 반드시 확인**
- 크리티컬한 오류(반대 개념, 잘못된 사실)가 있으면 오답 처리
- 부분적으로 맞는 경우: 점수 차등 부여

**3단계: 표현 변형 인정**
- 동의어 인정 (예: "빠른" = "신속한" = "fast" = "quick")
- 번역 인정 (예: "가상" = "Virtual" = "virtual" = "버츄얼" = "버추얼")
- 언어/표기 변형 인정 (한글 ↔ 영어, 대소문자, 띄어쓰기)
- 축약형/풀네임 인정
- 경미한 철자 오류 관대하게 처리

### [서술형 채점 특별 규칙]

**정답 처리 조건**:
1. correct_answer에 "/" 구분이 있으면, 각 정답을 분리하여 모두 확인
   - 예: "개발 속도 향상 / 트랜스파일" → 두 정답 모두 인정
2. alternatives에 포함된 답변 중 하나와 의미가 일치하면 정답
3. correct_answer의 각 정답(또는 "/" 구분 전 전체)과 의미가 일치하면 정답
4. 정답 키워드가 포함되고, 틀린 내용이 없으면 정답
5. 정답 키워드가 포함되지만, **틀린 내용이 있으면**:
   - 크리티컬 오류(반대 개념, 잘못된 사실) → 오답 처리
   - 경미한 오류 → 부분 정답 처리 (점수 차등)

**복수 정답 처리**:
- correct_answer에 "/" 구분으로 여러 정답이 있는 경우, 각각을 모두 정답으로 인정
- 예: correct_answer = "개발 속도 향상 / TypeScript와 JSX 트랜스파일 / 빠른 번들링"
  → "개발 속도 향상", "TypeScript와 JSX 트랜스파일", "빠른 번들링" 모두 정답
- alternatives에도 핵심 키워드가 포함되어 있으면 정답 인정

**예시**:
- 문제: "Vite에서 esbuild를 사용하는 이유를 설명하시오."
- correct_answer: "개발 서버 속도 향상 / TypeScript와 JSX 트랜스파일 / 의존성 사전 번들링"
- alternatives: ["빠른 속도", "트랜스파일", "번들링", "성능", "개발 경험"]
- 학생 답안: "개발 서버 속도 향상" → **정답** (correct_answer의 첫 번째 정답)
- 학생 답안: "TypeScript와 JSX 트랜스파일" → **정답** (correct_answer의 두 번째 정답)
- 학생 답안: "빠른 번들링" → **정답** (alternatives에 포함)
- 학생 답안: "개발 속도를 높이기 위해서이다. 하지만 성능은 느리다" → **오답** (틀린 내용 포함)

**중요**: 
- **alternatives의 모든 항목을 확인**하세요 (첫 번째 정답만 확인하지 말 것)
- 정답 키워드가 있어도 **틀린 내용이 있으면 반드시 지적**
- 크리티컬한 오류는 오답 처리
- 부분 정답은 점수 차등 부여

출력 형식 (JSON):
{
  "is_correct": true/false,
  "score": 0-100,
  "feedback": "피드백 (정답이면 칭찬, 부분 정답이면 맞는 부분과 틀린 부분 구분, 오답이면 정답 힌트)",
  "improvement_tip": "개선 조언 (부분 정답 또는 오답일 경우 틀린 부분 명시)"
}

**피드백 작성 가이드**:
- 정답: "정확합니다! [칭찬 메시지]"
- 부분 정답: "일부 정확하지만, [틀린 부분]은 수정이 필요합니다. [맞는 부분]은 좋습니다."
- 오답: "[틀린 부분]이 잘못되었습니다. [정답 힌트]"

반드시 유효한 JSON 형식으로만 응답하세요.`;
}

