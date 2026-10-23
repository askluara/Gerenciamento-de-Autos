(() => {
    const pageContent = document.querySelector('.main-container');
    if (!pageContent) return;

    // 1. Garante o carregamento do home.css (para a sidebar azul escura)
    if (!document.querySelector('link[href="/css/home.css"]')) {
        const homeCss = document.createElement('link');
        homeCss.rel = 'stylesheet';
        homeCss.href = '/css/home.css';
        document.head.prepend(homeCss);
    }

    // 2. Garante o carregamento do Cadastro-fiscal.css (para os formulários, ícones e cabeçalho)
    if (!document.querySelector('link[href="/cadastro-fiscal/css/Cadastro-fiscal.css"]')) {
        const fiscalCss = document.createElement('link');
        fiscalCss.rel = 'stylesheet';
        fiscalCss.href = '/cadastro-fiscal/css/Cadastro-fiscal.css';
        document.head.appendChild(fiscalCss);
    }

    // 3. Garante o carregamento do FontAwesome (para os ícones do menu lateral)
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faCss = document.createElement('link');
        faCss.rel = 'stylesheet';
        faCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faCss);
    }

    const currentPage = document.body.dataset.fiscalPage;

    // Estrutura completa usando o menu lateral unificado e o cabeçalho padronizado
    const shell = document.createElement('div');
    shell.className = 'container-main';
    shell.innerHTML = `

        <div class="main-content">
            <header class="top-header">
                <div class="header-titles">
                    <h1>Sistema de Gerenciamento de Autos de Infração</h1>
                    <p>Prefeitura Municipal • Gerência de Posturas</p>
                </div>
                <div class="user-profile">
                    <div class="user-info">
                        <strong id="fiscal-nome">Carregando...</strong>
                        <span id="fiscal-perfil">Carregando...</span>
                    </div>
                    <div class="avatar" id="fiscal-letra">-</div>
                </div>
            </header>
            
            <div class="page-content" id="fiscal-page-container"></div>
        </div>
    `;

    document.body.classList.add('fiscal-page-body');
    document.body.insertBefore(shell, pageContent);
    document.getElementById('fiscal-page-container').appendChild(pageContent);
    if (window.SIGAISidebar) window.SIGAISidebar.mount(shell, currentPage);
    // Busca os dados da sessão e preenche o cabeçalho
    fetch('/api/verificar-sessao')
        .then(res => res.json())
        .then(data => {
            if (data.logado && data.usuario) {
                const login = String(data.usuario.login || 'Usuário');
                const perfil = String(data.usuario.perfil || 'Admin');
                
                document.getElementById('fiscal-nome').textContent = login;
                document.getElementById('fiscal-perfil').textContent = perfil;
                document.getElementById('fiscal-letra').textContent = login.charAt(0).toUpperCase();
            }
        })
        .catch(err => console.error("Erro ao carregar sessão:", err));
})();
