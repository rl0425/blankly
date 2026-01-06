"use client";

import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { Button } from "@/shared/ui/components/button";
import type { Problem } from "@/shared/types";

interface AnswerInputProps {
  problem: Problem;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AnswerInput({ problem, value, onChange, disabled }: AnswerInputProps) {
  if (problem.question_type === "multiple_choice" && problem.options) {
    return (
      <div className="space-y-2">
        {problem.options.map((option, index) => (
          <Button
            key={index}
            type="button"
            variant={value === option ? "default" : "outline"}
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => onChange(option)}
            disabled={disabled}
          >
            <span className="mr-3 font-bold">{String.fromCharCode(65 + index)}.</span>
            {option}
          </Button>
        ))}
      </div>
    );
  }

  // Fill in the blank
  return (
    <div className="space-y-2">
      <Label htmlFor="answer">답변을 입력하세요</Label>
      <Input
        id="answer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="답을 입력하세요"
        disabled={disabled}
        className="text-lg"
      />
    </div>
  );
}

