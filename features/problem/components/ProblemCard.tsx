"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { Check, Lightbulb, X } from "lucide-react";
import type { Problem } from "@/shared/types";
import { parseCodeInText } from "../lib/parseCode";
import { cn } from "@/shared/lib/utils";

interface ProblemCardProps {
  problem: Problem;
  userAnswer?: string;
  onAnswerChange: (answer: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  children?: React.ReactNode;
}

// 해설에서 정답을 하이라이트하는 함수
function highlightAnswer(explanation: string, answer: string): React.ReactNode {
  if (!explanation || !answer) return explanation;

  // 정답이 해설에 포함되어 있는지 확인 (대소문자 무시)
  const lowerExplanation = explanation.toLowerCase();
  const lowerAnswer = answer.toLowerCase();
  const index = lowerExplanation.indexOf(lowerAnswer);

  if (index === -1) {
    return explanation;
  }

  // 정답 부분을 찾아서 하이라이트
  const before = explanation.slice(0, index);
  const highlighted = explanation.slice(index, index + answer.length);
  const after = explanation.slice(index + answer.length);

  return (
    <>
      {before}
      <span className="font-bold text-primary bg-primary/10 px-1 rounded">
        {highlighted}
      </span>
      {after}
    </>
  );
}

// 빈칸 채우기 문제에서 "빈칸을 채우시오" 부분을 분리하는 함수
function parseFillBlankQuestion(question: string): { instruction: string; content: string } | null {
  // "빈칸을 채우시오" 패턴 찾기 (다양한 구분자와 줄바꿈 지원)
  // 's' flag 대신 [\s\S] 사용 (ES5 호환)
  const patterns = [
    // 콜론으로 구분
    /^(빈칸을\s*채우[시세]?오)[:\s]*\n*([\s\S]+)$/i,
    /^(빈칸을\s*채워\s*넣으[시세]?오)[:\s]*\n*([\s\S]+)$/i,
    /^(빈칸\s*채우기)[:\s]*\n*([\s\S]+)$/i,
    // 마침표로 구분
    /^(빈칸을\s*채우[시세]?오)\.\s*\n*([\s\S]+)$/i,
    /^(빈칸을\s*채워\s*넣으[시세]?오)\.\s*\n*([\s\S]+)$/i,
    // 공백으로만 구분 (최소 2개 이상)
    /^(빈칸을\s*채우[시세]?오)\s{2,}\n*([\s\S]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match && match[2] && match[2].trim().length > 0) {
      return {
        instruction: '빈칸을 채워주세요', // 통일된 문구 사용
        content: match[2].trim(),
      };
    }
  }

  return null;
}

export function ProblemCard({
  problem,
  showResult = false,
  isCorrect = false,
  children,
}: ProblemCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-visible",
        showResult ? (isCorrect ? "border-primary" : "border-destructive") : ""
      )}
    >
      {/* 결과 배지 - 오른쪽 위 모서리 중앙 */}
      {showResult && (
        <div className="absolute -top-3 -right-3 z-50">
          <div className={cn(
            "rounded-full shadow-lg border-2 flex items-center justify-center w-10 h-10",
            isCorrect 
              ? "bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700" 
              : "bg-red-500 border-red-600 dark:bg-red-600 dark:border-red-700"
          )}>
            {isCorrect ? (
              <Check className="h-5 w-5 text-white stroke-[3]" />
            ) : (
              <X className="h-5 w-5 text-white stroke-[3]" />
            )}
          </div>
        </div>
      )}
      
      <CardHeader>
        <div className="flex-1 min-w-0">
          {/* 빈칸 채우기 문제: "빈칸을 채우시오"를 소제목으로 분리 */}
          {problem.question_type === "fill_blank" ? (
            (() => {
              const parsed = parseFillBlankQuestion(problem.question);
              if (parsed) {
                return (
                  <div className="space-y-3">
                    {/* 제목: 빈칸을 채워주세요 */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {parsed.instruction}
                      </span>
                    </div>
                    {/* 빈칸 문제 내용 */}
                    <div className="pl-1">
                      <CardTitle className="text-lg leading-relaxed break-words">
                        {parseCodeInText(parsed.content)}
                      </CardTitle>
                    </div>
                  </div>
                );
              }
              // 패턴이 매치되지 않으면 기존 방식으로 표시
              return (
                <CardTitle className="text-lg leading-relaxed break-words">
                  {parseCodeInText(problem.question)}
                </CardTitle>
              );
            })()
          ) : (
            <CardTitle className="text-lg leading-relaxed break-words">
              {parseCodeInText(problem.question)}
            </CardTitle>
          )}
          {/* 서술형 문제일 때 입력 안내 표시 */}
          {problem.question_type === "essay" && problem.max_length && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              {problem.max_length}자 이내로 답변해주세요
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}

        {showResult && (
          <div className="pt-4 border-t space-y-2">
            {!isCorrect && (
              <div>
                <p className="text-sm font-medium text-destructive">정답:</p>
                <p className="text-sm break-words">{problem.correct_answer}</p>
              </div>
            )}
            {problem.explanation && (
              <div>
                <p className="text-sm font-medium">해설:</p>
                <p className="text-sm text-muted-foreground break-words">
                  {problem.question_type === "fill_blank"
                    ? highlightAnswer(
                        problem.explanation,
                        problem.correct_answer
                      )
                    : problem.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
