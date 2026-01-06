"use client";

import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/ui/components/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/hooks/use-toast";

export function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      });
      router.push("/login");
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">
              _
            </span>
          </div>
          <span className="text-xl font-bold">Blankly</span>
        </div>
        
        <Button variant="ghost" onClick={handleLogout} size="sm">
          로그아웃
        </Button>
      </div>
    </header>
  );
}

