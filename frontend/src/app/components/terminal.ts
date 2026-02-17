// frontend/src/app/components/terminal.ts
// Terminal Emulator window component

export function generateTerminalHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Courier New', monospace; height: 100%; display: flex; flex-direction: column; background: #0f172a;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h2 style="color: #4f46e5; font-size: 1.2rem;">⌨️ Terminal</h2>
        <button onclick="clearTerminal()" style="padding: 4px 10px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Clear</button>
      </div>

      <div id="terminal-output" style="flex: 1; overflow-y: auto; margin-bottom: 10px; font-size: 0.9rem; line-height: 1.4;">
        <div style="color: #10b981;">Welcome to Terminal Emulator v1.0</div>
        <div style="color: #64748b;">Type 'help' for available commands</div>
        <div style="margin-top: 10px;"></div>
      </div>

      <div style="display: flex; align-items: center; background: #1e293b; border-radius: 6px; padding: 8px 12px;">
        <span style="color: #10b981; margin-right: 8px;">$</span>
        <input type="text" id="terminal-input" style="flex: 1; background: transparent; color: white; border: none; outline: none; font-family: 'Courier New', monospace; font-size: 0.9rem;" autofocus>
      </div>

      <script>
        const output = document.getElementById('terminal-output');
        const input = document.getElementById('terminal-input');
        const commands = {
          help: 'Show available commands',
          clear: 'Clear terminal',
          echo: 'Echo text (echo [text])',
          date: 'Show current date and time',
          whoami: 'Show current user',
          ls: 'List files (mock)',
          pwd: 'Print working directory',
        };

        function print(text, color = '#e2e8f0') {
          const line = document.createElement('div');
          line.style.color = color;
          line.textContent = text;
          output.appendChild(line);
          output.scrollTop = output.scrollHeight;
        }

        function executeCommand(cmd) {
          const parts = cmd.trim().split(' ');
          const command = parts[0].toLowerCase();
          const args = parts.slice(1).join(' ');

          print('$ ' + cmd, '#64748b');

          switch(command) {
            case '':
              break;
            case 'help':
              print('Available commands:');
              Object.keys(commands).forEach(key => {
                print('  ' + key + ' - ' + commands[key]', '#94a3b8');
              });
              break;
            case 'clear':
              clearTerminal();
              break;
            case 'echo':
              print(args || '');
              break;
            case 'date':
              print(new Date().toString());
              break;
            case 'whoami':
              print('guest');
              break;
            case 'ls':
              print('file1.txt  file2.txt  folder/  document.pdf');
              break;
            case 'pwd':
              print('/home/guest');
              break;
            default:
              print('Command not found: ' + command, '#ef4444');
          }
        }

        function clearTerminal() {
          output.innerHTML = '';
        }

        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            const cmd = input.value;
            input.value = '';
            executeCommand(cmd);
          }
        });

        input.addEventListener('focus', function() {
          this.parentElement.style.borderColor = '#4f46e5';
        });

        input.addEventListener('blur', function() {
          this.parentElement.style.borderColor = '#334155';
        });
      </script>
    </div>
  `;
}
