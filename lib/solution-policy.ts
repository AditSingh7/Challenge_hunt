import type { Language } from "./types";

function maskCommentsAndLiterals(source: string): string {
  let result = "";
  let state: "code" | "line-comment" | "block-comment" | "string" | "char" | "text-block" = "code";
  let escaped = false;

  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];

    if (state === "code") {
      if (current === "/" && next === "/") {
        result += "  ";
        i += 1;
        state = "line-comment";
      } else if (current === "/" && next === "*") {
        result += "  ";
        i += 1;
        state = "block-comment";
      } else if (source.startsWith('"""', i)) {
        result += "   ";
        i += 2;
        state = "text-block";
      } else if (current === '"') {
        result += " ";
        state = "string";
      } else if (current === "'") {
        result += " ";
        state = "char";
      } else {
        result += current;
      }
      continue;
    }

    if (state === "line-comment") {
      result += current === "\n" ? "\n" : " ";
      if (current === "\n") state = "code";
      continue;
    }

    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        result += "  ";
        i += 1;
        state = "code";
      } else {
        result += current === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (state === "text-block") {
      if (source.startsWith('"""', i)) {
        result += "   ";
        i += 2;
        state = "code";
      } else {
        result += current === "\n" ? "\n" : " ";
      }
      continue;
    }

    result += current === "\n" ? "\n" : " ";
    if (escaped) {
      escaped = false;
    } else if (current === "\\") {
      escaped = true;
    } else if ((state === "string" && current === '"') || (state === "char" && current === "'")) {
      state = "code";
    }
  }

  return result;
}

export function isPrintOnlySubmission(language: Language, source: string): boolean {
  const code = maskCommentsAndLiterals(source);
  const printsOutput = language === "java"
    ? /\bSystem\s*\.\s*out\s*\.\s*(?:print|println|printf)\s*\(/i.test(code)
    : /\b(?:printf|fprintf|puts|putchar|fputs|fputc)\s*\(/i.test(code);

  if (!printsOutput) return false;

  const hasPatternLogic =
    /\b(?:for|while|do|if|else|switch|case)\b/.test(code) ||
    /\.(?:repeat|append|insert|setCharAt)\s*\(/.test(code) ||
    /(?:\+\+|--|\+=|-=|\*=|\/=|%=)/.test(code) ||
    /\breturn\s+[A-Za-z_$][\w$]*\s*\(/.test(code);

  return !hasPatternLogic;
}

export function simpleCodeFeedback(attempt: number): string {
  if (attempt <= 1) return "Nice try buddy, but this won't work 😂";
  if (attempt === 2) return "It wont work Bachhaaaa";

  const relatableMessages = [
    "We’ve all tried the shortcut 😅 Now let your logic do the work and try again.",
    "The pattern won’t print itself into existence 😄 Give those loops a chance.",
    "Plot twist: the judge is still waiting for the algorithm 😂 Build it step by step.",
  ];
  return relatableMessages[(attempt - 3) % relatableMessages.length];
}
