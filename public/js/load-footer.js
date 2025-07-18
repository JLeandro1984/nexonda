// Carrega o footer.html e injeta no #footer-placeholder
(function() {
  // Aguarda o DOM estar completamente carregado
  function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) {
      console.warn('Footer placeholder não encontrado');
      return;
    }
           
    fetch('./footer.html')
      .then(resp => {
        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }
        return resp.text();
      })
      .then(html => {
        placeholder.innerHTML = html;
        console.log('Footer carregado com sucesso');
      })
      .catch((error) => {
        console.error('Erro ao carregar footer:', error);
        placeholder.innerHTML = '<div style="text-align:center;color:#888;padding:2rem 0">Rodapé indisponível</div>';
      });
  }

  // Executa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFooter);
  } else {
    loadFooter();
  }
})(); 