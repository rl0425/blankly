# Blankly

AI 기반 스마트 빈칸 채우기 학습 앱

Blankly는 사용자가 업로드한 학습 자료를 AI가 자동으로 분석하여 
빈칸 채우기 및 객관식 문제를 생성하는 학습 플랫폼

## 주요 기능

- 학습 자료 기반 자동 문제 생성 (PDF, 텍스트 지원)
- AI 프롬프트를 통한 문제 생성
- 하이브리드 모드 (자료 + AI 추가 문제)
- 주관식 실시간 AI 채점 (동의어, 번역 인식)
- 객관식 자동 채점
- Day별 학습 진행 관리
- 틀린 문제 복습 기능
- 학습 통계 대시보드

## 기술 스택

### Frontend
- Next.js 14.2 (App Router)
- TypeScript 5.0
- React 18
- TailwindCSS 3.4
- shadcn/ui
- Framer Motion
- Zustand (전역 상태)
- React Query (서버 상태)

### Backend
- Supabase (PostgreSQL, Auth, Storage)
- Groq AI (Llama 3.3 70B)
- Next.js API Routes
- Server Actions

### 기타
- Zod (스키마 검증)
- date-fns (날짜 처리)

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 페이지
│   ├── (main)/            # 메인 서비스
│   │   ├── study/         # 학습 관련
│   │   └── mypage/        # 마이페이지
│   └── api/               # API Routes
├── features/              # 기능별 모듈
│   ├── auth/              # 인증
│   ├── study/             # 학습
│   ├── problem/           # 문제
│   └── mypage/            # 마이페이지
├── shared/                # 공통 요소
│   ├── ui/                # UI 컴포넌트
│   ├── lib/               # 유틸리티
│   ├── hooks/             # 커스텀 훅
│   └── types/             # 타입 정의
└── entities/              # 도메인 모델
```

## 주요 기능 설명

### 문제 생성 모드

1. 내 자료로 문제 만들기
   - 사용자 자료에서만 문제 추출
   - 가장 정확한 범위 학습

2. 하이브리드
   - 자료 기반 문제 + AI 추가 문제
   - 심화 학습에 적합

3. AI가 전부 생성
   - 프롬프트 기반 문제 생성
   - 자료 없이 주제만으로 학습

### 채점 시스템

- 스마트 엄격도 조정
  - 용어/단어: 엄격 (정확히 일치)
  - 짧은 구절: 보통 (유사 표현 허용)
  - 서술형: 느슨 (의미 중심)

- AI 실시간 채점
  - 동의어 인식 (예: "정의된" = "선언된")
  - 번역 인식 (예: "가상" = "Virtual")
  - 오타 관대 처리

### 학습 진행 관리

- 프로젝트 단위 학습
- Day별 문제 세트
- 진행률 추적
- 틀린 문제 자동 저장
- 복습 기능

## 라이선스

MIT

## 개발자

Blankly Team

## 버전

0.1.0 (Alpha)
