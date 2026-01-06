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

export function AnswerInput({
  problem,
  value,
  onChange,
  disabled,
}: AnswerInputProps) {
  // 복수 선택 객관식
  if (problem.question_type === "multiple_select" && problem.options) {
    const selectedOptions = value ? value.split("|||") : [];

    const handleToggle = (option: string) => {
      if (disabled) return;

      const newSelected = selectedOptions.includes(option)
        ? selectedOptions.filter((o) => o !== option)
        : [...selectedOptions, option];

      onChange(newSelected.join("|||"));
    };

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground mb-3">
          ✅ 정답을 모두 선택하세요 (복수 선택 가능)
        </p>
        {problem.options.map((option, index) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <Button
              key={index}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="w-full justify-start h-auto py-3 px-4"
              onClick={() => handleToggle(option)}
              disabled={disabled}
            >
              <span className="mr-3 font-bold">
                {isSelected ? "☑" : "☐"} {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </Button>
          );
        })}
      </div>
    );
  }

  // 단일 선택 객관식
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
            <span className="mr-3 font-bold">
              {String.fromCharCode(65 + index)}.
            </span>
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
