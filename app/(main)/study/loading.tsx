import { Card, CardContent, CardHeader } from "@/shared/ui/components/card";

export default function StudyLoading() {
  return (
    <>
      <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="pt-[120px]">
        <main className="container mx-auto px-4 py-8">
          {/* Project Cards Skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="space-y-2">
                    <div className="h-6 w-3/4 bg-muted rounded" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
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
