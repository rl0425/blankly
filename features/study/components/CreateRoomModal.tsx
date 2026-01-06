"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/button";
import { Label } from "@/shared/ui/components/label";
import { useToast } from "@/shared/hooks/use-toast";
import { X, ChevronDown, ChevronUp, Upload } from "lucide-react";

interface CreateRoomModalProps {
  projectId: string;
  projectTitle: string;
}

type GenerationMode = "user_data" | "hybrid" | "ai_only";
type GradingStrictness = "strict" | "normal" | "lenient";

export function CreateRoomModal({ projectId, projectTitle }: CreateRoomModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 기본 설정
  const [title, setTitle] = useState("");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("user_data");
  const [sourceData, setSourceData] = useState("");
  const [problemCount, setProblemCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  
  // 고급 설정
  const [fillBlankRatio, setFillBlankRatio] = useState(60);
  const [gradingStrictness, setGradingStrictness] = useState<GradingStrictness>("normal");
  const [aiPrompt, setAiPrompt] = useState("");
  
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!title.trim()) {
      toast({
        title: "방 제목을 입력하세요",
        variant: "destructive",
      });
      return;
    }

    if ((generationMode === "user_data" || generationMode === "hybrid") && !sourceData.trim()) {
      toast({
        title: "학습 자료를 입력하세요",
        description: "최소 100자 이상의 학습 내용을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (sourceData.trim().length < 100 && generationMode !== "ai_only") {
      toast({
        title: "학습 자료가 너무 짧습니다",
        description: "최소 100자 이상 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (generationMode === "ai_only" && !aiPrompt.trim()) {
      toast({
        title: "AI 프롬프트를 입력하세요",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title,
          generationMode,
          sourceData: generationMode !== "ai_only" ? sourceData : null,
          aiPrompt: generationMode === "ai_only" ? aiPrompt : null,
          problemCount,
          difficulty,
          fillBlankRatio,
          gradingStrictness,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "방 생성 실패");
      }

      const { data } = await response.json();

      toast({
        title: "방이 생성되었습니다! 🎉",
        description: `${problemCount}개의 문제가 생성되었습니다`,
      });

      setIsOpen(false);
      router.refresh();

      // 폼 초기화
      setTitle("");
      setSourceData("");
      setAiPrompt("");
      setGenerationMode("user_data");
      setProblemCount(10);
      setDifficulty("medium");
      setFillBlankRatio(60);
      setGradingStrictness("normal");
      setShowAdvanced(false);
    } catch (error: any) {
      console.error("Room creation error:", error);
      toast({
        title: "방 생성 실패",
        description: error.message || "오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm">
        + 새 방 만들기
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">새 방 만들기</h2>
                <p className="text-sm text-muted-foreground mt-1">{projectTitle}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 방 제목 */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  방 제목 <span className="text-destructive">*</span>
                </Label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: Day 1: 토익 RC 기초"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                  disabled={isLoading}
                />
              </div>

              {/* 생성 모드 */}
              <div className="space-y-3">
                <Label>
                  📚 학습 자료 선택 <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    generationMode === "user_data" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-input hover:border-primary/50"
                  }`}>
                    <input
                      type="radio"
                      name="mode"
                      checked={generationMode === "user_data"}
                      onChange={() => setGenerationMode("user_data")}
                      className="w-4 h-4"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <p className="font-medium">📄 내 자료로 문제 만들기</p>
                      <p className="text-sm text-muted-foreground">
                        입력한 학습 자료에서만 문제 추출 (추천)
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    generationMode === "hybrid" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-input hover:border-primary/50"
                  }`}>
                    <input
                      type="radio"
                      name="mode"
                      checked={generationMode === "hybrid"}
                      onChange={() => setGenerationMode("hybrid")}
                      className="w-4 h-4"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <p className="font-medium">📄+🤖 하이브리드</p>
                      <p className="text-sm text-muted-foreground">
                        자료 기반 + AI가 연관 문제 추가 생성
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                    generationMode === "ai_only" 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-input hover:border-primary/50"
                  }`}>
                    <input
                      type="radio"
                      name="mode"
                      checked={generationMode === "ai_only"}
                      onChange={() => setGenerationMode("ai_only")}
                      className="w-4 h-4"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <p className="font-medium">🤖 AI가 전부 생성</p>
                      <p className="text-sm text-muted-foreground">
                        프롬프트 기반으로 AI가 모든 문제 생성
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 학습 자료 입력 (user_data, hybrid 모드) */}
              {(generationMode === "user_data" || generationMode === "hybrid") && (
                <div className="space-y-2">
                  <Label htmlFor="sourceData">
                    학습 내용 <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="sourceData"
                    value={sourceData}
                    onChange={(e) => setSourceData(e.target.value)}
                    placeholder="학습할 내용을 입력하세요... (최소 100자)&#10;&#10;예시:&#10;React는 사용자 인터페이스를 구축하기 위한 JavaScript 라이브러리입니다.&#10;컴포넌트 기반 아키텍처를 사용하며, 가상 DOM을 통해 효율적인 렌더링을 제공합니다.&#10;..."
                    className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm min-h-[200px] resize-y"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{sourceData.length}자 / 최소 100자</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={isLoading}
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      파일 업로드 (TXT, PDF)
                    </Button>
                  </div>
                </div>
              )}

              {/* AI 프롬프트 (ai_only 모드) */}
              {generationMode === "ai_only" && (
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">
                    AI 프롬프트 <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="aiPrompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="AI가 어떤 문제를 만들어야 할지 알려주세요...&#10;&#10;예시:&#10;- 토익 RC Part 5 문법 문제&#10;- 비즈니스 영어 위주&#10;- 동사 시제 관련 문제 많이"
                    className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm min-h-[120px] resize-y"
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* 문제 수 & 난이도 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="problemCount">
                    문제 수 <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="problemCount"
                    value={problemCount}
                    onChange={(e) => setProblemCount(Number(e.target.value))}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                    disabled={isLoading}
                  >
                    <option value={5}>5개</option>
                    <option value={10}>10개</option>
                    <option value={15}>15개</option>
                    <option value={20}>20개</option>
                    <option value={30}>30개</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">
                    난이도 <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                    disabled={isLoading}
                  >
                    <option value="easy">쉬움</option>
                    <option value="medium">보통</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
              </div>

              {/* 고급 설정 (접기/펼치기) */}
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
                  disabled={isLoading}
                >
                  <span>⚙️ 고급 설정 (선택사항)</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-xl">
                    {/* 문제 유형 비율 */}
                    <div className="space-y-3">
                      <Label>문제 유형 비율</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>주관식 (빈칸 채우기)</span>
                          <span className="font-medium">{fillBlankRatio}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={fillBlankRatio}
                          onChange={(e) => setFillBlankRatio(Number(e.target.value))}
                          className="w-full"
                          disabled={isLoading}
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>객관식 {100 - fillBlankRatio}%</span>
                        </div>
                      </div>
                    </div>

                    {/* 주관식 채점 기준 */}
                    <div className="space-y-2">
                      <Label>주관식 채점 기준</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="strictness"
                            checked={gradingStrictness === "lenient"}
                            onChange={() => setGradingStrictness("lenient")}
                            disabled={isLoading}
                          />
                          <span>느슨 (키워드만 포함하면 정답)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="strictness"
                            checked={gradingStrictness === "normal"}
                            onChange={() => setGradingStrictness("normal")}
                            disabled={isLoading}
                          />
                          <span>보통 (의미가 유사하면 정답) <span className="text-primary">← 추천</span></span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="strictness"
                            checked={gradingStrictness === "strict"}
                            onChange={() => setGradingStrictness("strict")}
                            disabled={isLoading}
                          />
                          <span>엄격 (정확히 일치해야 정답)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "문제 생성 중..." : `문제 ${problemCount}개 생성하기`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
