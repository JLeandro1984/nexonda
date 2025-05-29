class UserMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const html = await fetch('../components/user-menu.html').then(r => r.text());
    const css = await fetch('../components/user-menu.css').then(r => r.text());

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
      ${html}
    `;

    this.init(); // só chama depois que o HTML foi inserido no shadowRoot
  }

  init() {
    this.userMenu = this.shadowRoot.querySelector('.user-menu');
    this.userIcon = this.shadowRoot.querySelector('#user-icon');
    this.userNameElement = this.shadowRoot.querySelector('.user-name-text');
    this.logoutBtn = this.shadowRoot.querySelector('.logout-btn');
    this.dropdown = this.shadowRoot.querySelector('.user-dropdown');

    if (!this.userIcon || !this.logoutBtn || !this.dropdown) {
      console.warn('Elementos não encontrados no Shadow DOM.');
      return;
    }

    this.userIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      this.dropdown.classList.remove('active');
    });

    this.logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });

    const name = localStorage.getItem('userName') || 'Usuário';
    this.userNameElement.textContent = name;
  }
}

customElements.define('user-menu', UserMenu);
