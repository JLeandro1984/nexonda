// Carrega o footer.html e injeta no #footer-placeholder
(function() {
  const placeholder = document.getElementById('footer-placeholder');
  if (!placeholder) return;
  fetch('/footer.html')
    .then(resp => resp.text())
    .then(html => {
      placeholder.innerHTML = html;
    })
    .catch(() => {
      placeholder.innerHTML = '<div style="text-align:center;color:#888;padding:2rem 0">Rodapé indisponível</div>';
    });
})(); 