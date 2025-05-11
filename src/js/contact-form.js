import { firestore, serverTimestamp } from '../js/firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function () {
  const CONTACTS_COLLECTION = 'contacts'; // Nome da coleção no Firestore
  const tabela = document.getElementById('cadastro-tabela').querySelector('tbody');
  const semRegistros = document.getElementById('sem-registros');
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");

  let historico = [];

  // Função para carregar os dados do Firestore
  async function carregarCadastros() {
    try {
      const querySnapshot = await getDocs(collection(firestore, CONTACTS_COLLECTION));
      historico = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Tratamento da data
        let dataCadastro = '';
        if (data.createdAt) {
          // Se for um timestamp do Firebase
          if (data.createdAt.toDate) {
            dataCadastro = data.createdAt.toDate().toLocaleString('pt-BR');
          } 
          // Se já for uma string (caso já tenha sido formatada antes)
          else if (typeof data.createdAt === 'string') {
            dataCadastro = data.createdAt;
          }
        }
        
        historico.push({
          'Nome': data.Nome || '',
          'Email': data.Email || '',
          'Mensagem': data.Mensagem || '',
          'Data de Cadastro': dataCadastro
        });
      });
  
      atualizarTabela();
    } catch (error) {
      console.error("Erro ao carregar cadastros:", error);
      semRegistros.style.display = 'block';
      semRegistros.textContent = 'Erro ao carregar dados.';
    }
  }

  // Função para atualizar a tabela com os dados atuais
  function atualizarTabela() {
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
      (item['Nome'] && item['Nome'].toLowerCase().includes(termo)) ||
      (item['Email'] && item['Email'].toLowerCase().includes(termo)) ||
      (item['Mensagem'] && item['Mensagem'].toLowerCase().includes(termo))
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

      // Adiciona verificação para propriedades undefined
      if (!a[criterio] || !b[criterio]) return 0;
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