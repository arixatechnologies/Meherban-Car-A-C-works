"use client";

import type { ComponentPropsWithoutRef, KeyboardEvent } from "react";

type AutoNumberTextareaProps = ComponentPropsWithoutRef<"textarea">;

export function AutoNumberTextarea({ onKeyDown, ...props }: AutoNumberTextareaProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);

    if (
      event.defaultPrevented ||
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", start);
    const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
    const match = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);

    if (!match) return;

    const nextNumber = Number(match[2]) + 1;
    if (!Number.isFinite(nextNumber)) return;

    event.preventDefault();

    const insertText = `\n${match[1]}${nextNumber}. `;
    textarea.value = `${value.slice(0, start)}${insertText}${value.slice(end)}`;

    const cursorPosition = start + insertText.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return <textarea {...props} onKeyDown={handleKeyDown} />;
}
