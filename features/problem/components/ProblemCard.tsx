"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { CheckCircle, XCircle } from "lucide-react";
import type { Problem } from "@/shared/types";
import { parseCodeInText } from "../lib/parseCode";

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

export function ProblemCard({
  problem,
  userAnswer = "",
  onAnswerChange,
  showResult = false,
  isCorrect = false,
  children,
}: ProblemCardProps) {
  return (
    <Card className={showResult ? (isCorrect ? "border-primary" : "border-destructive") : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-relaxed">
              {parseCodeInText(problem.question)}
            </CardTitle>
            {/* 서술형 문제일 때 입력 안내 표시 */}
            {problem.question_type === "essay" && problem.max_length && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 {problem.max_length}자 이내로 답변해주세요
              </p>
            )}
          </div>
          {showResult && (
            <div className="flex-shrink-0 ml-2">
              {isCorrect ? (
                <CheckCircle className="h-6 w-6 text-primary" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
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
                <p className="text-sm">{problem.correct_answer}</p>
              </div>
            )}
            {problem.explanation && (
              <div>
                <p className="text-sm font-medium">해설:</p>
                <p className="text-sm text-muted-foreground">
                  {problem.question_type === "fill_blank" 
                    ? highlightAnswer(problem.explanation, problem.correct_answer)
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

