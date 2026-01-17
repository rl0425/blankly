"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/button";
import { Label } from "@/shared/ui/components/label";
import { useToast } from "@/shared/hooks/use-toast";
import {
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  BookOpen,
  FileText,
  Bot,
  Settings,
  Lightbulb,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface CreateRoomModalProps {
  projectId: string;
  projectTitle: string;
}

type GenerationMode = "user_data" | "hybrid" | "ai_only";
type GradingStrictness = "strict" | "normal" | "lenient";
type AIComplexity = "simple" | "advanced";

export function CreateRoomModal({
  projectId,
  projectTitle,
}: CreateRoomModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usePreviousSettings, setUsePreviousSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 에러 상태
  const [titleError, setTitleError] = useState("");
  const [sourceDataError, setSourceDataError] = useState("");
  const [aiPromptError, setAiPromptError] = useState("");

  // 기본 설정
  const [title, setTitle] = useState("");
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("user_data");
  const [sourceData, setSourceData] = useState("");
  const [problemCount, setProblemCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );

  // 고급 설정
  const [fillBlankRatio, setFillBlankRatio] = useState(60);
  const [subjectiveType, setSubjectiveType] = useState<
    "fill_blank" | "essay" | "both"
  >("both");
  const [gradingStrictness, setGradingStrictness] =
    useState<GradingStrictness>("normal");
  const [aiPrompt, setAiPrompt] = useState("");
  const [complexity, setComplexity] = useState<AIComplexity>("simple");

  const router = useRouter();
  const { toast } = useToast();

  // 바텀시트 열릴 때 body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  // 이전 설정 불러오기
  const handleLoadPreviousSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const { getLastRoomSettings } = await import(
        "@/features/study/actions/rooms"
      );
      const settings = await getLastRoomSettings(projectId);

      if (settings) {
        // 모든 설정 불러오기 (제목 포함)
        if (settings.title) setTitle(settings.title);
        if (settings.source_data) setSourceData(settings.source_data);
        if (settings.total_problems) setProblemCount(settings.total_problems);
        if (settings.difficulty)
          setDifficulty(settings.difficulty as "easy" | "medium" | "hard");
        if (settings.generation_mode)
          setGenerationMode(settings.generation_mode as GenerationMode);
        if (settings.fill_blank_ratio)
          setFillBlankRatio(settings.fill_blank_ratio);
        if (settings.grading_strictness)
          setGradingStrictness(
            settings.grading_strictness as GradingStrictness
          );
        // complexity 불러오기 (ai_only 모드일 때만)
        if (settings.complexity && settings.generation_mode === "ai_only") {
          setComplexity(settings.complexity as AIComplexity);
        }
        // 이전 설정을 불러왔으므로 토스트 메시지 표시하지 않음
      } else {
        toast({
          title: "이전 방이 없습니다",
          description: "이 프로젝트의 첫 번째 방을 만들어주세요",
          variant: "destructive",
        });
        setUsePreviousSettings(false);
      }
    } catch (error) {
      console.error("Load previous settings error:", error);
      toast({
        title: "설정 불러오기 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
      setUsePreviousSettings(false);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const fileType = file.type;
    const isTxt = fileType === "text/plain" || file.name.endsWith(".txt");
    const isPdf = fileType === "application/pdf" || file.name.endsWith(".pdf");

    if (!isTxt && !isPdf) {
      toast({
        title: "지원하지 않는 파일 형식",
        description: "TXT 또는 PDF 파일만 업로드할 수 있습니다",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingFile(true);
    try {
      let text = "";

      if (isTxt) {
        // TXT 파일 읽기
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.onerror = reject;
          reader.readAsText(file, "UTF-8");
        });
      } else if (isPdf) {
        // PDF 파일 읽기
        const pdfjsLib = await import("pdfjs-dist");

        // 워커 설정 (항상 설정)
        // pdfjs-dist의 워커 경로를 명시적으로 설정
        const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const textPages: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => {
              // TextItem 타입 체크
              if ("str" in item && typeof item.str === "string") {
                return item.str;
              }
              return "";
            })
            .join(" ");
          textPages.push(pageText);
        }

        text = textPages.join("\n\n");
      }

      // 텍스트가 너무 짧으면 경고
      if (text.trim().length < 10) {
        toast({
          title: "파일 내용이 부족합니다",
          description: "최소 10자 이상의 내용이 필요합니다",
          variant: "destructive",
        });
      } else {
        // 학습 내용에 텍스트 설정
        setSourceData(text.trim());
        setSourceDataError("");
        toast({
          title: "파일 업로드 완료",
          description: `${text.trim().length}자의 텍스트를 불러왔습니다`,
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "파일 읽기 실패",
        description: "파일을 읽는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFile(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 에러 초기화
    setTitleError("");
    setSourceDataError("");
    setAiPromptError("");

    // 유효성 검사
    let hasError = false;

    if (!title.trim()) {
      setTitleError("방 제목을 입력하세요");
      document
        .getElementById("title")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      hasError = true;
    }

    if (
      (generationMode === "user_data" || generationMode === "hybrid") &&
      !sourceData.trim()
    ) {
      setSourceDataError("최소 10자 이상의 학습 내용을 입력해주세요");
      if (!hasError) {
        document
          .getElementById("sourceData")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      hasError = true;
    } else if (sourceData.trim().length < 10 && generationMode !== "ai_only") {
      setSourceDataError(
        `최소 10자 이상 입력해주세요 (현재 ${sourceData.trim().length}자)`
      );
      if (!hasError) {
        document
          .getElementById("sourceData")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      hasError = true;
    }

    // AI 전체 생성 모드에서는 프롬프트가 필수
    if (generationMode === "ai_only" && !aiPrompt.trim()) {
      setAiPromptError("AI 프롬프트를 입력해주세요");
      if (!hasError) {
        document
          .getElementById("aiPrompt")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      hasError = true;
    } else if (generationMode === "ai_only" && aiPrompt.trim().length < 10) {
      setAiPromptError(
        `최소 10자 이상 입력해주세요 (현재 ${aiPrompt.trim().length}자)`
      );
      if (!hasError) {
        document
          .getElementById("aiPrompt")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      hasError = true;
    }

    if (hasError) {
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
          subjectiveType,
          gradingStrictness,
          complexity: generationMode === "ai_only" ? complexity : undefined, // ai_only 모드일 때만 전송
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || "방 생성 실패";

        // 제목 중복 에러인 경우 제목 필드에 에러 표시
        if (
          errorMessage.includes("같은 제목") ||
          errorMessage.includes("제목")
        ) {
          setTitleError(errorMessage);
          setIsLoading(false);
          document
            .getElementById("title")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        // Rate limit 에러 처리
        if (response.status === 429 || errorMessage.includes("Rate limit")) {
          const rateLimitMessage = errorMessage.includes("try again in")
            ? errorMessage
            : "일일 토큰 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
          toast({
            title: "토큰 한도 초과",
            description: rateLimitMessage,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        throw new Error(errorMessage);
      }

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
      setComplexity("simple");
      setShowAdvanced(false);
      setTitleError("");
      setSourceDataError("");
      setAiPromptError("");
    } catch (error) {
      console.error("Room creation error:", error);
      toast({
        title: "방 생성 실패",
        description:
          error instanceof Error ? error.message : "오류가 발생했습니다",
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-60 p-0 md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isLoading) {
                setIsOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-background rounded-t-2xl md:rounded-2xl max-w-2xl w-full max-h-[calc(100vh-4rem)] md:max-h-[90vh] flex flex-col relative md:initial md:translate-y-0 md:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between shrink-0 z-10">
                <div>
                  <h2 className="text-xl font-bold">새 방 만들기</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectTitle}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading || isLoadingSettings}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content - 스크롤 가능 영역 */}
              <div className="flex-1 overflow-y-auto relative">
                {/* 이전 설정 불러오기 체크박스 - 오른쪽 위 */}
                <div className="absolute top-6 right-6 z-10 flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="usePreviousSettings"
                    checked={usePreviousSettings}
                    onChange={(e) => {
                      setUsePreviousSettings(e.target.checked);
                      if (e.target.checked) {
                        handleLoadPreviousSettings();
                      }
                    }}
                    disabled={isLoading || isLoadingSettings}
                    className="w-3.5 h-3.5"
                  />
                  <Label
                    htmlFor="usePreviousSettings"
                    className="text-xs cursor-pointer text-muted-foreground"
                  >
                    {isLoadingSettings ? "불러오는 중..." : "이전 설정 사용"}
                  </Label>
                </div>

                <form
                  id="room-form"
                  onSubmit={handleSubmit}
                  className="p-6 space-y-6"
                >
                  {/* 방 제목 */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      방 제목 <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (titleError) setTitleError("");
                      }}
                      placeholder="예: Day 1: 토익 RC 기초"
                      className={`flex h-11 w-full rounded-xl border ${
                        titleError ? "border-destructive" : "border-input"
                      } bg-background px-4 py-2.5 text-sm`}
                      disabled={isLoading || isLoadingSettings}
                    />
                    {titleError && (
                      <p className="text-sm text-red-500">{titleError}</p>
                    )}
                  </div>

                  {/* 문제 수 & 난이도 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="problemCount">
                        문제 수 <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="problemCount"
                        value={problemCount}
                        onChange={(e) =>
                          setProblemCount(Number(e.target.value))
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                        disabled={isLoading || isLoadingSettings}
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
                        난이도 <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="difficulty"
                        value={difficulty}
                        onChange={(e) =>
                          setDifficulty(
                            e.target.value as "easy" | "medium" | "hard"
                          )
                        }
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                        disabled={isLoading || isLoadingSettings}
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
                      disabled={isLoading || isLoadingSettings}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        고급 설정 (선택사항)
                      </span>
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
                              <span className="font-medium">
                                {fillBlankRatio}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="10"
                              value={fillBlankRatio}
                              onChange={(e) =>
                                setFillBlankRatio(Number(e.target.value))
                              }
                              className="w-full"
                              disabled={isLoading || isLoadingSettings}
                            />
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>객관식 {100 - fillBlankRatio}%</span>
                            </div>
                          </div>
                        </div>

                        {/* 주관식 문제 유형 선택 */}
                        {fillBlankRatio > 0 && (
                          <div className="space-y-2">
                            <Label>주관식 문제 유형</Label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="subjectiveType"
                                  checked={subjectiveType === "fill_blank"}
                                  onChange={() =>
                                    setSubjectiveType("fill_blank")
                                  }
                                  disabled={isLoading || isLoadingSettings}
                                />
                                <span>빈칸 채우기만</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="subjectiveType"
                                  checked={subjectiveType === "essay"}
                                  onChange={() => setSubjectiveType("essay")}
                                  disabled={isLoading || isLoadingSettings}
                                />
                                <span>서술형만 (면접형)</span>
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name="subjectiveType"
                                  checked={subjectiveType === "both"}
                                  onChange={() => setSubjectiveType("both")}
                                  disabled={isLoading || isLoadingSettings}
                                />
                                <span>둘 다 (빈칸 60~70%, 서술형 30~40%)</span>
                              </label>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              서술형 문제는 AI가 채점하며, 50~100자 이내로
                              답변합니다
                            </p>
                          </div>
                        )}

                        {/* 주관식 채점 기준 */}
                        <div className="space-y-2">
                          <Label>주관식 채점 기준 (빈칸 채우기용)</Label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="strictness"
                                checked={gradingStrictness === "lenient"}
                                onChange={() => setGradingStrictness("lenient")}
                                disabled={isLoading || isLoadingSettings}
                              />
                              <span>느슨 (키워드만 포함하면 정답)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="strictness"
                                checked={gradingStrictness === "normal"}
                                onChange={() => setGradingStrictness("normal")}
                                disabled={isLoading || isLoadingSettings}
                              />
                              <span>보통 (의미가 유사하면 정답)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="strictness"
                                checked={gradingStrictness === "strict"}
                                onChange={() => setGradingStrictness("strict")}
                                disabled={isLoading || isLoadingSettings}
                              />
                              <span>엄격 (정확히 일치해야 정답)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 생성 모드 */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      학습 자료 선택 <span className="text-red-500">*</span>
                    </Label>
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          generationMode === "user_data"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={generationMode === "user_data"}
                          onChange={() => setGenerationMode("user_data")}
                          className="w-4 h-4"
                          disabled={isLoading || isLoadingSettings}
                        />
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />내 자료로 문제
                            만들기
                          </p>
                          <p className="text-sm text-muted-foreground">
                            입력한 학습 자료에서만 문제 추출 (추천)
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          generationMode === "hybrid"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={generationMode === "hybrid"}
                          onChange={() => setGenerationMode("hybrid")}
                          className="w-4 h-4"
                          disabled={isLoading || isLoadingSettings}
                        />
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <Bot className="h-4 w-4" />
                            하이브리드
                          </p>
                          <p className="text-sm text-muted-foreground">
                            자료 기반 + AI가 연관 문제 추가 생성
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          generationMode === "ai_only"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-input hover:border-primary/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          checked={generationMode === "ai_only"}
                          onChange={() => setGenerationMode("ai_only")}
                          className="w-4 h-4"
                          disabled={isLoading || isLoadingSettings}
                        />
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            AI가 전부 생성
                          </p>
                          <p className="text-sm text-muted-foreground">
                            프롬프트 기반으로 AI가 모든 문제 생성
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* AI 전체 생성 주의사항 */}
                  {generationMode === "ai_only" && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                      <div className="flex gap-3">
                        <div className="text-amber-600 dark:text-amber-500 text-lg mt-0.5">
                          ⚠️
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                            AI 생성 문제 주의사항
                          </p>
                          <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                            <li>
                              AI가 생성한 문제나 정답이 정확하지 않을 수
                              있습니다
                            </li>
                            <li>
                              애매하거나 틀린 경우 직접 확인하는 작업이
                              필요합니다
                            </li>
                            <li>
                              대부분 정확하지만, 학습 시 주의해서 검토해 주세요
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 학습 자료 입력 (user_data, hybrid 모드) */}
                  {(generationMode === "user_data" ||
                    generationMode === "hybrid") && (
                    <div className="space-y-2">
                      <Label htmlFor="sourceData">
                        학습 내용 <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        id="sourceData"
                        value={sourceData}
                        onChange={(e) => {
                          setSourceData(e.target.value);
                          if (sourceDataError) setSourceDataError("");
                        }}
                        placeholder="학습할 내용을 입력하세요... (최소 10자)&#10;&#10;예시:&#10;React는 사용자 인터페이스를 구축하기 위한 JavaScript 라이브러리입니다.&#10;컴포넌트 기반 아키텍처를 사용하며, 가상 DOM을 통해 효율적인 렌더링을 제공합니다.&#10;..."
                        className={`flex w-full rounded-xl border ${
                          sourceDataError
                            ? "border-destructive"
                            : "border-input"
                        } bg-background px-4 py-3 text-sm min-h-[200px] resize-y`}
                        disabled={isLoading || isLoadingSettings}
                      />
                      {sourceDataError && (
                        <p className="text-sm text-red-500">
                          {sourceDataError}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{sourceData.length}자 / 최소 10자</span>
                        <div className="relative">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".txt,.pdf,text/plain,application/pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                            disabled={
                              isLoading || isLoadingSettings || isLoadingFile
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7"
                            disabled={
                              isLoading || isLoadingSettings || isLoadingFile
                            }
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3 w-3 mr-2" />
                            {isLoadingFile
                              ? "파일 읽는 중..."
                              : "파일 업로드 (TXT, PDF)"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI 프롬프트 (ai_only 모드) */}
                  {generationMode === "ai_only" && (
                    <>
                      {/* 문제 스타일 선택 */}
                      <div className="space-y-3">
                        <Label>문제 스타일</Label>
                        <div className="space-y-2">
                          <label
                            className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                              complexity === "simple"
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-input hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="complexity"
                              checked={complexity === "simple"}
                              onChange={() => setComplexity("simple")}
                              className="w-4 h-4"
                              disabled={isLoading || isLoadingSettings}
                            />
                            <div className="flex-1">
                              <p className="font-medium">기본 학습</p>
                              <p className="text-sm text-muted-foreground">
                                핵심 개념 이해 및 확인 문제
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                              complexity === "advanced"
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-input hover:border-primary/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="complexity"
                              checked={complexity === "advanced"}
                              onChange={() => setComplexity("advanced")}
                              className="w-4 h-4"
                              disabled={isLoading || isLoadingSettings}
                            />
                            <div className="flex-1">
                              <p className="font-medium">실전 모의고사</p>
                              <p className="text-sm text-muted-foreground">
                                복잡한 사례 기반 문제 (시험 대비)
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aiPrompt">
                          AI 프롬프트 <span className="text-red-500">*</span>
                        </Label>
                        <textarea
                          id="aiPrompt"
                          value={aiPrompt}
                          onChange={(e) => {
                            setAiPrompt(e.target.value);
                            if (aiPromptError) setAiPromptError("");
                          }}
                          placeholder="AI 프롬프트를 입력하세요... (최소 10자)&#10;&#10;예시:&#10;- 토익 RC Part 5 문법 문제&#10;- 비즈니스 영어 위주&#10;- 동사 시제 관련 문제 많이"
                          className={`flex w-full rounded-xl border ${
                            aiPromptError ? "border-red-500" : "border-input"
                          } bg-background px-4 py-3 text-sm min-h-[120px] resize-y`}
                          disabled={isLoading || isLoadingSettings}
                        />
                        {aiPromptError && (
                          <p className="text-sm text-red-500">
                            {aiPromptError}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          AI가 문제를 생성할 때 사용할 프롬프트를 입력하세요
                        </p>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {/* 버튼 - 하단 고정 */}
              <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex gap-3 shrink-0 z-10 md:relative md:border-t-0 md:px-6 md:py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading || isLoadingSettings}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || isLoadingSettings}
                  className="flex-1"
                  form="room-form"
                >
                  {isLoading
                    ? "문제 생성 중..."
                    : `문제 ${problemCount}개 생성하기`}
                </Button>
              </div>

              {/* 설정 불러오기 로딩 오버레이 */}
              {isLoadingSettings && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-100 rounded-t-2xl md:rounded-2xl">
                  <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl shadow-lg">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        이전 설정 불러오는 중...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 문제 생성 로딩 오버레이 */}
              {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-100 rounded-t-2xl md:rounded-2xl">
                  <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl shadow-lg">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold">
                        AI가 문제를 생성하고 있습니다...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {problemCount}개의 문제를 만들고 있어요 (약 10~30초
                        소요)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
