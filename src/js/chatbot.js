// Chatbot com integração Gemini IA
class Chatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isTyping = false;
    this.init();
  }

  init() {
    this.createChatbotHTML();
    this.bindEvents();
    this.addWelcomeMessage();
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
          
          <div class="chatbot-messages" id="chatbot-messages">
            <!-- Mensagens serão inseridas aqui -->
          </div>
          
          <div class="chatbot-input-container">
            <input 
              type="text" 
              class="chatbot-input" 
              id="chatbot-input" 
              placeholder="Digite sua pergunta..."
              maxlength="500"
            >
            <button class="chatbot-send-btn" id="chatbot-send">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Insere o chatbot no container de botões flutuantes
    const floatingContainer = document.querySelector('.floating-buttons-container');
    if (floatingContainer) {
      floatingContainer.insertAdjacentHTML('afterbegin', chatbotHTML);
    } else {
      // Fallback: insere no body se o container não existir
      document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }
  }

  bindEvents() {
    const toggle = document.getElementById('chatbot-toggle');
    const close = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const send = document.getElementById('chatbot-send');
    const window = document.getElementById('chatbot-window');

    toggle.addEventListener('click', () => this.toggleChat());
    close.addEventListener('click', () => this.closeChat());
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    send.addEventListener('click', () => this.sendMessage());

    // Fechar ao clicar fora
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
    
    window.classList.add('active');
    toggle.classList.add('minimize');
    this.isOpen = true;
    
    // Remove o indicador de notificação
    toggle.style.setProperty('--notification-visible', 'none');
    
    // Oculta o ícone do WhatsApp quando o chat está aberto
    const whatsappBtn = document.querySelector('.whatsapp-float');
    if (whatsappBtn) {
      whatsappBtn.style.opacity = '0';
      whatsappBtn.style.visibility = 'hidden';
      whatsappBtn.style.pointerEvents = 'none';
      // Preserva a cor do ícone
      whatsappBtn.style.backgroundColor = '#25d366';
      whatsappBtn.style.color = '#fff';
    }
    
    // Focar no input
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
    
    // Exibe novamente o ícone do WhatsApp quando o chat é fechado (com delay)
    setTimeout(() => {
      const whatsappBtn = document.querySelector('.whatsapp-float');
      if (whatsappBtn) {
        whatsappBtn.style.opacity = '1';
        whatsappBtn.style.visibility = 'visible';
        whatsappBtn.style.pointerEvents = 'auto';
        // Restaura a cor do ícone
        whatsappBtn.style.backgroundColor = '#25d366';
        whatsappBtn.style.color = '#fff';
      }
    }, 200); // Pequeno delay para transição suave
  }

  addWelcomeMessage() {
    const welcomeMessage = {
      type: 'bot',
      text: `Olá! 👋 Sou o assistente virtual do BrandConnect. Como posso ajudá-lo hoje?

💡 Algumas sugestões:
• "Quero anunciar no BrandConnect, como funciona?"
• "Quais são os estabelecimentos com entrega em São Paulo?"
• "O site é gratuito? Como funciona o plano premium?"
• "Buscar por salão de beleza perto do centro"

Ou simplesmente digite sua pergunta! 😊`
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
    
    if (!text || this.isTyping) {
      return;
    }
    
    // Adiciona mensagem do usuário
    this.addMessage({ type: 'user', text });
    input.value = '';
    
    // Mostra indicador de digitação
    this.showTyping();
    
    try {
      const response = await this.callGemini(text);
      this.hideTyping();
      this.addMessage({ type: 'bot', text: response });
    } catch (error) {
      this.hideTyping();
      this.addMessage({ 
        type: 'bot', 
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.' 
      });
    }
  }

  async callGemini(userMessage) {
    const prompt = this.buildPrompt(userMessage);
    
    // Função para detectar o endpoint correto
    const getGeminiEndpoint = () => {
      const hostname = window.location.hostname;
      const port = window.location.port;
      const protocol = window.location.protocol;
      
      // Se estiver no GitHub Pages, usar produção
      if (hostname === 'jleandro1984.github.io') {
        return 'https://us-central1-brandconnect-50647.cloudfunctions.net/askGemini';
      }
      
      // Se estiver em localhost com qualquer porta, usar local
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5001/brandconnect-50647/us-central1/askGemini';
      }
      
      // Para outros domínios, usar produção
      return 'https://us-central1-brandconnect-50647.cloudfunctions.net/askGemini';
    };
    
    const GEMINI_ENDPOINT = getGeminiEndpoint();
    
    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na comunicação com a IA: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verifica se há resposta válida
      if (data.reply && data.reply.trim() !== '') {
        return data.reply;
      } else if (data.error) {
        return 'Desculpe, ocorreu um erro interno. Tente novamente.';
      } else {
        return 'Desculpe, não consegui processar sua pergunta. Tente reformular.';
      }
    } catch (error) {
      throw error;
    }
  }

  buildPrompt(userMessage) {
    return `Você é o assistente virtual do BrandConnect, uma plataforma que conecta empresas e consumidores através de uma galeria de logos corporativos.

CONTEXTO DO BRANDCONNECT:
- É uma galeria de logos corporativos que conecta empresas e consumidores
- Empresas podem anunciar seus serviços através de planos pagos
- Usuários podem buscar empresas por categoria, localização, etc.
- Há 3 planos: Básico, Premium e Premium-Plus
- O site é gratuito para visualização, mas empresas pagam para anunciar
- Política de Privacidade: https://brandconnect-50647.web.app/pages/privacy-policy.html
- Site principal: https://brandconnect-50647.web.app
- Contato: jlbrandconnect@gmail.com

DETALHES DOS PLANOS:
- BÁSICO: Logo simples na galeria
- PREMIUM: Logo destacado + informações da empresa + links sociais
- PREMIUM-PLUS: Tudo do Premium + vídeo promocional + destaque máximo

INSTRUÇÕES:
1. Responda de forma amigável e útil
2. Use emojis ocasionalmente para tornar a conversa mais leve
3. Seja específico sobre como o BrandConnect funciona
4. Para perguntas sobre busca, sugira usar a barra de pesquisa do site
5. Para perguntas sobre anúncios, explique os benefícios e como entrar em contato
6. SEMPRE forneça links específicos quando mencionar páginas do site
7. Para política de privacidade, use o link: https://brandconnect-50647.web.app/pages/privacy-policy.html
8. Para perguntas sobre planos, explique as diferenças entre Básico, Premium e Premium-Plus
9. Para contato, use o email: jlbrandconnect@gmail.com

PERGUNTA DO USUÁRIO: "${userMessage}"

Responda de forma natural e conversacional, como um assistente real do BrandConnect, sempre fornecendo informações específicas e links quando apropriado.`;
  }
}

// Inicializa o chatbot quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new Chatbot();
});

// Torna a classe disponível globalmente
window.Chatbot = Chatbot; 