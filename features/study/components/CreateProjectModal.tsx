"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/shared/ui/components/button";
import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { useToast } from "@/shared/hooks/use-toast";
import { createClient } from "@/shared/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/shared/types";

interface CreateProjectModalProps {
  editMode?: boolean;
  initialData?: Project;
  onClose?: () => void;
}

export function CreateProjectModal({
  editMode = false,
  initialData,
  onClose,
}: CreateProjectModalProps = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "영어",
    description: "",
    basePrompt: "",
    role: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      category: "영어",
      description: "",
      basePrompt: "",
      role: "",
    });
  };

  // 편집 모드일 때 초기 데이터 설정
  useEffect(() => {
    if (editMode && initialData) {
      setOpen(true);
      setFormData({
        title: initialData.title || "",
        category: initialData.category || "영어",
        description: initialData.description || "",
        basePrompt:
          (initialData.source_data as { basePrompt?: string; role?: string })
            ?.basePrompt || "",
        role:
          (initialData.source_data as { basePrompt?: string; role?: string })
            ?.role || "",
      });
    }
  }, [editMode, initialData]);

  // 바텀시트 열릴 때 body scroll lock
  useEffect(() => {
    if (open) {
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
  }, [open]);

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    // 닫힐 때 상태 정리(다음 오픈에서 "계속 비활성" 같은 상태 꼬임 방지)
    if (!isOpen) {
      setLoading(false);
      if (!editMode) {
        resetForm();
      }
      if (onClose) {
        onClose();
      }
    }
  };

  const handleOpen = () => {
    setLoading(false);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation 체크
    if (!formData.title || formData.title.length > 50) {
      toast({
        title: "제목 오류",
        description: "제목은 1자 이상 50자 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    if (
      !formData.description ||
      formData.description.length < 10 ||
      formData.description.length > 100
    ) {
      toast({
        title: "설명 오류",
        description: "설명은 10자 이상 100자 이하여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    // 로그인 체크
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: editMode
          ? "프로젝트를 수정하려면 로그인해주세요."
          : "프로젝트를 생성하려면 로그인해주세요.",
        variant: "destructive",
      });
      router.push("/login?redirectTo=/study");
      return;
    }

    setLoading(true);

    try {
      const requestData = new FormData();
      requestData.append("title", formData.title);
      requestData.append("category", formData.category);
      requestData.append("description", formData.description);
      requestData.append("source_type", "prompt");
      requestData.append(
        "source_data",
        JSON.stringify({
          basePrompt: formData.basePrompt,
          role: formData.role,
        })
      );

      if (editMode && initialData) {
        // 수정 모드
        const { updateProject } = await import(
          "@/features/study/actions/projects"
        );
        const result = await updateProject(initialData.id, requestData);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: "프로젝트 수정 완료! ✨",
          description: "프로젝트가 성공적으로 수정되었습니다.",
        });
      } else {
        // 생성 모드
        const response = await fetch("/api/projects/create", {
          method: "POST",
          body: requestData,
        });

        if (!response.ok) {
          throw new Error("프로젝트 생성 실패");
        }

        toast({
          title: "프로젝트 생성 완료! 🎉",
          description: "이제 방을 만들어 학습을 시작하세요.",
        });
      }

      handleOpenChange(false);

      // 프로젝트 리스트를 다시 불러오기
      router.refresh();
    } catch (error) {
      toast({
        title: "오류 발생",
        description:
          error instanceof Error
            ? error.message
            : editMode
            ? "프로젝트 수정 중 문제가 발생했습니다."
            : "프로젝트 생성 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[100] p-0 md:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) {
              handleOpenChange(false);
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
                <h2 className="text-xl font-bold">
                  {editMode ? "프로젝트 수정" : "새 프로젝트 만들기"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  프로젝트의 기본 설정을 입력하세요. 이 설정은 모든 방에서
                  사용됩니다.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content - 스크롤 가능 영역 */}
            <div className="flex-1 overflow-y-auto">
              <form
                id="project-form"
                onSubmit={handleSubmit}
                className="p-6 space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="title">
                    프로젝트 제목 <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formData.title.length}/50자)
                    </span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      if (e.target.value.length <= 50) {
                        setFormData({ ...formData, title: e.target.value });
                      }
                    }}
                    placeholder="예: 토익 RC 정복하기"
                    maxLength={50}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    카테고리 <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                    disabled={loading}
                  >
                    <option value="영어">영어</option>
                    <option value="코딩">코딩</option>
                    <option value="자격증">자격증</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value.slice(0, 100),
                      })
                    }
                    placeholder="예: 토익 시험 대비 문법 학습"
                    maxLength={100}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">
                    AI 역할 설정 <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    placeholder="예: 당신은 토익 시험 전문가입니다."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-y"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI가 어떤 역할로 문제를 만들지 설정합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePrompt">
                    기본 프롬프트 <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="basePrompt"
                    value={formData.basePrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, basePrompt: e.target.value })
                    }
                    placeholder="예: 토익 RC Part 5 문법 문제를 출제해주세요. 실전과 유사한 난이도로 만들어주세요."
                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm resize-y"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    모든 방에서 기본으로 사용될 프롬프트입니다
                  </p>
                </div>
              </form>
            </div>

            {/* 버튼 - 하단 고정 */}
            <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex gap-3 shrink-0 z-10 md:relative md:border-t-0 md:px-6 md:py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !formData.title ||
                  formData.title.length > 50 ||
                  !formData.description ||
                  formData.description.length < 10 ||
                  formData.description.length > 100 ||
                  !formData.role ||
                  !formData.basePrompt
                }
                className="flex-1"
                form="project-form"
              >
                {loading && (
                  <span className="mr-2 inline-flex items-center">
                    <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </span>
                )}
                {loading
                  ? editMode
                    ? "수정 중..."
                    : "생성 중..."
                  : editMode
                  ? "프로젝트 수정"
                  : "프로젝트 생성"}
              </Button>
            </div>

            {/* 로딩 오버레이 (CreateRoomModal과 동일한 UX) */}
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-100 rounded-t-2xl md:rounded-2xl">
                <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl shadow-lg">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold">
                      {editMode
                        ? "프로젝트를 수정하고 있습니다..."
                        : "프로젝트를 생성하고 있습니다..."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      잠시만 기다려주세요
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {!editMode && (
        <Button size="sm" onClick={handleOpen} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />새 프로젝트
        </Button>
      )}

      {mounted && typeof window !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
