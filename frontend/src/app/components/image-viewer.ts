// frontend/src/app/components/image-viewer.ts
// Image Viewer window component

export function generateImageViewerHTML(): string {
  return `
    <div style="padding: 20px; color: white; font-family: 'Segoe UI', sans-serif; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5;">🖼️ Image Viewer</h2>
        <div style="display: flex; gap: 10px;">
          <button onclick="loadImage()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Open Image</button>
        </div>
      </div>

      <div id="image-container" style="flex: 1; display: flex; align-items: center; justify-content: center; background: #0f172a; border-radius: 8px; overflow: hidden; position: relative;">
        <p id="image-placeholder" style="color: #64748b;">Click "Open Image" to load an image</p>
        <img id="viewer-image" style="max-width: 100%; max-height: 100%; display: none; object-fit: contain;">
      </div>

      <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 10px; align-items: center;">
          <button onclick="zoomOut()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer;">−</button>
          <span id="zoom-level" style="min-width: 50px; text-align: center;">100%</span>
          <button onclick="zoomIn()" style="padding: 6px 12px; background: rgba(255,255,255,0.1); color: white; border: 1px solid #334155; border-radius: 6px; cursor: pointer;">+</button>
        </div>
        <div id="image-info" style="color: #64748b; font-size: 0.85rem;"></div>
      </div>

      <script>
        let currentZoom = 100;
        let currentImage = null;

        function loadImage() {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          
          input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = function(event) {
                currentImage = event.target.result;
                const img = document.getElementById('viewer-image');
                img.src = currentImage;
                img.style.display = 'block';
                document.getElementById('image-placeholder').style.display = 'none';
                
                img.onload = function() {
                  document.getElementById('image-info').textContent = 
                    img.naturalWidth + ' × ' + img.naturalHeight + ' | ' + file.name;
                };
              };
              reader.readAsDataURL(file);
            }
          };
          
          input.click();
        }

        function zoomIn() {
          if (currentZoom < 300) {
            currentZoom += 25;
            updateZoom();
          }
        }

        function zoomOut() {
          if (currentZoom > 25) {
            currentZoom -= 25;
            updateZoom();
          }
        }

        function updateZoom() {
          const img = document.getElementById('viewer-image');
          img.style.transform = 'scale(' + (currentZoom / 100) + ')';
          document.getElementById('zoom-level').textContent = currentZoom + '%';
        }

        // Drag to pan
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;
        const container = document.getElementById('image-container');
        const img = document.getElementById('viewer-image');

        container.addEventListener('mousedown', e => {
          isDragging = true;
          startX = e.clientX - translateX;
          startY = e.clientY - translateY;
          container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', e => {
          if (!isDragging) return;
          translateX = e.clientX - startX;
          translateY = e.clientY - startY;
          img.style.transform = 'scale(' + (currentZoom / 100) + ') translate(' + translateX + 'px, ' + translateY + 'px)';
        });

        document.addEventListener('mouseup', () => {
          isDragging = false;
          container.style.cursor = 'default';
        });
      </script>
    </div>
  `;
}
