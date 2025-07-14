// Script para gerar ícones PNG para PWA
// Execute este script no navegador para gerar os ícones

function generateIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#007bff');
  gradient.addColorStop(1, '#0056b3');
  
  // Draw background circle
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 10, 0, 2 * Math.PI);
  ctx.fill();
  
  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  
  // Draw letter N
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', size/2, size/2);
  
  // Decorative circles
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.005;
  ctx.globalAlpha = 0.3;
  
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.35, 0, 2 * Math.PI);
  ctx.stroke();
  
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.23, 0, 2 * Math.PI);
  ctx.stroke();
  
  return canvas;
}

function downloadIcon(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Generate and download icons
function generateAllIcons() {
  console.log('Gerando ícones para PWA...');
  
  // Generate 192x192 icon
  const icon192 = generateIcon(192);
  downloadIcon(icon192, 'icon-192x192.png');
  
  // Generate 512x512 icon
  const icon512 = generateIcon(512);
  downloadIcon(icon512, 'icon-512x512.png');
  
  console.log('Ícones gerados com sucesso!');
}

// Auto-execute if run in browser
if (typeof window !== 'undefined') {
  generateAllIcons();
} 