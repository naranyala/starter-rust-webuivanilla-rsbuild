// frontend/src/lib/security.ts

export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, char => map[char]);
}

export function escapeAttr(str: string): string {
  return str.replace(/[^a-zA-Z0-9._-]/g, char => 
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function sanitizeUserInput(input: string): string {
  return escapeHtml(input.trim());
}

export function createSafeHtml(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    if (typeof value === 'string') {
      return escapeHtml(value);
    }
    return String(value ?? '');
  });
}

export function setContentSecurityPolicy(): void {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
  document.head.appendChild(meta);
}

export function validateInput(input: string, type: 'email' | 'number' | 'text'): boolean {
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    case 'number':
      return /^\d+$/.test(input);
    case 'text':
      return input.length > 0 && input.length <= 1000;
    default:
      return false;
  }
}
