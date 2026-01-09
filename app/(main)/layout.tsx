import { Header } from "@/features/auth/components/Header";
import { Navigation } from "@/features/auth/components/Navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Fixed Header - 항상 최상단 고정 */}
      <Header />

      {/* Main Content Area - Header와 Navigation을 위한 패딩 포함 */}
      <div className="pt-16 pb-20">{children}</div>

      {/* Fixed Navigation - 항상 최하단 고정 */}
      <Navigation />
    </div>
  );
}
