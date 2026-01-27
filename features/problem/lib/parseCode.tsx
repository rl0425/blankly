import React from "react";

// 코드를 포함한 텍스트를 파싱하여 렌더링하는 함수
export function parseCodeInText(text: string): React.ReactNode {
  if (!text) return text;
  
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // 트리플 백틱 코드 블록 (```) 감지
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  // 먼저 코드 블록을 찾아서 처리
  const blocks: { start: number; end: number; lang: string; code: string }[] = [];
  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      lang: match[1] || '',
      code: match[2],
    });
  }
  
  // 코드 블록 사이의 텍스트와 인라인 코드 처리
  blocks.forEach((block, idx) => {
    // 이전 블록과 현재 블록 사이의 텍스트
    const textBefore = text.slice(currentIndex, block.start);
    parts.push(...parseInlineCode(textBefore, `text-${idx}`));
    
    // 코드 블록 렌더링
    parts.push(
      <pre
        key={`block-${idx}`}
        className="mt-2 mb-2 p-3 bg-muted rounded-lg overflow-x-auto text-sm font-mono border max-w-full"
      >
        <code className="break-words whitespace-pre-wrap">{block.code}</code>
      </pre>
    );
    
    currentIndex = block.end;
  });
  
  // 마지막 텍스트 처리
  if (currentIndex < text.length) {
    parts.push(...parseInlineCode(text.slice(currentIndex), 'text-last'));
  }
  
  return <>{parts}</>;
}

// 인라인 코드 (`코드`) 파싱
function parseInlineCode(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  let idx = 0;
  
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // 코드 앞의 일반 텍스트
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // 인라인 코드
    parts.push(
      <code
        key={`${keyPrefix}-inline-${idx}`}
        className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono border break-words"
      >
        {match[1]}
      </code>
    );
    
    lastIndex = match.index + match[0].length;
    idx++;
  }
  
  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}
