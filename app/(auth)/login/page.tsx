"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { Button } from "@/shared/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/components/card";
import { useToast } from "@/shared/hooks/use-toast";
import { login } from "@/features/auth/actions/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await login(formData);
      
      if (result?.error) {
        toast({
          title: "로그인 실패",
          description: result.error,
          variant: "destructive",
        });
        setLoading(false);
      } else if (result?.success) {
        // 로그인 성공 시 홈으로 이동
        toast({
          title: "로그인 성공! 🎉",
          description: "환영합니다!",
        });
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "로그인 중 문제가 발생했습니다.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">_</span>
          </div>
          <CardTitle className="text-2xl toss-heading">Blankly</CardTitle>
          <CardDescription className="toss-body">
            AI 기반 빈칸 채우기 학습 앱
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">계정이 없으신가요? </span>
            <Link href="/signup" className="font-medium text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

