export type Target = "js" | "py";

export function transpileToTarget(src: string, _file: string, target: Target, keywords: Record<string, string> = {}): string {
  let s = src;


  for (const [word, translation] of Object.entries(keywords)) {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    s = s.replace(regex, translation);
  }


  s = s.replace(/\bktab\b/g, 'log')
       .replace(/\bgoul\b/g, 'log')
       .replace(/\bidha\b/g, 'if')
       .replace(/\bwella\b/g, 'else')
       .replace(/\bsinon\b/g, 'else')
       .replace(/\bhaqq\b/g, 'true')
       .replace(/\bbla\b/g, 'false');


  if (target === "js") {
    s = s.replace(/\blog\(/g, 'console.log(');
    return s;
  }


  if (target === "py") {
    s = s.replace(/console\.log/g, 'print');
    s = s.replace(/\blog\(/g, 'print(');
    s = s.replace(/\bif\s*\(/g, 'if ');
    s = s.replace(/\)\s*\{/g, ':');
    s = s.replace(/\}\s*else\s*\{/g, 'else:');
    s = s.replace(/\}/g, '');
    s = s.replace(/true/g, 'True');
    s = s.replace(/false/g, 'False');
    if (!s.trim()) s = 'pass';
    return s;
  }

  return s;
}

export function toTarget(src: string, file: string, target: Target): string {
  return transpileToTarget(src, file, target);
}

export default { toTarget, transpileToTarget };
