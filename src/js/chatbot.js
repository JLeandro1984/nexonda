import { categories } from './categories.js';
// Chatbot com integração Gemini IA
class Chatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isTyping = false;
    this.init();
  }

  init() {
    console.log('Inicializando chatbot...');
    this.createChatbotHTML();
    this.bindEvents();
    this.addWelcomeMessage();
    this.loadContextData();
    console.log('Chatbot inicializado!');
  }

  async loadContextData() {
    try {
      const [logosRes, adsRes] = await Promise.all([
        fetch('https://us-central1-brandconnect-50647.cloudfunctions.net/publicLogos'),
        fetch('https://us-central1-brandconnect-50647.cloudfunctions.net/publicPremiumAds')
      ]);

      const [logos, ads] = await Promise.all([logosRes.json(), adsRes.json()]);

      this.logos = logos;
      this.ads = ads;
    } catch (e) {
      console.warn('Erro ao carregar dados públicos para o assistente:', e);
      this.logos = [];
      this.ads = [];
    }
  }

  createChatbotHTML() {
    if (document.getElementById('chatbot-toggle')) return; // Evita duplicação

    const chatbotHTML = `
      <div class="chatbot-container">
        <button class="floating-btn chatbot-toggle" id="chatbot-toggle" title="Chat com IA" type="button">
          <i class="fas fa-comments"></i>
        </button>
        <div class="chatbot-window" id="chatbot-window">
          <div class="chatbot-header">
            <h3>🤖 Assistente BrandConnect</h3>
            <button class="close-btn" id="chatbot-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="chatbot-messages" id="chatbot-messages"></div>
          <div class="chatbot-input-container">
            <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Digite sua pergunta..." maxlength="500">
            <button class="chatbot-send-btn" id="chatbot-send">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Insere dentro do container de botões flutuantes, se existir
    const floatingContainer = document.querySelector('.floating-buttons-container');
    if (floatingContainer) {
      floatingContainer.insertAdjacentHTML('afterbegin', chatbotHTML);
      console.log('Chatbot HTML criado dentro do floating-buttons-container');
    } else {
      document.body.insertAdjacentHTML('beforeend', chatbotHTML);
      console.log('Chatbot HTML criado no body');
    }
  }

  bindEvents() {
    const toggle = document.getElementById('chatbot-toggle');
    const close = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const send = document.getElementById('chatbot-send');

    toggle.addEventListener('click', () => this.toggleChat());
    close.addEventListener('click', () => this.closeChat());

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    send.addEventListener('click', () => this.sendMessage());

    document.addEventListener('click', (e) => {
      if (this.isOpen && !e.target.closest('.chatbot-container')) {
        this.closeChat();
      }
    });
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');
    
    console.log('Abrindo chat - toggle encontrado:', !!toggle);
    
    window.classList.add('active');
    toggle.classList.add('minimize');
    this.isOpen = true;

    const whatsappBtn = document.querySelector('.whatsapp-float');
    if (whatsappBtn) {
      whatsappBtn.style.opacity = '0';
      whatsappBtn.style.visibility = 'hidden';
      whatsappBtn.style.pointerEvents = 'none';
    }

    setTimeout(() => {
      document.getElementById('chatbot-input').focus();
    }, 300);
  }

  closeChat() {
    const window = document.getElementById('chatbot-window');
    const toggle = document.getElementById('chatbot-toggle');
    window.classList.remove('active');
    toggle.classList.remove('minimize');
    this.isOpen = false;

    setTimeout(() => {
      const whatsappBtn = document.querySelector('.whatsapp-float');
      if (whatsappBtn) {
        whatsappBtn.style.opacity = '1';
        whatsappBtn.style.visibility = 'visible';
        whatsappBtn.style.pointerEvents = 'auto';
      }
    }, 200);
  }

  addWelcomeMessage() {
    const welcomeMessage = {
      type: 'bot',
      text: `Olá! 👋 Sou o assistente virtual do BrandConnect. Como posso ajudá-lo hoje?\n\n💡 Algumas sugestões:\n• "Quero anunciar no BrandConnect, como funciona?"\n• "Quais são os estabelecimentos com entrega em São Paulo?"\n• "O site é gratuito? Como funciona o plano premium?"\n• "Buscar por salão de beleza perto do centro"\n\nOu simplesmente digite sua pergunta! 😊`
    };
    this.addMessage(welcomeMessage);
  }

  addMessage(message) {
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  renderMessage(message) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${message.type}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${message.type}`;
    bubble.textContent = message.text;

    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
  }

  showTyping() {
    if (this.isTyping) return;
    this.isTyping = true;

    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-message bot';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="message-bubble bot">
        <div class="chatbot-typing">
          <span>Assistente está digitando</span>
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    this.isTyping = false;
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatbot-messages');
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    this.addMessage({ type: 'user', text });
    input.value = '';
    this.showTyping();

    try {
      const response = await this.callGemini(text);
      this.hideTyping();
      this.addMessage({ type: 'bot', text: response });
    } catch (error) {
      this.hideTyping();
      this.addMessage({ type: 'bot', text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.' });
    }
  }

  async callGemini(userMessage) {
    const prompt = this.buildPrompt(userMessage);
    const getGeminiEndpoint = () => {
      const hostname = window.location.hostname;
      if (hostname === 'jleandro1984.github.io') return 'https://us-central1-brandconnect-50647.cloudfunctions.net/askGemini';
      if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5001/brandconnect-50647/us-central1/askGemini';
      return 'https://us-central1-brandconnect-50647.cloudfunctions.net/askGemini';
    };

    const GEMINI_ENDPOINT = getGeminiEndpoint();
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error(`Erro na comunicação com a IA: ${response.status}`);

    const data = await response.json();
    if (data.reply && data.reply.trim() !== '') return data.reply;
    if (data.error) return 'Desculpe, ocorreu um erro interno. Tente novamente.';
    return 'Desculpe, não consegui processar sua pergunta. Tente reformular.';
  }

  buildPrompt(userMessage) {
    const resumoEmpresas = this.logos?.slice(0, 10).map(e => `• ${e.clientFantasyName} (${e.clientCity} - ${e.clientUf}) - ${this.getCategoryLabelByValue(e.logoCategory)}`).join('\n') || 'Sem dados no momento';
    const resumoAnuncios = this.ads?.slice(0, 5).map(a => `• ${a.title} - ${a.mediaType} (${a.clientName})`).join('\n') || 'Sem anúncios ativos.';

    return `Você é BrainTalk, o assistente virtual do BrandConnect 🤖 — uma plataforma moderna e amigável que conecta consumidores e empresas por meio de uma galeria interativa de logotipos.

Sua missão é acolher, entender e surpreender o usuário com respostas diretas, claras e personalizadas. Use uma linguagem empática, acessível e sempre profissional, como um consultor digital de confiança. Responda de forma leve, com vocabulário simples (sem jargões técnicos), mas com autoridade e simpatia. Use emojis com moderação para deixar a conversa mais próxima e humana 😊.

🎯 OBJETIVO DO BRANDCONNECT:
- Facilitar a descoberta de empresas incríveis por meio de uma galeria visual de logotipos.
- Usuários podem buscar empresas por categoria, localização ou nome.
- Empresas podem anunciar seus serviços por meio de três planos: **Básico**, **Premium** e **Premium-Plus**.
- O site é gratuito para visitantes. Apenas empresas pagam para anunciar.
- Todas as empresas têm nível de destaque ajustável de 0 a 10.

💼 DETALHES DOS PLANOS:
- 🔹 **BÁSICO**: Logo na galeria com nome fantasia, status (Aberto/Fechado), e link para site ou rede social.
- 🔸 **PREMIUM**: Tudo do Básico + destaque visual + ícone de info com dados como nome, categoria, contato, endereço (opcional), geolocalização (opcional), site e horário de funcionamento.
- ⭐ **PREMIUM-PLUS**: Tudo do Premium + vídeo promocional na vitrine de destaques + destaque máximo + acesso vitalício a futuras melhorias.

📊 RESUMO DE EMPRESAS (exibindo até 10):\n${resumoEmpresas}

🎥 RESUMO DE PROPAGANDAS (exibindo até 5):\n${resumoAnuncios}

🔗 LINKS IMPORTANTES:
- 🌐 Site: https://brandconnect-50647.web.app
- 📄 Política de Privacidade: https://brandconnect-50647.web.app/pages/privacy-policy.html
- 📧 Contato por e-mail: jlbrandconnect@gmail.com
- 💬 WhatsApp: (15) 99625-7159
- 📝 Formulário de orçamento: vá até o rodapé ou clique em "Contato" no menu principal

🧠 INSTRUÇÕES PARA SUA RESPOSTA:
1. Sempre responda com empatia, clareza e objetividade.
2. Utilize frases como "Posso te ajudar com isso!" ou "Boa escolha!" para aproximar o usuário.
3. Adapte sua resposta se o usuário parecer ser:
  - Visitante 🧍 (procurando empresas ou informações)
  - Anunciante 💼 (interessado em planos)
  - Empresa parceira 🤝 (desejando visibilidade ou suporte)
4. Sugira sempre o que o usuário pode fazer no próximo passo (ex: "Use a busca 🔍 no topo da página", "Clique aqui para ver os planos", etc).
5. Use links diretos sempre que mencionar páginas do site.
6. Dê dicas úteis e sugira recursos como filtros por categoria ou localização inteligente.
7. Evite repetições ou termos técnicos. Fale como gente de verdade.
8. Para o formulário de orçamento, não envie links diretamente. Oriente o cliente a rolar até o final da página ou clicar em "Contato" no menu.

📩 MENSAGEM DO USUÁRIO:
"${userMessage}"

Agora responda como BrainTalk, o assistente virtual do BrandConnect. Seja gentil, útil e direto ao ponto. Apresente sugestões práticas, links úteis e, quando possível, surpreenda com valor agregado.`;
  }

  // Função para buscar o label da categoria a partir do valor usando o objeto categories
  getCategoryLabelByValue(value) {
    for (const group of categories) {
      if (group.value === value) return group.label;
      const found = group.options && group.options.find(opt => opt.value === value);
      if (found) return found.label;
    }
    return value;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado, criando chatbot...');
  try {
    new Chatbot();
    console.log('Chatbot criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar chatbot:', error);
  }
});

window.Chatbot = Chatbot;
