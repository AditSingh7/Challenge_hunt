import type { Language } from "./types";

export function starterTemplates(): Record<Language, string> {
  return {
    java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your pattern logic here\n        // Tip: build the pattern line by line, then System.out.println(output)\n    }\n}\n`,
    c: `#include <stdio.h>\n\nint main(void) {\n    // Write your pattern logic here\n    return 0;\n}\n`,
  };
}
