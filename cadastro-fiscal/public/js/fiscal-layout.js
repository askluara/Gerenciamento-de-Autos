document.addEventListener('DOMContentLoaded', () => {
    const pageContent = document.querySelector('.main-container');
    if (!pageContent) return;

    const currentPage = document.body.dataset.fiscalPage;
    const icon = (name) => {
        const paths = {
            dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
            file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
            search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
            edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
            users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"/>',
            user: '<circle cx="10" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 14 0v2M19 8v6M22 11h-6"/>',
            disable: '<circle cx="10" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 11-5.7M18 16l5 5M23 16l-5 5"/>',
            alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
            shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
            menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
            close: '<path d="m18 6-12 12M6 6l12 12"/>',
            trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>'
        };
        return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.file}</svg>`;
    };

    const navLink = (label, href, iconName, page) => `
        <a class="fiscal-nav-link${page === currentPage ? ' is-active' : ''}" href="${href}"${page === currentPage ? ' aria-current="page"' : ''}>
            ${icon(iconName)}<span>${label}</span>
        </a>`;

    const shell = document.createElement('div');
    shell.className = 'fiscal-app-shell';
    shell.innerHTML = `
        <aside class="fiscal-sidebar" id="fiscal-sidebar" aria-label="Navegação principal">
            <div class="fiscal-brand">
                <span class="fiscal-brand-name">Sistema de Autos</span>
                <button class="fiscal-sidebar-toggle" type="button" aria-label="Recolher menu" aria-expanded="true">
                    ${icon('menu')}
                </button>
            </div>
            <nav class="fiscal-navigation">
                <div class="fiscal-nav-group">
                    <p class="fiscal-nav-heading">Autos de Infração</p>
                    ${navLink('Dashboard', '/home', 'dashboard', 'dashboard')}
                    ${navLink('Cadastrar Auto', '#', 'file')}
                    ${navLink('Pesquisar Autos', '#', 'search')}
                    ${navLink('Editar Auto', '#', 'edit')}
                    ${navLink('Excluir Auto', '#', 'trash')}
                </div>
                <div class="fiscal-nav-group">
                    <p class="fiscal-nav-heading">Fiscais</p>
                    ${navLink('Cadastrar Fiscal', '/cadastro-fiscal/Cadastro-fiscal.html', 'user', 'cadastrar')}
                    ${navLink('Pesquisar Fiscais', '/cadastro-fiscal/pesquisar-fiscal.html', 'users', 'pesquisar')}
                    ${navLink('Editar Fiscal', '/cadastro-fiscal/editar-fiscal.html', 'edit', 'editar')}
                    ${navLink('Inativar Fiscal', '/cadastro-fiscal/inativar-fiscal.html', 'disable', 'inativar')}
                </div>
                <div class="fiscal-nav-group">
                    <p class="fiscal-nav-heading">Infrações</p>
                    ${navLink('Cadastrar Infração', '#', 'alert')}
                    ${navLink('Pesquisar Infrações', '#', 'shield')}
                    ${navLink('Editar / Excluir', '#', 'edit')}
                </div>
            </nav>
        </aside>
        <div class="fiscal-main-column">
            <header class="fiscal-topbar">
                <button class="fiscal-mobile-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
                    ${icon('menu')}
                </button>
                <div class="fiscal-topbar-title">
                    <h1>Sistema de Gerenciamento de Autos de Infração</h1>
                    <p>Prefeitura Municipal · Gerência de Posturas</p>
                </div>
                <div class="fiscal-user">
                    <div><strong>Admin</strong><span>Administrador</span></div>
                    <span class="fiscal-user-avatar" aria-hidden="true">A</span>
                </div>
            </header>
            <main class="fiscal-page-area"></main>
        </div>
        <button class="fiscal-mobile-backdrop" type="button" aria-label="Fechar menu"></button>
    `;

    document.body.classList.add('fiscal-page-body');
    document.body.insertBefore(shell, pageContent);
    shell.querySelector('.fiscal-page-area').appendChild(pageContent);

    const sidebarToggle = shell.querySelector('.fiscal-sidebar-toggle');
    const mobileToggle = shell.querySelector('.fiscal-mobile-toggle');
    const backdrop = shell.querySelector('.fiscal-mobile-backdrop');
    shell.querySelectorAll('.fiscal-nav-link').forEach(link => {
        link.addEventListener('click', event => {
            const href = link.getAttribute('href');
            if (!href || href === '#' || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const destination = new URL(href, window.location.href);
            if (destination.origin !== window.location.origin || destination.href === window.location.href) return;

            event.preventDefault();
            link.classList.add('is-navigating');
            const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 80;
            window.setTimeout(() => window.location.assign(destination.href), delay);
        });
    });

    const setMobileMenu = (open) => {
        document.body.classList.toggle('fiscal-mobile-menu-open', open);
        mobileToggle.setAttribute('aria-expanded', String(open));
    };

    sidebarToggle.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 760px)').matches) {
            setMobileMenu(false);
        } else {
            document.body.classList.toggle('fiscal-sidebar-collapsed');
            sidebarToggle.setAttribute('aria-expanded', String(!document.body.classList.contains('fiscal-sidebar-collapsed')));
        }
    });
    mobileToggle.addEventListener('click', () => {
        setMobileMenu(!document.body.classList.contains('fiscal-mobile-menu-open'));
    });
    backdrop.addEventListener('click', () => setMobileMenu(false));
});
