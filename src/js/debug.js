// ===== DEBUG SCRIPT - TESTE DE FUNCIONALIDADES =====

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 Debug: Verificando funcionalidades...');
  
  // Teste do Dark Mode
  const darkModeBtn = document.getElementById('dark-mode-btn');
  if (darkModeBtn) {
    console.log('✅ Dark mode button encontrado');
    console.log('🌙 Estado atual:', document.body.classList.contains('dark-mode') ? 'Dark' : 'Light');
  } else {
    console.log('❌ Dark mode button não encontrado');
  }
  
  // Teste dos Links Internos
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  console.log('🔗 Links internos encontrados:', internalLinks.length);
  
  internalLinks.forEach((link, index) => {
    const targetId = link.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      console.log(`✅ Link ${index + 1}: ${targetId} -> Elemento encontrado`);
    } else {
      console.log(`❌ Link ${index + 1}: ${targetId} -> Elemento NÃO encontrado`);
    }
  });
  
  // Teste do Header
  const header = document.querySelector('.modern-header');
  if (header) {
    console.log('✅ Header moderno encontrado');
    console.log('📏 Altura do header:', header.offsetHeight);
  } else {
    console.log('❌ Header moderno não encontrado');
  }
  
  // Teste do Menu Mobile
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  if (mobileMenuToggle) {
    console.log('✅ Menu mobile toggle encontrado');
  } else {
    console.log('❌ Menu mobile toggle não encontrado');
  }
  
  // Teste de Smooth Scroll
  if ('scrollBehavior' in document.documentElement.style) {
    console.log('✅ Smooth scroll suportado pelo navegador');
  } else {
    console.log('⚠️ Smooth scroll não suportado - usando fallback');
  }
  
  console.log('🎯 Debug completo!');
});

// Função para testar dark mode manualmente
window.testDarkMode = function() {
  const body = document.body;
  const isDark = body.classList.contains('dark-mode');
  console.log('🌙 Testando dark mode...');
  console.log('Estado atual:', isDark ? 'Dark' : 'Light');
  
  // Toggle manual
  body.classList.toggle('dark-mode');
  if (isDark) {
    body.removeAttribute('data-theme');
  } else {
    body.setAttribute('data-theme', 'dark');
  }
  
  console.log('Novo estado:', body.classList.contains('dark-mode') ? 'Dark' : 'Light');
};

// Função para testar scroll suave
window.testSmoothScroll = function() {
  console.log('🔗 Testando smooth scroll...');
  const gallerySection = document.querySelector('#gallery');
  if (gallerySection) {
    const headerHeight = document.querySelector('.modern-header')?.offsetHeight || 80;
    const targetPosition = gallerySection.offsetTop - headerHeight - 20;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    console.log('✅ Scroll suave executado para #gallery');
  } else {
    console.log('❌ Seção #gallery não encontrada');
  }
}; 