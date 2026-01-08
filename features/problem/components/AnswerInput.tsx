"use client";

import { Input } from "@/shared/ui/components/input";
import { Label } from "@/shared/ui/components/label";
import { Button } from "@/shared/ui/components/button";
import type { Problem } from "@/shared/types";
import { parseCodeInText } from "../lib/parseCode";

interface AnswerInputProps {
  problem: Problem;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function AnswerInput({
  problem,
  value,
  onChange,
  disabled,
  onSubmit,
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
              className="w-full justify-start h-auto min-h-[48px] max-h-[160px] py-3 px-4 whitespace-normal text-left leading-relaxed overflow-y-auto"
              onClick={() => handleToggle(option)}
              disabled={disabled}
            >
              <span className="mr-3 font-bold flex-shrink-0">
                {isSelected ? "☑" : "☐"} {String.fromCharCode(65 + index)}.
              </span>
              <span className="flex-1">{parseCodeInText(option)}</span>
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
            className="w-full justify-start h-auto min-h-[48px] max-h-[160px] py-3 px-4 whitespace-normal text-left leading-relaxed overflow-y-auto"
            onClick={() => onChange(option)}
            disabled={disabled}
          >
            <span className="mr-3 font-bold flex-shrink-0">
              {String.fromCharCode(65 + index)}.
            </span>
            <span className="flex-1">{parseCodeInText(option)}</span>
          </Button>
        ))}
      </div>
    );
  }

  // 주관식 (빈칸 채우기 or 서술형)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !disabled && onSubmit) {
      // Textarea에서는 Shift+Enter만 줄바꿈, Enter는 제출
      if (problem.question_type === "essay" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      } else if (problem.question_type === "fill_blank") {
        e.preventDefault();
        onSubmit();
      }
    }
  };

  // 서술형 (essay)
  if (problem.question_type === "essay") {
    return (
      <div className="space-y-2">
        <textarea
          id="answer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="답을 입력하세요 (Enter: 제출, Shift+Enter: 줄바꿈)"
          disabled={disabled}
          className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-base resize-y min-h-[120px]"
          autoFocus
        />
        {problem.max_length && (
          <p className="text-xs text-muted-foreground text-right">
            {value.length} / {problem.max_length}자
          </p>
        )}
      </div>
    );
  }

  // 빈칸 채우기 (fill_blank)
  return (
    <div className="space-y-2">
      <Input
        id="answer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="답을 입력하세요"
        disabled={disabled}
        className="text-lg"
        autoFocus
      />
    </div>
  );
}
