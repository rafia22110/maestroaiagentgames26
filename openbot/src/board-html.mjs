export function prepareBoardHtml(source) {
  return String(source)
    .replace(/(<script\b[^>]*?\btype\s*=\s*)(["'])[a-f0-9]+-text\/javascript\2/gi, '$1$2text/javascript$2')
    .replace(/<script\b[^>]*\bsrc\s*=\s*(["'])\/cdn-cgi\/scripts\/[^"']+\1[^>]*>\s*<\/script\s*>/gi, '');
}
