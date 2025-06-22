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
  return `Você é JL, o assistente virtual do BrandConnect 🤖 — uma plataforma moderna e amigável que conecta consumidores e empresas por meio de uma galeria interativa de logotipos. 

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

    🔗 LINKS IMPORTANTES:
    - 🌐 Site: [brandconnect-50647.web.app](https://brandconnect-50647.web.app)
    - 📄 Política de Privacidade: [Clique aqui](https://brandconnect-50647.web.app/pages/privacy-policy.html)
    - 📧 Contato por e-mail: jlbrandconnect@gmail.com
    - 💬 WhatsApp: (15) 99625-7159
    - 📝 Formulário de orçamento disponível no site (nome, e-mail, mensagem + botão enviar)
    - 📱 Ícone do WhatsApp fica no canto direito da tela, acima do chat

    🧠 INSTRUÇÕES PARA SUA RESPOSTA:
    1. Sempre responda com empatia, clareza e objetividade.
    2. Utilize frases como “Posso te ajudar com isso!” ou “Boa escolha!” para aproximar o usuário.
    3. Adapte sua resposta se o usuário parecer ser:
      - Visitante 🧍 (procurando empresas ou informações)
      - Anunciante 💼 (interessado em planos)
      - Empresa parceira 🤝 (desejando visibilidade ou suporte)
    4. Sugira sempre o que o usuário pode fazer no próximo passo (ex: “Use a busca 🔍 no topo da página”, “Clique aqui para ver os planos”, etc).
    5. Use links diretos sempre que mencionar páginas do site.
    6. Dê dicas úteis e sugira recursos como filtros por categoria ou localização inteligente.
    7. Evite repetições ou termos técnicos. Fale como gente de verdade.
    8. Para o formulário de orçamento, não envie links diretamente. Oriente o cliente a rolar até o final da página para encontrá-lo ou clicar na opção "Contato" no menu do topo do site.
    
    
    📩 MENSAGEM DO USUÁRIO:
    "${userMessage}"

    Agora responda como JL, o assistente virtual do BrandConnect. Seja gentil, útil e direto ao ponto. Apresente sugestões práticas, links úteis e, quando possível, surpreenda com valor agregado.`;
  }

}

// Inicializa o chatbot quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new Chatbot();
});

// Torna a classe disponível globalmente
window.Chatbot = Chatbot; 