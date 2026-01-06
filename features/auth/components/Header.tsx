"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/ui/components/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/hooks/use-toast";
import { useEffect, useState } from "react";
import Link from "next/link";

export function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
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
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "로그아웃 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">_</span>
          </div>
          <span className="text-xl font-bold">Blankly</span>
        </Link>

        <div>
          {user ? (
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
