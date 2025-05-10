document.addEventListener('DOMContentLoaded', function () {
  const STORAGE_HISTORY_KEY = 'contactFormHistory';
  const tabela = document.getElementById('cadastro-tabela').querySelector('tbody');
  const semRegistros = document.getElementById('sem-registros');
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");

  let historico = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY)) || [];

  // Função para carregar os dados da tabela
  function carregarCadastros() {
    tabela.innerHTML = ''; // Limpa a tabela antes de carregar os novos dados

    if (historico.length === 0) {
      semRegistros.style.display = 'block';
      return;
    }

    semRegistros.style.display = 'none';

    historico.forEach(item => {
      const linha = document.createElement('tr');

      const nome = item['Nome'] || '';
      const email = item['Email'] || '';
      const mensagem = item['Mensagem'] || '';
      const data = item['Data de Cadastro'] || '';

      linha.innerHTML = `
        <td>${nome}</td>
        <td>${email}</td>
        <td>${mensagem}</td>
        <td>${data}</td>
      `;

      tabela.appendChild(linha);
    });
  }

  // Função para filtrar os dados com base na pesquisa
  function filtrarTabela() {
    const termo = searchInput.value.toLowerCase();
    const filtrado = historico.filter(item =>
      item['Nome'].toLowerCase().includes(termo) ||
      item['Email'].toLowerCase().includes(termo) ||
      item['Mensagem'].toLowerCase().includes(termo)
    );

    carregarTabelaFiltrada(filtrado);
  }

  // Função para carregar a tabela com dados filtrados
  function carregarTabelaFiltrada(lista) {
    tabela.innerHTML = ''; // Limpa a tabela antes de carregar os novos dados

    if (lista.length === 0) {
      semRegistros.style.display = 'block';
      return;
    }

    semRegistros.style.display = 'none';

    lista.forEach(item => {
      const linha = document.createElement('tr');

      const nome = item['Nome'] || '';
      const email = item['Email'] || '';
      const mensagem = item['Mensagem'] || '';
      const data = item['Data de Cadastro'] || '';

      linha.innerHTML = `
        <td>${nome}</td>
        <td>${email}</td>
        <td>${mensagem}</td>
        <td>${data}</td>
      `;

      tabela.appendChild(linha);
    });
  }

  // Função para ordenar a tabela
  function ordenarTabela() {
    const criterio = sortSelect.value;

    historico.sort((a, b) => {
      if (criterio === 'data') {
        return new Date(b['Data de Cadastro']) - new Date(a['Data de Cadastro']);
      }

      return a[criterio].localeCompare(b[criterio]);
    });

    filtrarTabela(); // Refiltra os dados após a ordenação
  }

  // Adicionando eventos
  searchInput.addEventListener("input", filtrarTabela);
  sortSelect.addEventListener("change", ordenarTabela);

  // Carrega os cadastros ao carregar a página
  carregarCadastros();
});
