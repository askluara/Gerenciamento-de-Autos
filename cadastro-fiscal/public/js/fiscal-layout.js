document.addEventListener('DOMContentLoaded', () => {
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
        <aside class="sidebar" aria-label="Navegação principal">
            <div class="sidebar-header">
                <span>Sistema de Autos</span>
                <button class="sidebar-toggle" aria-label="Menu">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
            
            <nav class="sidebar-nav">
                <!-- Seção AUTOS DE INFRAÇÃO -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">Autos de Infração</div>
                    <ul class="sidebar-menu">
                        <li>
                            <a href="/home" ${currentPage === 'dashboard' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-house"></i></span> Dashboard
                            </a>
                        </li>
                        <li><a href="#"><span class="sidebar-icon"><i class="fa-regular fa-file-lines"></i></span> Cadastrar Auto</a></li>
                        <li><a href="#"><span class="sidebar-icon"><i class="fa-solid fa-magnifying-glass"></i></span> Pesquisar Autos</a></li>
                        <li><a href="#"><span class="sidebar-icon"><i class="fa-regular fa-pen-to-square"></i></span> Editar Auto</a></li>
                        <li><a href="#"><span class="sidebar-icon"><i class="fa-regular fa-trash-can"></i></span> Excluir Auto</a></li>
                    </ul>
                </div>

                <!-- Seção FISCAIS -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">Fiscais</div>
                    <ul class="sidebar-menu">
                        <li>
                            <a href="/cadastro-fiscal/Cadastro-fiscal.html" ${currentPage === 'cadastrar' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-user-plus"></i></span> Cadastrar Fiscal
                            </a>
                        </li>
                        <li>
                            <a href="/cadastro-fiscal/pesquisar-fiscal.html" ${currentPage === 'pesquisar' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-user-gear"></i></span> Pesquisar Fiscais
                            </a>
                        </li>
                        <li>
                            <a href="/cadastro-fiscal/editar-fiscal.html" ${currentPage === 'editar' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-user-pen"></i></span> Editar Fiscal
                            </a>
                        </li>
                        <li>
                            <a href="/cadastro-fiscal/inativar-fiscal.html" ${currentPage === 'inativar' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-user-xmark"></i></span> Inativar Fiscal
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- Seção INFRAÇÕES -->
                <div class="sidebar-section">
                    <div class="sidebar-section-title">Infrações</div>
                    <ul class="sidebar-menu">
                        <li>
                            <a href="/cadastro-infracao/cadastrar_infracao.html" ${currentPage === 'cadastrar-infracao' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-triangle-exclamation"></i></span> Cadastrar Infração
                            </a>
                        </li>
                        <li>
                            <a href="/cadastro-infracao/pesquisar_infracao.html" ${currentPage === 'pesquisar-infracao' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-solid fa-shield-halved"></i></span> Pesquisar Infrações
                            </a>
                        </li>
                        <li>
                            <a href="/cadastro-infracao/editar_excluir_infracao.html" ${currentPage === 'editar-infracao' ? 'class="active"' : ''}>
                                <span class="sidebar-icon"><i class="fa-regular fa-pen-to-square"></i></span> Editar / Excluir
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </aside>

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

    // Lógica do menu responsivo
    const sidebarToggle = shell.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

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
});