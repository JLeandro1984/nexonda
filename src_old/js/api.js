// Configuração base da API
const API_BASE_URL = 'https://us-central1-nexonda-281084.cloudfunctions.net';

// Função para obter o token de autenticação
async function getAuthToken() {
    try {
        console.log('Obtendo token de autenticação...');
        
        // Obtém o token do localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('Token não encontrado no localStorage');
            throw new Error('Usuário não autenticado');
        }

        console.log('Token obtido do localStorage:', token.substring(0, 20) + '...'); // Debug
        return token;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        throw new Error('Não autorizado');
    }
}

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
    try {
        if (!endpoint) {
            throw new Error('Endpoint é obrigatório');
        }
        
        console.log(`Fazendo requisição para: ${endpoint}`);
        const token = await getAuthToken();

        // Usando o mesmo formato de headers que funciona na verificação de autenticação
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // Garantindo que a URL sempre tenha um endpoint válido
        let url = `${API_BASE_URL}/${endpoint}`;

        console.log('URL da requisição:', url);

        const requestOptions = {
            method: options.method || 'GET',
            headers: headers,
            mode: 'cors' // Adiciona modo CORS
        };

        // Só adiciona o body se não for GET
        if (options.method !== 'GET' && options.body) {
            requestOptions.body = options.body;
        }

        console.log('Opções da requisição:', {
            method: requestOptions.method,
            hasBody: !!requestOptions.body,
            headers: Object.keys(headers)
        });

        const response = await fetch(url, requestOptions);
        console.log('Resposta recebida:', response.status, response.statusText);

        // Se for erro 401, verifica se é realmente um erro de autenticação
        if (response.status === 401) {
            const errorData = await response.json();
            console.log('Erro 401:', errorData); // Debug
            throw new Error(errorData.error || 'Erro de autenticação');
        }

        if (!response.ok) {
            const error = await response.json();
            console.error('Erro na resposta:', error);
            throw new Error(error.error || 'Erro na requisição');
        }

        const data = await response.json();
        console.log('Resposta bruta da API:', data); // 
        return data;
    } catch (error) {
        console.error(`Erro na requisição para ${endpoint}:`, error);
        throw error;
    }
}

// API de Logos
const logosApi = {   
    // Listar todos os logos
    getAll: () => apiRequest('logos'),
        
    // Adicionar novo logo
    add: (logoData) => apiRequest('logos', {
        method: 'POST',
        body: JSON.stringify(logoData)
    }),
    
    // Atualizar logo existente
    update: (logoId, logoData) => apiRequest(`logos/${logoId}`, {
        method: 'PUT',
        body: JSON.stringify(logoData)
    }),
    
    // Deletar logo
    delete: (logoId) => apiRequest(`logos/${logoId}`, {
        method: 'DELETE'
    }),
    
    /*
        // Upload de imagem para Cloudinary
        uploadImageBase64: async (base64Image, publicId = null) => {
            try {
                const token = await getAuthToken();
                if (!token) throw new Error('Token não encontrado');

                const response = await fetch(`${API_BASE_URL}/uploadImage`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        base64Image,   // Envia a imagem inteira (com "data:image/png;base64,...")
                        publicId       // Opcional: reescreve a imagem anterior
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Erro no upload');
                }

                const result = await response.json();
                return result; // { secureUrl, publicId }
            } catch (error) {
                console.error('Erro no upload:', error);
                throw error;
            }
        },

        // Exclusão da imagem no Cloudinary
        deleteImage: async (publicId) => {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/deleteImage`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ publicId })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Erro ao deletar imagem');
            }
        }
    */
};

    
// API de Contatos
const contactsApi = {
    // Listar todos os contatos
    getAll: () => apiRequest('contacts'),
    
    // Adicionar novo contato
    add: (contactData) => apiRequest('contacts', {
        method: 'POST',
        body: JSON.stringify(contactData)
    }),
    
    // Deletar contato
    delete: (contactId) => apiRequest(`contacts/${contactId}`, {
        method: 'DELETE'
    })
};

// API de Anúncios Premium
const premiumAdsApi = {
   
    // Listar todos os anúncios
    getAll: async () => {      
        try {         
            // Força a chamada direta para o endpoint premiumAds
            const response = await fetch(`${API_BASE_URL}/premiumAds`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${await getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error('Erro ao obter propagandas');
            }

            const data = await response.json();
            
            // Filtra apenas os registros válidos de premiumAds
            const validAds = Array.isArray(data) ? data.filter(ad => {
                // Verifica se é um registro de premiumAds (não tem campos específicos de logos)
                const isPremiumAd = ad && 
                    typeof ad === 'object' && 
                    ad.id && 
                    ad.title && 
                    ad.description &&
                    ad.mediaType &&
                    ad.mediaUrl &&
                    !ad.category && // Não deve ter campos de logos
                    !ad.clientCity &&
                    !ad.clientFantasyName &&
                    !ad.clientLevel &&
                    !ad.contractActive &&
                    !ad.contractMonths &&
                    !ad.contractValue;
                
                if (!isPremiumAd) {
                    console.warn('Registro inválido ou não é uma propaganda premium:', ad);
                }
                
                return isPremiumAd;
            }) : [];
            
            console.log('Número de propagandas válidas:', validAds.length);

            validAds.forEach((ad, index) => {
                console.log(`Propaganda ${index + 1}:`, {
                    id: ad.id,
                    title: ad.title,
                    description: ad.description,
                    mediaType: ad.mediaType,
                    mediaUrl: ad.mediaUrl,
                    targetUrl: ad.targetUrl,
                    clientCNPJ: ad.clientCNPJ,
                    startDate: ad.startDate,
                    endDate: ad.endDate,
                    isActive: ad.isActive,
                    clicks: ad.clicks || 0,
                    impressions: ad.impressions || 0
                });
            });
            
            return validAds;
        } catch (error) {
            console.error('Erro ao obter propagandas:', error);
            console.error('Detalhes do erro:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    },
    
    // Adicionar novo anúncio
    add: (adData) => apiRequest('premiumAds', {
        method: 'POST',
        body: JSON.stringify(adData)
    }),
    
    // Atualizar anúncio
    // update: (adId, adData) => apiRequest(`premiumAds/${adId}`, {
    //     method: 'PUT',
    //     body: JSON.stringify(adData)
    // }),
    
    update: (adId, adData) => {
        return apiRequest('premiumAds', {
            method: 'PUT',
            body: JSON.stringify({ id: adId, ...adData })
        });
    },

    
    // Deletar anúncio
    delete: (adId) => apiRequest(`premiumAds`, {
        method: 'DELETE',
         body: JSON.stringify({ id: adId})
    })
};

// API de Autenticação
const authApi = {
    // Verificar autenticação
    checkAuth: async () => {
        try {
            const response = await apiRequest('checkAuth');
            console.log('Resposta bruta da API de autenticação:', response);
            
            // Verifica se a resposta tem o formato esperado
            if (response && typeof response === 'object') {
                return {
                    isAuthorized: response.authorized === true,
                    user: response.user || null
                };
            }
            
            // Se não for um objeto válido, considera não autorizado
            console.error('Resposta da API em formato inesperado:', response);
            return {
                isAuthorized: false,
                user: null
            };
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return {
                isAuthorized: false,
                user: null
            };
        }
    },
    
    // Listar usuários autorizados
    listAuthorizedUsers: () => apiRequest('listAuthorizedUsers'),
    
    // Adicionar usuário autorizado
    addAuthorizedUser: (userData) => apiRequest('authorizedUsers', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    
    // Remover usuário autorizado
    removeAuthorizedUser: (userId) => apiRequest(`authorizedUsers/${userId}`, {
        method: 'DELETE'
    })
};

// Exportar todas as APIs e funções necessárias
export {
    logosApi,
    contactsApi,
    premiumAdsApi,
    authApi,
    apiRequest
}; 