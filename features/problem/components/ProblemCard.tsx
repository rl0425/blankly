"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { CheckCircle, XCircle } from "lucide-react";
import type { Problem } from "@/shared/types";

interface ProblemCardProps {
  problem: Problem;
  userAnswer?: string;
  onAnswerChange: (answer: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
  children?: React.ReactNode;
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
          <CardTitle className="text-lg">{problem.question}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{problem.explanation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

