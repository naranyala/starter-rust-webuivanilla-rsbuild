// frontend/src/app/components/calculator.ts
// Calculator window component

export function generateCalculatorHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5;">🧮 Calculator</h2>
      </div>

      <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <input type="text" id="calculator-display" readonly style="width: 100%; padding: 15px; font-size: 1.5rem; text-align: right; background: #0f172a; color: white; border: 1px solid #334155; border-radius: 6px; box-sizing: border-box;">
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 1;">
        <button onclick="calculatorClear()" style="grid-column: span 2; padding: 15px; background: #dc2626; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">AC</button>
        <button onclick="calculatorDelete()" style="padding: 15px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">DEL</button>
        <button onclick="calculatorAppend('/')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">÷</button>

        <button onclick="calculatorAppend('7')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">7</button>
        <button onclick="calculatorAppend('8')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">8</button>
        <button onclick="calculatorAppend('9')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">9</button>
        <button onclick="calculatorAppend('*')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">×</button>

        <button onclick="calculatorAppend('4')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">4</button>
        <button onclick="calculatorAppend('5')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">5</button>
        <button onclick="calculatorAppend('6')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">6</button>
        <button onclick="calculatorAppend('-')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">−</button>

        <button onclick="calculatorAppend('1')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">1</button>
        <button onclick="calculatorAppend('2')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">2</button>
        <button onclick="calculatorAppend('3')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">3</button>
        <button onclick="calculatorAppend('+')" style="padding: 15px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">+</button>

        <button onclick="calculatorAppend('0')" style="grid-column: span 2; padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">0</button>
        <button onclick="calculatorAppend('.')" style="padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; font-size: 1rem; cursor: pointer;">.</button>
        <button onclick="calculatorEquals()" style="padding: 15px; background: #10b981; color: white; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;">=</button>
      </div>

      <script>
        let display = document.getElementById('calculator-display');
        let current = '';
        let operator = null;
        let previous = null;

        function updateDisplay() {
          display.value = current || '0';
        }

        function calculatorAppend(val) {
          if (val === '.' && current.includes('.')) return;
          if (current === '0' && val !== '.') current = '';
          current += val;
          updateDisplay();
        }

        function calculatorClear() {
          current = '';
          operator = null;
          previous = null;
          updateDisplay();
        }

        function calculatorDelete() {
          current = current.slice(0, -1);
          updateDisplay();
        }

        function calculatorEquals() {
          if (previous === null || operator === null) return;
          let result;
          const prev = parseFloat(previous);
          const curr = parseFloat(current);
          
          switch(operator) {
            case '+': result = prev + curr; break;
            case '-': result = prev - curr; break;
            case '*': result = prev * curr; break;
            case '/': result = curr !== 0 ? prev / curr : 'Error'; break;
            default: return;
          }
          
          current = String(result);
          operator = null;
          previous = null;
          updateDisplay();
        }

        // Keyboard support
        document.addEventListener('keydown', function(e) {
          if (e.key >= '0' && e.key <= '9' || e.key === '.') calculatorAppend(e.key);
          if (e.key === 'Enter') calculatorEquals();
          if (e.key === 'Escape') calculatorClear();
          if (e.key === 'Backspace') calculatorDelete();
          if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            if (previous !== null && current) calculatorEquals();
            previous = current;
            operator = e.key;
            current = '';
          }
        });
      </script>
    </div>
  `;
}
