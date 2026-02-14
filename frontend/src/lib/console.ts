// frontend/src/lib/console.ts

export interface ConsoleStyle {
  color: string;
  background?: string;
  fontWeight?: string;
  fontSize?: string;
}

const styles: Record<string, ConsoleStyle> = {
  trace: { color: '#6c757d' },
  debug: { color: '#17a2b8' },
  info: { color: '#0d6efd' },
  success: { color: '#28a745' },
  warn: { color: '#ffc107' },
  error: { color: '#dc3545', fontWeight: 'bold' },
  title: { color: '#6610f2', fontWeight: 'bold', fontSize: '14px' },
  subtitle: { color: '#6f42c1', fontWeight: 'bold' },
  dim: { color: '#adb5bd' },
};

const escape = (s: string) => s.replace(/[\\^=*_~`#$%&[\](){}|+?:]/g, '\\$&');

function formatStyle(style: ConsoleStyle): string {
  const css = Object.entries(style)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const key = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      return `${key}: ${v}`;
    })
    .join('; ');
  return `font: ${css};`;
}

function format(...args: unknown[]): string {
  let message = '';
  const styleArgs: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg === 'string') {
      const match = arg.match(/^%(title|subtitle|success|warn|error|info|debug|trace|dim):(.*)$/s);
      if (match) {
        const [, type, text] = match;
        const style = styles[type] || {};
        message += `%c${text}`;
        styleArgs.push(formatStyle(style));
      } else {
        message += arg;
      }
    } else {
      message += typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
    }
  }
  
  return [message, ...styleArgs];
}

export const consoleX = {
  title(...args: unknown[]) {
    console.log('%title:═══════════════════════════════════════════════════════════', ...args);
  },
  
  subtitle(...args: unknown[]): void {
    const formatted = format('%subtitle:────────────────────────────────────────', ...args);
    console.log(formatted);
  },
  
  step(label: string, ...args: unknown[]): void {
    const formatted = format(`%info:► ${label}`, ...args);
    console.log(formatted);
  },
  
  success(label: string, ...args: unknown[]): void {
    const formatted = format(`%success:✓ ${label}`, ...args);
    console.log(formatted);
  },
  
  warn(label: string, ...args: unknown[]): void {
    const formatted = format(`%warn:⚠ ${label}`, ...args);
    console.warn(formatted);
  },
  
  error(label: string, ...args: unknown[]): void {
    const formatted = format(`%error:✗ ${label}`, ...args);
    console.error(formatted);
  },
  
  info(label: string, ...args: unknown[]): void {
    const formatted = format(`%info:ℹ ${label}`, ...args);
    console.log(formatted);
  },
  
  debug(label: string, ...args: unknown[]): void {
    const formatted = format(`%debug:⌘ ${label}`, ...args);
    console.debug(formatted);
  },
  
  trace(label: string, ...args: unknown[]): void {
    const formatted = format(`%trace:◌ ${label}`, ...args);
    console.log(formatted);
  },
  
  dim(...args: unknown[]): void {
    const formatted = format('%dim:', ...args);
    console.log(formatted);
  },
  
  group(label: string): void {
    console.group(`%title:${label}`);
  },
  
  groupEnd(): void {
    console.groupEnd();
  },
  
  time(label: string): void {
    console.time(label);
  },
  
  timeEnd(label: string): void {
    console.timeEnd(label);
  },
  
  table(data: unknown): void {
    console.table(data);
  },
};

export default consoleX;
