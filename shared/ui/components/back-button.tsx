"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleBack}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}