// Advertising AI Assistant - Integração com Gemini para melhorias de propaganda
class AdvertisingAI {
  constructor() {
    this.isLoading = false;
    this.init();
  }

  init() {
    console.log('Advertising AI inicializado');
    this.bindEvents();
  }

  bindEvents() {
    // Event listeners serão adicionados quando o modal for carregado
    document.addEventListener('DOMContentLoaded', () => {
      this.setupModalEvents();
    });
  }

  setupModalEvents() {
    // Aguarda o modal ser carregado dinamicamente OU o formulário direto estar disponível
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector('.modal-advertising-component') || 
                  node.querySelector('#ad-title') || 
                  document.getElementById('ad-title')) {
                this.attachModalEvents();
                observer.disconnect();
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Também verifica se o formulário já existe no DOM
    if (document.getElementById('ad-title') || document.querySelector('.modal-advertising-component')) {
      this.attachModalEvents();
    }
  }

  attachModalEvents() {
    // Adiciona event listeners aos botões de IA (modal e formulário direto)
    const titleBtn = document.getElementById('ai-title-btn') || document.getElementById('ai-title-btn-direct');
    const descriptionBtn = document.getElementById('ai-description-btn') || document.getElementById('ai-description-btn-direct');

    if (titleBtn) {
      titleBtn.addEventListener('click', () => this.suggestTitleImprovements());
    }

    if (descriptionBtn) {
      descriptionBtn.addEventListener('click', () => this.suggestDescriptionImprovements());
    }

    console.log('Event listeners da IA anexados aos formulários');
  }

  async suggestTitleImprovements() {
    // Tenta encontrar o campo de título em ambos os formulários
    const titleInput = document.getElementById('ad-title-modal') || document.getElementById('ad-title');
    const currentTitle = titleInput?.value.trim();

    if (!currentTitle) {
      this.showError('Por favor, digite um título primeiro para receber sugestões.');
      return;
    }

    await this.getAISuggestions('title', currentTitle);
  }

  async suggestDescriptionImprovements() {
    // Tenta encontrar o campo de descrição em ambos os formulários
    const descriptionInput = document.getElementById('ad-description-modal') || document.getElementById('ad-description');
    const currentDescription = descriptionInput?.value.trim();

    if (!currentDescription) {
      this.showError('Por favor, digite uma descrição primeiro para receber sugestões.');
      return;
    }

    await this.getAISuggestions('description', currentDescription);
  }

  async getAISuggestions(type, currentText) {
    if (this.isLoading) return;

    this.setLoadingState(true);
    this.showSuggestionsContainer();

    try {
      const prompt = this.buildPrompt(type, currentText);
      const response = await this.callGemini(prompt);
      
      if (response) {
        this.displaySuggestions(type, response, currentText);
      } else {
        this.showError('Não foi possível gerar sugestões no momento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao obter sugestões da IA:', error);
      this.showError('Erro ao conectar com a IA. Verifique sua conexão e tente novamente.');
    } finally {
      this.setLoadingState(false);
    }
  }

  buildPrompt(type, currentText) {
    const basePrompt = `💬 **Atue como um especialista em marketing digital com foco em anúncios de alto impacto. Receba o seguinte ${type === 'title' ? 'título' : 'descrição'} de uma propaganda e sugira melhorias para torná-lo mais atrativo, claro e persuasivo.**

**Seu objetivo é:**

1. **Otimizar o ${type === 'title' ? 'título' : 'descrição'} para chamar atenção imediatamente (sem clickbait exagerado).**
2. **Melhorar o ${type === 'title' ? 'título' : 'descrição'} para engajar o público e incentivar a ação, mantendo a essência da mensagem original.**
3. **Manter um tom profissional, confiável e coerente com empresas sérias.**

**Entrada do cliente:**
🏷️ **${type === 'title' ? 'Título' : 'Descrição'}:** \`${currentText}\`

**Responda APENAS com este formato exato:**
✅ **Novo ${type === 'title' ? 'Título' : 'Descrição'} sugerido:**
📝 **${type === 'title' ? 'Descrição' : 'Título'} melhorado:**
💡 **Dica de melhoria ou palavra-chave relevante (opcional):**

**IMPORTANTE:** Responda de forma direta e objetiva, sem explicações adicionais.`;

    return basePrompt;
  }

  async callGemini(prompt) {
    try {
      const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/askGemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error('Erro na chamada do Gemini:', error);
      throw error;
    }
  }

  displaySuggestions(type, aiResponse, originalText) {
    const container = document.getElementById('ai-suggestions-content');
    
    // Parse a resposta da IA
    const suggestions = this.parseAIResponse(aiResponse);
    
    if (!suggestions) {
      this.showError('Formato de resposta inesperado da IA. Tente novamente.');
      return;
    }

    const html = `
      <div class="suggestion-item">
        <div class="suggestion-label">
          <i class="fas fa-lightbulb"></i>
          ${type === 'title' ? 'Sugestão de Título' : 'Sugestão de Descrição'}
        </div>
        <div class="suggestion-text">
          <strong>Original:</strong> "${originalText}"
        </div>
        <div class="suggestion-text">
          <strong>Melhorado:</strong> "${suggestions.improved}"
        </div>
        ${suggestions.tip ? `
          <div class="suggestion-tip">
            <i class="fas fa-lightbulb"></i>
            ${suggestions.tip}
          </div>
        ` : ''}
        <div class="suggestion-actions">
          <button class="apply-suggestion-btn" onclick="advertisingAI.applySuggestion('${type}', '${this.escapeHtml(suggestions.improved)}')">
            <i class="fas fa-check"></i>
            Aplicar Sugestão
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  parseAIResponse(response) {
    try {
      // Extrai o texto melhorado
      const improvedMatch = response.match(/✅\s*\*\*Novo\s+(?:Título|Descrição)\s+sugerido:\*\*\s*(.+?)(?=\n|$)/i) ||
                           response.match(/📝\s*\*\*(?:Descrição|Título)\s+melhorado:\*\*\s*(.+?)(?=\n|$)/i);
      
      // Extrai a dica
      const tipMatch = response.match(/💡\s*\*\*Dica[^*]*\*\*[^:]*:\s*(.+?)(?=\n|$)/i);

      if (improvedMatch) {
        return {
          improved: improvedMatch[1].trim().replace(/^["']|["']$/g, ''),
          tip: tipMatch ? tipMatch[1].trim() : null
        };
      }

      // Fallback: tenta extrair qualquer texto entre aspas
      const fallbackMatch = response.match(/"([^"]+)"/);
      if (fallbackMatch) {
        return {
          improved: fallbackMatch[1],
          tip: null
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao fazer parse da resposta:', error);
      return null;
    }
  }

  applySuggestion(type, suggestion) {
    const adForm = document.getElementById('ad-form-modal') || document.getElementById('ad-form');
    if (adForm) {
      adForm.setAttribute('data-ai-applying', 'true');
      console.log('[DEBUG] IA aplicando sugestão, submit bloqueado');
    }
    
    if (type === 'title') {
      const titleInput = document.getElementById('ad-title-modal') || document.getElementById('ad-title');
      if (titleInput) {
        titleInput.value = suggestion;
        titleInput.focus();
      }
    } else if (type === 'description') {
      const descriptionInput = document.getElementById('ad-description-modal') || document.getElementById('ad-description');
      if (descriptionInput) {
        descriptionInput.value = suggestion;
        descriptionInput.focus();
      }
    }
    
    // Remover o atributo após um tempo para permitir submit manual
    setTimeout(() => {
      if (adForm) {
        adForm.removeAttribute('data-ai-applying');
        console.log('[DEBUG] IA terminou de aplicar sugestão, submit liberado');
      }
    }, 500);
    
    this.closeSuggestions();
    this.showSuccess('Sugestão aplicada com sucesso!');
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    const titleBtn = document.getElementById('ai-title-btn') || document.getElementById('ai-title-btn-direct');
    const descriptionBtn = document.getElementById('ai-description-btn') || document.getElementById('ai-description-btn-direct');

    if (titleBtn) {
      titleBtn.classList.toggle('loading', loading);
      titleBtn.disabled = loading;
    }

    if (descriptionBtn) {
      descriptionBtn.classList.toggle('loading', loading);
      descriptionBtn.disabled = loading;
    }
  }

  showSuggestionsContainer() {
    const container = document.getElementById('ai-suggestions-container');
    if (container) {
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  closeSuggestions() {
    const container = document.getElementById('ai-suggestions-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  showError(message) {
    // Usa o sistema de alertas existente ou cria um toast
    if (window.showAlert) {
      window.showAlert(message, 'error');
    } else {
      alert(message);
    }
  }

  showSuccess(message) {
    if (window.showAlert) {
      window.showAlert(message, 'success');
    } else {
      alert(message);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Funções globais para uso no HTML
window.suggestTitleImprovements = function() {
  if (window.advertisingAI) {
    window.advertisingAI.suggestTitleImprovements();
  }
};

window.suggestDescriptionImprovements = function() {
  if (window.advertisingAI) {
    window.advertisingAI.suggestDescriptionImprovements();
  }
};

window.closeAISuggestions = function() {
  if (window.advertisingAI) {
    window.advertisingAI.closeSuggestions();
  }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.advertisingAI = new AdvertisingAI();
}); 