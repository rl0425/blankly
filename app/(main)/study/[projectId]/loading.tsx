import { Card, CardContent } from "@/shared/ui/components/card";

export default function ProjectDetailLoading() {
  return (
    <>
      {/* Fixed Header Skeleton */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="flex-1">
              <div className="h-7 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed 헤더 높이만큼 padding-top 추가 */}
      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          {/* Stats Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-8 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-12 w-12 bg-muted rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rooms List Skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            </div>

            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-muted rounded" />
                      <div className="h-4 w-32 bg-muted rounded" />
                    </div>
                    <div className="h-9 w-24 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
