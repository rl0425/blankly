"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/button";
import { Progress } from "@/shared/ui/components/progress";
import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";
import { ProblemCard } from "@/features/problem/components/ProblemCard";
import { AnswerInput } from "@/features/problem/components/AnswerInput";
import { useToast } from "@/shared/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Problem, Room } from "@/shared/types";

export default function RoomProblemPage({
  params,
}: {
  params: Promise<{ projectId: string; roomId: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{
    projectId: string;
    roomId: string;
  } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const loadData = useCallback(async () => {
    if (!resolvedParams) return;

    setLoading(true);
    
    // Mock data for demonstration
    // In real implementation, fetch from API
    setRoom({
      id: resolvedParams.roomId,
      project_id: resolvedParams.projectId,
      title: "Day 1: 기초 문법",
      day_number: 1,
      total_problems: 5,
      problem_type: "fill_blank",
      difficulty: "easy",
      status: "not_started",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setProblems([
      {
        id: "1",
        room_id: resolvedParams.roomId,
        question: "React는 _____ 라이브러리입니다.",
        question_type: "fill_blank",
        correct_answer: "JavaScript",
        explanation: "React는 사용자 인터페이스를 구축하기 위한 JavaScript 라이브러리입니다.",
        difficulty: "easy",
        order_number: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        room_id: resolvedParams.roomId,
        question: "컴포넌트 기반 아키텍처를 사용하며, _____ DOM을 통해 효율적인 렌더링을 제공합니다.",
        question_type: "fill_blank",
        correct_answer: "가상",
        explanation: "React는 가상 DOM을 사용하여 효율적으로 UI를 업데이트합니다.",
        difficulty: "medium",
        order_number: 2,
        created_at: new Date().toISOString(),
      },
    ]);
    
    setLoading(false);
  }, [resolvedParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentProblem = problems[currentIndex];

  const handleAnswer = (answer: string) => {
    if (!currentProblem) return;
    setAnswers({ ...answers, [currentProblem.id]: answer });
  };

  const handleSubmit = () => {
    if (!currentProblem) return;
    
    const userAnswer = answers[currentProblem.id] || "";
    const correct = userAnswer.trim().toLowerCase() === currentProblem.correct_answer.trim().toLowerCase();
    
    setIsCorrect(correct);
    setShowResult(true);

    toast({
      title: correct ? "정답입니다! 🎉" : "틀렸습니다 😢",
      description: correct ? "다음 문제로 넘어가세요" : "다시 한번 생각해보세요",
      variant: correct ? "default" : "destructive",
    });
  };

  const handleNext = () => {
    setShowResult(false);
    setIsCorrect(false);
    
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "모든 문제를 완료했습니다! 🎉",
        description: "수고하셨습니다!",
      });
      if (resolvedParams) {
        router.push(`/study/${resolvedParams.projectId}`);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setShowResult(false);
      setIsCorrect(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading || !resolvedParams) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">로딩 중...</div>
        </main>
        <Navigation />
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            문제가 없습니다.
          </div>
        </main>
        <Navigation />
      </div>
    );
  }

  const progress = ((currentIndex + 1) / problems.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{room?.title}</span>
            <span className="text-muted-foreground">
              {currentIndex + 1}/{problems.length}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Problem Card */}
        <ProblemCard
          problem={currentProblem}
          userAnswer={answers[currentProblem.id]}
          onAnswerChange={handleAnswer}
          showResult={showResult}
          isCorrect={isCorrect}
        >
          <AnswerInput
            problem={currentProblem}
            value={answers[currentProblem.id] || ""}
            onChange={handleAnswer}
            disabled={showResult}
          />
        </ProblemCard>

        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
          
          {!showResult ? (
            <Button
              onClick={handleSubmit}
              disabled={!answers[currentProblem.id]}
              className="flex-1"
            >
              제출
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              {currentIndex < problems.length - 1 ? (
                <>
                  다음
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                "완료"
              )}
            </Button>
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
}

