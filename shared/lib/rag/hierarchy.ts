/**
 * 기술 계층 구조 정의
 * 
 * 총 샘플 수: 약 270개
 * - Tier 1 (대분류): 일반 문제
 * - Tier 2 (중분류): 하위 카테고리
 * - Tier 3 (세부 기술): 주요 기술별
 */

export interface TechCategory {
  samples: number;
  subcategories?: Record<string, TechSubcategory | number>;
}

export interface TechSubcategory {
  samples: number;
  technologies?: Record<string, number>;
}

export const TECH_HIERARCHY: Record<string, TechCategory> = {
  '코딩': {
    samples: 5, // 일반 코딩 문제
    subcategories: {
      '프론트엔드': {
        samples: 5,
        technologies: {
          'JavaScript': 10,
          'React': 10,
          'Next.js': 10,
          'Vue': 5,
          'TypeScript': 10,
        }
      },
      '백엔드': {
        samples: 5,
        technologies: {
          'Node.js': 10,
          'Python': 10,
          'Java': 5,
        }
      }
    }
  },
  '영어': {
    samples: 20, // TOEIC 일반
    subcategories: {
      'Part5_문법': 10,
      'Part7_독해': 10,
    }
  },
  '간호사': {
    samples: 10,
    subcategories: {
      'NCLEX-RN': 20,
      '임상간호': 10,
    }
  },
  '자격증': {
    samples: 10,
    subcategories: {
      '정보보안': 10,
      'PMP': 5,
    }
  },
  '기타': {
    samples: 10,
    subcategories: {}
  }
};

/**
 * 계층적 폴백을 위한 부모 찾기
 */
export function findParentCategory(tech: string, domain: string): string | null {
  const domainConfig = TECH_HIERARCHY[domain];
  if (!domainConfig?.subcategories) return null;
  
  for (const [subcat, config] of Object.entries(domainConfig.subcategories)) {
    if (typeof config === 'object' && config.technologies) {
      if (tech in config.technologies) {
        return subcat;
      }
    }
  }
  
  return null;
}

/**
 * 총 샘플 수 계산
 */
export function calculateTotalSamples(): number {
  let total = 0;
  
  for (const [domain, config] of Object.entries(TECH_HIERARCHY)) {
    total += config.samples;
    
    if (config.subcategories) {
      for (const subconfig of Object.values(config.subcategories)) {
        if (typeof subconfig === 'number') {
          total += subconfig;
        } else {
          total += subconfig.samples;
          if (subconfig.technologies) {
            total += Object.values(subconfig.technologies).reduce((sum, count) => sum + count, 0);
          }
        }
      }
    }
  }
  
  return total;
}


