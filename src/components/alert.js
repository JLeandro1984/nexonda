class AlertComponent {
  constructor() {
    this.alertBox = document.createElement('div');
    this.alertBox.id = 'custom-alert';
    this.alertBox.className = 'modal-overlay hidden';
    this.alertBox.innerHTML = `
      <div class="modal-box">
        <div class="alert-header">
          <span id="alert-icon">⚠️</span>
          <h2 id="alert-title">Atenção</h2>
        </div>
        <div class="alert-body">
          <p id="alert-message">Mensagem do alerta aqui</p>
        </div>
        <div class="alert-footer">
          <button id="close-alert-btn" class="alert-button">Fechar</button>
          <!-- Botão de confirmar removido do template -->
        </div>
      </div>
    `;
    
    document.body.appendChild(this.alertBox);
    this.init();
  }
  
  init() {
    // Elementos DOM
    this.alertTitle = document.getElementById('alert-title');
    this.alertMessage = document.getElementById('alert-message');
    this.alertIcon = document.getElementById('alert-icon');
    this.closeBtn = document.getElementById('close-alert-btn');
    
    // Event listeners
    this.closeBtn.addEventListener('click', () => this.hide());
    this.alertBox.addEventListener('click', (e) => {
      if (e.target === this.alertBox) this.hide();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.alertBox.classList.contains('hidden')) {
        this.hide();
      }
    });
  }
  
  show(message, title = 'Atenção', type = 'warning') {
    // Configura ícones para cada tipo
    const icons = {
      warning: '⚠️',
      error: '❌',
      success: '✅',
      info: 'ℹ️'
    };
    
    // Aplica configurações
    this.alertTitle.textContent = title;
    this.alertMessage.textContent = message;
    this.alertIcon.textContent = icons[type] || icons.warning;
    
    // Remove classes de tipo anteriores e adiciona a nova
    this.alertBox.classList.remove(
      'alert-warning', 'alert-error', 'alert-success', 'alert-info'
    );
    this.alertBox.classList.add(`alert-${type}`);
    
    // Mostra o alerta
    this.alertBox.classList.remove('hidden');
    setTimeout(() => {
      this.alertBox.classList.add('active');
    }, 10);
  }
  
  hide() {
    this.alertBox.classList.remove('active');
    setTimeout(() => {
      this.alertBox.classList.add('hidden');
    }, 300);
  }
}

// Cria uma instância global
const alertInstance = new AlertComponent();

// Função simplificada sem opções de confirmação
function showAlert(message, title = 'Atenção', type = 'warning') {
  alertInstance.show(message, title, type);
}

// Disponibiliza globalmente
if (typeof window !== 'undefined') {
  window.showAlert = showAlert;
  window.AlertComponent = AlertComponent;
}

// Exporta para módulos ES6
export { showAlert, AlertComponent };
export default AlertComponent;