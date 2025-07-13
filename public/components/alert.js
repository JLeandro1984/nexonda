class AlertComponent {
  constructor() {
    // Removido o filtro de páginas internas para permitir alerta em qualquer página
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
          <button id="cancel-alert-btn" class="alert-button hidden">Cancelar</button>
          <button id="confirm-alert-btn" class="alert-button hidden">Confirmar</button>
          <button id="close-alert-btn" class="alert-button">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.alertBox);
    this.alertBox.classList.add('hidden');
    this.init();
  }

  init() {
    this.alertTitle = document.getElementById('alert-title');
    this.alertMessage = document.getElementById('alert-message');
    this.alertIcon = document.getElementById('alert-icon');
    this.closeBtn = document.getElementById('close-alert-btn');
    this.confirmBtn = document.getElementById('confirm-alert-btn');
    this.cancelBtn = document.getElementById('cancel-alert-btn');

    this.closeBtn.addEventListener('click', () => this.hide());
    this.cancelBtn.addEventListener('click', () => {
      this.hide();
      if (this.onCancel) this.onCancel();
    });
    this.confirmBtn.addEventListener('click', () => {
      this.hide();
      if (this.onConfirm) this.onConfirm();
    });

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
    this.setType(type);
    this.alertTitle.textContent = title;
    this.alertMessage.textContent = message;
    this.showButtons({ close: true, confirm: false, cancel: false });
    this.showBox();
  }

  confirm(message, title = 'Confirmação', type = 'warning', onConfirm = null, onCancel = null) {
    this.setType(type);
    this.alertTitle.textContent = title;
    this.alertMessage.textContent = message;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.showButtons({ close: false, confirm: true, cancel: true });
    this.showBox();
  }

  setType(type) {
    const icons = {
      warning: '⚠️',
      error: '❌',
      success: '✅',
      info: 'ℹ️'
    };
    this.alertIcon.textContent = icons[type] || icons.warning;
    this.alertBox.classList.remove('alert-warning', 'alert-error', 'alert-success', 'alert-info');
    this.alertBox.classList.add(`alert-${type}`);
  }

  showButtons({ close = false, confirm = false, cancel = false }) {
    this.closeBtn.classList.toggle('hidden', !close);
    this.confirmBtn.classList.toggle('hidden', !confirm);
    this.cancelBtn.classList.toggle('hidden', !cancel);
  }

  showBox() {
    this.alertBox.classList.remove('hidden');
    setTimeout(() => this.alertBox.classList.add('active'), 10);
  }

  hide() {
    this.alertBox.classList.remove('active');
    setTimeout(() => {
      this.alertBox.classList.add('hidden');
      this.onConfirm = null;
      this.onCancel = null;
    }, 300);
  }
}

const alertInstance = new AlertComponent();

function showAlert(message, title = 'Atenção', type = 'warning') {
  alertInstance.show(message, title, type);
}

function showConfirm(message, title, type, onConfirm, onCancel) {
  alertInstance.confirm(message, title, type, onConfirm, onCancel);
}

if (typeof window !== 'undefined') {
  window.showAlert = showAlert;
  window.showConfirm = showConfirm;
  window.AlertComponent = AlertComponent;
}

export { showAlert, showConfirm, AlertComponent };
export default AlertComponent;
