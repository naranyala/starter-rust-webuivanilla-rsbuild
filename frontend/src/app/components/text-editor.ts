// frontend/src/app/components/text-editor.ts
// Text Editor window component

export function generateTextEditorHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5;">📝 Text Editor</h2>
        <div style="display: flex; gap: 10px;">
          <button onclick="textEditorSave()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Save</button>
          <button onclick="textEditorLoad()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">Load</button>
        </div>
      </div>

      <textarea id="text-editor-content" style="flex: 1; width: 100%; padding: 15px; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 8px; resize: none; font-family: monospace; font-size: 1rem; box-sizing: border-box;"></textarea>

      <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div style="color: #94a3b8; font-size: 0.8rem;">
          <span id="cursor-position">Line: 1, Column: 1</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="textEditorUndo()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Undo</button>
          <button onclick="textEditorRedo()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Redo</button>
        </div>
      </div>

      <script>
        let textEditorContent = document.getElementById('text-editor-content');
        let undoStack = [];
        let redoStack = [];

        function saveState() {
          undoStack.push(textEditorContent.value);
          if (undoStack.length > 50) undoStack.shift();
          redoStack = [];
        }

        function updateCursorPosition() {
          const textarea = textEditorContent;
          const text = textarea.value.substring(0, textarea.selectionStart);
          const lines = text.split('\\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          document.getElementById('cursor-position').textContent = 'Line: ' + line + ', Column: ' + column;
        }

        function textEditorSave() {
          const content = textEditorContent.value;
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'document.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        function textEditorLoad() {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.txt,.js,.ts,.html,.css,.json,.md';
          
          input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
              textEditorContent.value = e.target.result;
              saveState();
              updateCursorPosition();
            };
            
            reader.readAsText(file);
          };
          
          input.click();
        }

        function textEditorUndo() {
          if (undoStack.length > 0) {
            redoStack.push(textEditorContent.value);
            textEditorContent.value = undoStack.pop();
          }
        }

        function textEditorRedo() {
          if (redoStack.length > 0) {
            undoStack.push(textEditorContent.value);
            textEditorContent.value = redoStack.pop();
          }
        }

        textEditorContent.addEventListener('input', saveState);
        textEditorContent.addEventListener('keyup', updateCursorPosition);
      </script>
    </div>
  `;
}
