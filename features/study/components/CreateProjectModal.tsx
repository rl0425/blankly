"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/components/dialog";
import { Button } from "@/shared/ui/components/button";
import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { useToast } from "@/shared/hooks/use-toast";
import { createClient } from "@/shared/lib/supabase/client";
import { Plus } from "lucide-react";

export function CreateProjectModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "영어",
    description: "",
    basePrompt: "",
    role: "",
  });
  
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 로그인 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "프로젝트를 생성하려면 로그인해주세요.",
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
      requestData.append("source_data", JSON.stringify({
        basePrompt: formData.basePrompt,
        role: formData.role,
      }));

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

      setOpen(false);
      setFormData({
        title: "",
        category: "영어",
        description: "",
        basePrompt: "",
        role: "",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "프로젝트 생성 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          새 프로젝트
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로젝트 만들기</DialogTitle>
          <DialogDescription>
            프로젝트의 기본 설정을 입력하세요. 이 설정은 모든 방에서 사용됩니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="title">프로젝트 제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 토익 RC 정복하기"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">카테고리 *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="예: 토익 시험 대비 문법 학습"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">AI 역할 설정 *</Label>
            <textarea
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="예: 당신은 토익 시험 전문가입니다."
              className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">AI가 어떤 역할로 문제를 만들지 설정합니다</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="basePrompt">기본 프롬프트 *</Label>
            <textarea
              id="basePrompt"
              value={formData.basePrompt}
              onChange={(e) => setFormData({ ...formData, basePrompt: e.target.value })}
              placeholder="예: 토익 RC Part 5 문법 문제를 출제해주세요. 실전과 유사한 난이도로 만들어주세요."
              className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">모든 방에서 기본으로 사용될 프롬프트입니다</p>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.role || !formData.basePrompt}>
              {loading ? "생성 중..." : "프로젝트 생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

