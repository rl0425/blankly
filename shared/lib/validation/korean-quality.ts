/**
 * 한국어 품질 검증 시스템
 * 
 * 기능:
 * - 구어체 감지 (해요체 → 합니다체)
 * - 콩글리시 감지
 * - 문법 검사 (기본)
 */

export interface KoreanQualityIssue {
  type: 'informal' | 'konglish' | 'grammar';
  position: string;
  original: string;
  suggestion: string;
}

/**
 * 한국어 품질 검증
 */
export function validateKoreanQuality(text: string): KoreanQualityIssue[] {
  const issues: KoreanQualityIssue[] = [];
  
  // 1. 구어체 감지
  const informalPatterns = [
    { pattern: /해요(?!\S)/g, formal: '합니다' },
    { pattern: /이에요(?!\S)/g, formal: '입니다' },
    { pattern: /거예요(?!\S)/g, formal: '것입니다' },
    { pattern: /아요(?!\S)/g, formal: '습니다' },
    { pattern: /~ㄴ데(?!\S)/g, formal: '~습니다만' },
    { pattern: /~네요(?!\S)/g, formal: '~습니다' },
  ];
  
  for (const { pattern, formal } of informalPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      issues.push({
        type: 'informal',
        position: `Index ${match.index}`,
        original: match[0],
        suggestion: formal,
      });
    }
  }
  
  // 2. 콩글리시 감지
  const konglishMap: Record<string, string> = {
    '체크': '확인',
    '케어': '관리',
    '매니지': '관리',
    '컨트롤': '제어',
    '핸들': '처리',
    '리스트': '목록',
    '셋팅': '설정',
    '컨펌': '확인',
    '메뉴얼': '설명서',
    '스케줄': '일정',
  };
  
  for (const [konglish, korean] of Object.entries(konglishMap)) {
    if (text.includes(konglish)) {
      issues.push({
        type: 'konglish',
        position: `Contains "${konglish}"`,
        original: konglish,
        suggestion: korean,
      });
    }
  }
  
  // 3. 기타 품질 이슈
  // 띄어쓰기 이중 체크 (간단)
  if (/\s{2,}/.test(text)) {
    issues.push({
      type: 'grammar',
      position: 'Multiple spaces detected',
      original: '연속된 공백',
      suggestion: '단일 공백 사용',
    });
  }
  
  return issues;
}

/**
 * 한국어 품질 점수 계산
 */
export function calculateKoreanQualityScore(text: string): number {
  const issues = validateKoreanQuality(text);
  
  // 기본 점수 10점
  let score = 10;
  
  // 이슈당 감점
  issues.forEach(issue => {
    switch (issue.type) {
      case 'informal':
        score -= 2;  // 구어체는 심각
        break;
      case 'konglish':
        score -= 1;  // 콩글리시는 중간
        break;
      case 'grammar':
        score -= 0.5;  // 문법은 경미
        break;
    }
  });
  
  return Math.max(0, score);
}


