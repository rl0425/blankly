"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/ui/components/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/hooks/use-toast";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const router = useRouter();
  const { toast } = useToast();

  // Supabase 클라이언트를 메모이제이션하여 재생성 방지
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // 인증 상태 변경 구독 (초기 세션 포함)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;

      // 첫 번째 이벤트 (INITIAL_SESSION 또는 초기 상태 변경)만 로딩 완료 처리
      if (!initialLoadDoneRef.current) {
        setUser(currentUser);
        setLoading(false);
        initialLoadDoneRef.current = true;
      } else {
        // 이후 이벤트는 상태만 업데이트 (로딩 상태 유지)
        setUser(currentUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
      setUser(null);
      router.refresh();
    } catch {
      toast({
        title: "오류 발생",
        description: "로그아웃 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">_</span>
          </div>
          <span className="text-xl font-bold">Blankly</span>
        </Link>

        <div>
          {loading ? (
            // 로딩 중에는 아무것도 표시하지 않음 (깜빡임 방지)
            <div className="h-9 w-20" />
          ) : user ? (
            <Button variant="ghost" onClick={handleLogout} size="sm">
              로그아웃
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">시작하기</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
