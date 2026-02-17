// frontend/src/app/components/system-info.ts
// System Information window component

export function generateSystemInfoHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; background: #1e293b;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">💻 System Information</h2>
      <div id="sysinfo-content">
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 5px;">Operating System</div>
          <div id="sys-os" style="font-size: 1.1rem;">Loading...</div>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 5px;">Architecture</div>
          <div id="sys-arch" style="font-size: 1.1rem;">Loading...</div>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 5px;">Memory</div>
          <div id="sys-memory" style="font-size: 1.1rem;">Loading...</div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="requestSystemInfo()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">Refresh</button>
        </div>
      </div>
      <script>
        function requestSystemInfo() {
          if (window.webui) {
            window.webui.call('get_system_info');
          }
        }
        window.addEventListener('sysinfo_response', function(e) {
          const data = e.detail;
          if (data.success && data.data) {
            const os = data.data.os || {};
            document.getElementById('sys-os').textContent = os.platform || 'Unknown';
            document.getElementById('sys-arch').textContent = os.arch || 'Unknown';
            
            const mem = data.data.memory || {};
            const total = mem.total_mb || 0;
            const free = mem.free_mb || 0;
            const used = total - free;
            document.getElementById('sys-memory').textContent = used + ' MB / ' + total + ' MB';
          }
        });
        requestSystemInfo();
      </script>
    </div>
  `;
}
