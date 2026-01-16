"use client";

import { Home, BookOpen, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const navItems = [
  {
    name: "홈",
    href: "/",
    icon: Home,
  },
  {
    name: "학습",
    href: "/study",
    icon: BookOpen,
  },
  {
    name: "마이페이지",
    href: "/mypage",
    icon: User,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 isolate">
      <div className="container flex h-16 items-center justify-around px-4 mx-auto">
        {navItems.map((item) => {
          // /study로 시작하는 경로도 "학습" 탭 활성화
          const isActive =
            item.href === "/study"
              ? pathname === item.href || pathname.startsWith("/study")
              : pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
