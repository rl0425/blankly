import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/components/card";
import { Button } from "@/shared/ui/components/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const ITEMS_PER_PAGE = 10;

interface WrongProblemsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function WrongProblemsPage({
  searchParams,
}: WrongProblemsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  // 전체 틀린 문제 수 (페이지네이션용)
  const { count: totalCount } = await supabase
    .from("wrong_problems")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_mastered", false);

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);
  const currentPage = Math.max(
    1,
    Math.min(totalPages || 1, parseInt(params.page || "1", 10))
  );
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // 현재 페이지의 틀린 문제 가져오기
  const { data: wrongProblems } = await supabase
    .from("wrong_problems")
    .select(
      `
      *,
      problem:problems(*)
    `
    )
    .eq("user_id", user.id)
    .eq("is_mastered", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/mypage">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold toss-heading-sm">
              틀린 문제 모음
            </h1>
          </div>
        </div>
      </div>

      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          {!wrongProblems || wrongProblems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>아직 틀린 문제가 없어요! 👍</p>
                <p className="text-sm mt-2">
                  계속 이대로 완벽한 학습을 유지하세요!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                총 {totalCount}개의 틀린 문제 (페이지 {currentPage}/{totalPages}
                )
              </div>

              <div className="space-y-4 mb-6">
                {wrongProblems.map((item) => {
                  const problem = item.problem as {
                    question: string;
                    correct_answer: string;
                    explanation?: string;
                  };

                  return (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {problem.question}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">정답</p>
                          <p className="font-medium text-primary">
                            {problem.correct_answer}
                          </p>
                        </div>
                        {problem.explanation && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              해설
                            </p>
                            <p className="text-sm">{problem.explanation}</p>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          복습 횟수: {item.review_count}회
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Link
                    href={`/mypage/wrong-problems?page=${Math.max(
                      1,
                      currentPage - 1
                    )}`}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      이전
                    </Button>
                  </Link>

                  <div className="flex items-center gap-1">
                    {(() => {
                      let startPage: number;
                      let endPage: number;

                      if (totalPages <= 5) {
                        startPage = 1;
                        endPage = totalPages;
                      } else {
                        startPage = Math.max(1, currentPage - 2);
                        endPage = Math.min(totalPages, currentPage + 2);

                        if (currentPage <= 3) {
                          startPage = 1;
                          endPage = 5;
                        } else if (currentPage >= totalPages - 2) {
                          startPage = totalPages - 4;
                          endPage = totalPages;
                        }
                      }

                      return Array.from(
                        { length: endPage - startPage + 1 },
                        (_, i) => startPage + i
                      ).map((page) => (
                        <Link
                          key={page}
                          href={`/mypage/wrong-problems?page=${page}`}
                        >
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            className="min-w-10"
                          >
                            {page}
                          </Button>
                        </Link>
                      ));
                    })()}
                  </div>

                  <Link
                    href={`/mypage/wrong-problems?page=${Math.min(
                      totalPages,
                      currentPage + 1
                    )}`}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
