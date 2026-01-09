import { Card, CardContent, CardHeader } from "@/shared/ui/components/card";

export default function StatsLoading() {
  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Stats Card Skeleton */}
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-5 w-20 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Chart Placeholder Skeleton */}
            <Card className="animate-pulse">
              <CardContent className="py-8">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
