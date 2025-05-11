import { firestore } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js ';

document.addEventListener('DOMContentLoaded', async () => {
  // Constantes
  const ADS_STORAGE_KEY = 'premiumAdsData'; // ainda usamos localStorage para fallback temporariamente
  const CLOUD_NAME = "dmq4e5bm5";
  const UPLOAD_PRESET = "brandConnectPresetName";
  let editingIndex = null;
  let adsList = [];

  // Elementos DOM
  const adForm = document.getElementById('ad-form');
  const adSearchInput = document.getElementById('ad-search-input');
  const adFilterStatus = document.getElementById('ad-filter-status');
  const clientSelect = document.getElementById('ad-client');

  // Carrega dados inicialmente
  await loadPremiumClients();
  setupDateInputs();
  adsList = await loadPremiumAdsFromFirestore();
  renderAdsList();

  // Event Listeners
  if (adForm) adForm.addEventListener('submit', handleAdSubmit);
  if (adSearchInput) adSearchInput.addEventListener('input', renderAdsList);
  if (adFilterStatus) adFilterStatus.addEventListener('change', renderAdsList);

  // --- Funções Principais ---

  async function loadPremiumClients() {
    const logos = await loadClientsFromFirestore();
    populateClientSelect(logos);
  }

  async function loadClientsFromFirestore() {
    try {
      const logosRef = collection(firestore, 'logos');
      const q = query(logosRef, where('planType', '==', 'premium-plus'));
      const snapshot = await getDocs(q);
      const clients = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (isContractActive(data)) {
          clients.push({
            id: doc.id,
            ...data
          });
        }
      });

      return clients;
    } catch (error) {
      console.error("Erro ao carregar clientes do Firestore:", error);
      return [];
    }
  }

  function populateClientSelect(clients) {
    if (!clientSelect) return;

    clientSelect.innerHTML = '<option value="">Selecione um cliente premium plus</option>';

    const activeClients = clients.filter(client => isContractActive(client));
    activeClients.sort((a, b) => a.clientName.localeCompare(b.clientName));

    activeClients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.clientCNPJ;
      option.textContent = `${client.clientName} (${client.clientFantasyName || ''})`;
      option.title = `CNPJ: ${formatCNPJ(client.clientCNPJ)} | Plano: ${client.planType}`;
      clientSelect.appendChild(option);
    });
  }

  async function handleAdSubmit(e) {
    e.preventDefault();
    const formData = getFormData();
    if (!validateFormData(formData)) return;

    const fileInput = document.getElementById('ad-media-file')?.files[0];
    let mediaUrl = formData.mediaUrl;

    // Se houver arquivo, faz upload via Cloudinary
    if (fileInput) {
      try {
        mediaUrl = await uploadImageToCloudinary(fileInput);
      } catch (err) {
        alert("Erro ao fazer upload da imagem.");
        return;
      }
    }

    const newAd = createAdObject(formData, mediaUrl);
    await savePremiumAd(newAd);
    showAlert("Propaganda salva com sucesso!");
    adForm.reset();
    adsList = await loadPremiumAdsFromFirestore();
    renderAdsList();
  }

  function getFormData() {
    return {
      title: document.getElementById('ad-title').value.trim(),
      description: document.getElementById('ad-description').value.trim(),
      mediaType: document.getElementById('ad-type').value,
      mediaUrl: document.getElementById('ad-media').value.trim(),
      targetUrl: document.getElementById('ad-link').value.trim(),
      clientCNPJ: document.getElementById('ad-client').value,
      startDate: document.getElementById('ad-start').value,
      endDate: document.getElementById('ad-end').value
    };
  }

  function validateFormData(data) {
    const requiredFields = ['title', 'description', 'mediaType', 'targetUrl', 'clientCNPJ', 'startDate', 'endDate'];
    for (let field of requiredFields) {
      if (!data[field]) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return false;
      }
    }

    if (!isValidUrl(data.targetUrl)) {
      alert("O link de destino é inválido.");
      return false;
    }

    if (!validateAdDates(data.startDate, data.endDate)) {
      return false;
    }

    return true;
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  function validateAdDates(startDate, endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      alert("A data de início não pode ser posterior à data de término");
      return false;
    }
    if (end < today) {
      alert("A data de término não pode ser anterior à data atual");
      return false;
    }
    return true;
  }

  function createAdObject(formData, mediaUrl) {
    return {
      ...formData,
      mediaUrl,
      createdAt: new Date().toISOString(),
      isActive: true,
      clicks: 0,
      impressions: 0
    };
  }

  async function savePremiumAd(adData) {
    try {
      await addDoc(collection(firestore, 'premiumAds'), adData);
    } catch (error) {
      console.error("Erro ao salvar propaganda:", error);
    }
  }

  async function loadPremiumAdsFromFirestore() {
    try {
      const snapshot = await getDocs(collection(firestore, 'premiumAds'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erro ao carregar propagandas:", error);
      return [];
    }
  }

  function renderAdsList() {
    const adsGrid = document.getElementById('premium-ads-list');
    if (!adsGrid) return;

    const searchTerm = (adSearchInput.value || '').toLowerCase();
    const statusFilter = adFilterStatus.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtro
    const filtered = adsList.filter(ad => {
      const matchesSearch =
        ad.title.toLowerCase().includes(searchTerm) ||
        ad.description.toLowerCase().includes(searchTerm) ||
        ad.clientName?.toLowerCase().includes(searchTerm);

      const startDate = new Date(ad.startDate);
      const endDate = new Date(ad.endDate);

      switch (statusFilter) {
        case 'active':
          return startDate <= today && endDate >= today && ad.isActive;
        case 'inactive':
          return !ad.isActive;
        case 'upcoming':
          return startDate > today;
        case 'expired':
          return endDate < today;
        default:
          return matchesSearch;
      }
    });

    // Renderização
    adsGrid.innerHTML = '';
    if (filtered.length === 0) {
      adsGrid.innerHTML = '<div class="no-ads">Nenhuma propaganda encontrada.</div>';
      return;
    }

    filtered.forEach(ad => {
      const card = createAdCard(ad);
      adsGrid.appendChild(card);
    });

    setupAdButtons();
  }

  function createAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'premium-ad-card';
    card.dataset.id = ad.id;

    const startDate = new Date(ad.startDate);
    const endDate = new Date(ad.endDate);
    const today = new Date();
    let statusText = 'Ativa';
    let statusClass = 'active';

    if (endDate < today) {
      statusText = 'Expirada';
      statusClass = 'expired';
    } else if (startDate > today) {
      statusText = 'Futura';
      statusClass = 'upcoming';
    }

    card.innerHTML = `
      <div class="ad-media">
        ${ad.mediaType === 'image' ? `<img src="${ad.mediaUrl}" alt="${ad.title}">` : `<video src="${ad.mediaUrl}" controls></video>`}
        <div class="ad-status ${statusClass}">${statusText}</div>
      </div>
      <h3>${ad.title}</h3>
      <p>${ad.description}</p>
      <small>Cliente: ${ad.clientName}</small><br>
      <small>Datas: ${ad.startDate} - ${ad.endDate}</small>
      <div class="actions">
        <button class="edit-btn" data-id="${ad.id}">Editar</button>
        <button class="delete-btn" data-id="${ad.id}">Excluir</button>
      </div>
    `;
    return card;
  }

  function setupAdButtons() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editAd(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteAd(btn.dataset.id));
    });
  }

  async function editAd(id) {
    const ad = adsList.find(a => a.id === id);
    fillAdForm(ad);
    editingIndex = id;
  }

  function fillAdForm(ad) {
    document.getElementById('ad-title').value = ad.title;
    document.getElementById('ad-description').value = ad.description;
    document.getElementById('ad-type').value = ad.mediaType;
    document.getElementById('ad-media-url').value = ad.mediaUrl;
    document.getElementById('ad-link').value = ad.targetUrl;
    document.getElementById('ad-client').value = ad.clientCNPJ;
    document.getElementById('ad-start').value = ad.startDate;
    document.getElementById('ad-end').value = ad.endDate;
    document.getElementById('save-ad').textContent = 'Atualizar';
  }

  async function confirmDeleteAd(id) {
    if (!confirm("Tem certeza que deseja excluir esta propaganda?")) return;
    try {
      await deleteDoc(doc(firestore, 'premiumAds', id));
      adsList = adsList.filter(a => a.id !== id);
      renderAdsList();
      alert("Propaganda excluída com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir propaganda:", error);
      alert("Erro ao excluir propaganda.");
    }
  }

  function setupDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('ad-start');
    const endInput = document.getElementById('ad-end');
    if (!startInput || !endInput) return;

    startInput.min = today;
    endInput.min = today;

    startInput.addEventListener('change', () => {
      endInput.min = startInput.value;
      if (endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
    });
  }

  async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/ ${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Falha no upload");

    const data = await res.json();
    return data.secure_url;
  }

  function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  function isContractActive(client) {
    const endDate = new Date(client.endDate);
    const now = new Date();
    return endDate >= now && client.contractActive;
  }
});