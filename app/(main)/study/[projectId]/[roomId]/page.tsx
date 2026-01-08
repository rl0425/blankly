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
import { ChevronLeft, ChevronRight, ArrowLeft, CheckCircle } from "lucide-react";
import type { Problem, Room } from "@/shared/types";
import Link from "next/link";

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
  const [results, setResults] = useState<Record<string, { isCorrect: boolean; feedback?: any }>>({});
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  const loadData = useCallback(async () => {
    if (!resolvedParams) return;

    setInitialLoading(true);
    
    try {
      // 방 정보 가져오기
      const roomResponse = await fetch(`/api/rooms/${resolvedParams.roomId}`);
      if (!roomResponse.ok) throw new Error("방 정보를 가져올 수 없습니다");
      const { data: roomData } = await roomResponse.json();
      setRoom(roomData);

      // 문제 목록 가져오기
      const problemsResponse = await fetch(`/api/rooms/${resolvedParams.roomId}/problems`);
      if (!problemsResponse.ok) throw new Error("문제를 가져올 수 없습니다");
      const { data: problemsData } = await problemsResponse.json();
      
      console.log(`${problemsData.length}개의 문제를 불러왔습니다`);
      setProblems(problemsData);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "데이터를 불러올 수 없습니다",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  }, [resolvedParams, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentProblem = problems[currentIndex];

  const handleAnswer = (answer: string) => {
    if (!currentProblem) return;
    setAnswers({ ...answers, [currentProblem.id]: answer });
  };

  const handleSubmit = async () => {
    if (!currentProblem || !resolvedParams) return;
    
    const userAnswer = answers[currentProblem.id] || "";
    
    if (!userAnswer.trim()) {
      toast({
        title: "답변을 입력하세요",
        description: "답을 입력한 후 제출해주세요",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 답안 제출 API 호출
      const response = await fetch("/api/problems/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: currentProblem.id,
          roomId: resolvedParams.roomId,
          userAnswer,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "답안 제출 실패");
      }

      const { isCorrect: correct, aiFeedback: feedback } = await response.json();
      
      setIsCorrect(correct);
      setAiFeedback(feedback);
      setShowResult(true);
      
      // 결과 저장
      setResults({
        ...results,
        [currentProblem.id]: { isCorrect: correct, feedback },
      });

      toast({
        title: correct ? "정답입니다! 🎉" : "틀렸습니다 😢",
        description: feedback?.feedback || (correct ? "다음 문제로 넘어가세요" : "다시 확인해보세요"),
        variant: correct ? "default" : "destructive",
      });
    } catch (error) {
      console.error("답안 제출 오류:", error);
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "답안 제출 중 문제가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setShowResult(false);
    setIsCorrect(false);
    setAiFeedback(null);
    
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 모든 문제 완료 - 완료 모달 표시
      setShowCompletionModal(true);
    }
  };

  const handleCompleteSession = async () => {
    if (!resolvedParams) return;
    
    setSubmitting(true);
    
    try {
      // 통계 계산
      const correctCount = Object.values(results).filter(r => r.isCorrect).length;
      const wrongCount = Object.keys(results).length - correctCount;
      
      // 세션 완료 처리
      const { completeRoomSession } = await import("@/features/problem/actions/problems");
      await completeRoomSession(resolvedParams.roomId, {
        totalProblems: problems.length,
        solvedCount: Object.keys(answers).length,
        correctCount,
        wrongCount,
      });

      toast({
        title: "학습을 완료했습니다! 🎉",
        description: "수고하셨습니다!",
      });

      router.push(`/study/${resolvedParams.projectId}`);
    } catch (error) {
      console.error("세션 완료 처리 오류:", error);
      toast({
        title: "완료 처리 중 오류 발생",
        description: "하지만 답변은 저장되었습니다",
        variant: "destructive",
      });
      router.push(`/study/${resolvedParams.projectId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    // 다시 풀어보기 - 상태 초기화
    setAnswers({});
    setResults({});
    setCurrentIndex(0);
    setShowCompletionModal(false);
    setShowResult(false);
    setIsCorrect(false);
    setAiFeedback(null);
  };

  const handleReviewWrong = () => {
    // 틀린 문제만 보기 - 첫 번째 틀린 문제로 이동
    const wrongProblemIndex = problems.findIndex(p => {
      const result = results[p.id];
      return result && !result.isCorrect;
    });
    
    if (wrongProblemIndex !== -1) {
      setCurrentIndex(wrongProblemIndex);
      setShowCompletionModal(false);
      setShowResult(true);
      const problem = problems[wrongProblemIndex];
      setIsCorrect(results[problem.id].isCorrect);
      setAiFeedback(results[problem.id].feedback);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevProblem = problems[prevIndex];
      
      // 이전 문제의 결과가 있으면 복원
      if (results[prevProblem.id]) {
        setShowResult(true);
        setIsCorrect(results[prevProblem.id].isCorrect);
        setAiFeedback(results[prevProblem.id].feedback);
      } else {
        setShowResult(false);
        setIsCorrect(false);
        setAiFeedback(null);
      }
      
      setCurrentIndex(prevIndex);
    }
  };

  const handleMarkAsCorrect = async () => {
    if (!currentProblem || !resolvedParams) return;

    setSubmitting(true);

    try {
      // 강제로 정답 처리 (is_correct: true로 업데이트)
      const response = await fetch("/api/problems/mark-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: currentProblem.id,
          roomId: resolvedParams.roomId,
          userAnswer: answers[currentProblem.id] || "",
        }),
      });

      if (!response.ok) {
        throw new Error("정답 처리 실패");
      }

      setIsCorrect(true);
      
      // 결과 업데이트
      setResults({
        ...results,
        [currentProblem.id]: { isCorrect: true, feedback: aiFeedback },
      });
      
      toast({
        title: "정답으로 처리되었습니다 ✅",
        description: "다음 문제로 넘어가세요",
      });
    } catch (error) {
      toast({
        title: "오류 발생",
        description: error instanceof Error ? error.message : "정답 처리 중 문제가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 초기 로딩 중 (데이터 가져오기 전)
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            {/* 로딩 스피너 */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              문제를 불러오는 중...
            </p>
            <p className="text-sm text-muted-foreground">
              잠시만 기다려주세요
            </p>
          </div>
        </main>
        <Navigation />
      </div>
    );
  }

  // 로딩 완료 후: 데이터 없음
  if (!room || problems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-6xl">📭</div>
            <p className="text-lg font-medium text-muted-foreground">
              {!room ? "방을 찾을 수 없습니다" : "생성된 문제가 없습니다"}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {!room 
                ? "방이 삭제되었거나 존재하지 않습니다" 
                : "방 생성 중 문제가 발생했을 수 있습니다"}
            </p>
            {resolvedParams && (
              <Link href={`/study/${resolvedParams.projectId}`}>
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  방 목록으로 돌아가기
                </Button>
              </Link>
            )}
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
        {/* Back Button */}
        {resolvedParams && (
          <Link 
            href={`/study/${resolvedParams.projectId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            방 목록으로 돌아가기
          </Link>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="font-medium">{room.title}</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {currentProblem.question_type === "fill_blank" 
                  ? "주관식-빈칸" 
                  : currentProblem.question_type === "essay"
                  ? "주관식-서술형"
                  : currentProblem.question_type === "multiple_select" 
                  ? "복수선택" 
                  : "객관식"}
              </span>
              <span className="text-muted-foreground">
                {currentIndex + 1}/{problems.length}
              </span>
            </div>
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
            onSubmit={showResult ? handleNext : handleSubmit}
          />
        </ProblemCard>

        {/* AI Feedback (주관식 오답일 경우) */}
        {showResult && !isCorrect && (
          <div className="mt-4 space-y-3">
            {aiFeedback && (
              <div className="p-4 rounded-xl bg-muted">
                <p className="text-sm font-medium mb-2">AI 피드백</p>
                <p className="text-sm text-muted-foreground">
                  {aiFeedback.improvement_tip || aiFeedback.feedback}
                </p>
              </div>
            )}
            
            {/* 정답으로 처리하기 버튼 */}
            <Button
              variant="outline"
              onClick={handleMarkAsCorrect}
              disabled={submitting}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? "처리 중..." : "AI가 틀렸어요! 정답으로 처리하기"}
            </Button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0 || submitting}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
          
          {!showResult ? (
            <Button
              onClick={handleSubmit}
              disabled={!answers[currentProblem.id] || submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  채점 중...
                </>
              ) : (
                "제출"
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} className="flex-1" disabled={submitting}>
              {currentIndex < problems.length - 1 ? (
                <>
                  다음
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                submitting ? "완료 처리 중..." : "완료"
              )}
            </Button>
          )}
        </div>

      </main>

      {/* 완료 모달 */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl max-w-md w-full p-6 space-y-6">
            {/* 헤더 */}
            <div className="text-center space-y-2">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold">학습 완료!</h2>
              <p className="text-muted-foreground">
                {room?.title}의 모든 문제를 풀었습니다
              </p>
            </div>

            {/* 결과 요약 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted">
                <p className="text-2xl font-bold">{problems.length}</p>
                <p className="text-sm text-muted-foreground">총 문제</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/10">
                <p className="text-2xl font-bold text-primary">
                  {Object.values(results).filter(r => r.isCorrect).length}
                </p>
                <p className="text-sm text-muted-foreground">정답</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">
                  {Object.keys(results).length - Object.values(results).filter(r => r.isCorrect).length}
                </p>
                <p className="text-sm text-muted-foreground">오답</p>
              </div>
            </div>

            {/* 정답률 */}
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <p className="text-3xl font-bold text-primary">
                {Math.round((Object.values(results).filter(r => r.isCorrect).length / problems.length) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">정답률</p>
            </div>

            {/* 버튼들 */}
            <div className="space-y-3">
              {Object.values(results).some(r => !r.isCorrect) && (
                <Button
                  onClick={handleReviewWrong}
                  variant="outline"
                  className="w-full"
                >
                  ❌ 틀린 문제 다시 보기
                </Button>
              )}
              
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full"
              >
                🔄 처음부터 다시 풀기
              </Button>
              
              <Button
                onClick={handleCompleteSession}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "완료 처리 중..." : "✅ 완료하고 나가기"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
