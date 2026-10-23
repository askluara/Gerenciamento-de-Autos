// Única fonte de marcação e interação da navegação lateral do SIGAI.
(function () {
    const grupos = [
        ['Autos de Infração', [
            ['/home', 'Dashboard', 'fa-house', 'dashboard'],
            ['#', 'Cadastrar Auto', 'fa-regular fa-file-lines'],
            ['#', 'Pesquisar Autos', 'fa-magnifying-glass'],
            ['#', 'Editar Auto', 'fa-regular fa-pen-to-square'],
            ['#', 'Excluir Auto', 'fa-regular fa-trash-can']
        ]],
        ['Fiscais', [
            ['/cadastro-fiscal/Cadastro-fiscal.html', 'Cadastrar Fiscal', 'fa-user-plus', 'cadastrar'],
            ['/cadastro-fiscal/pesquisar-fiscal.html', 'Pesquisar Fiscais', 'fa-user-gear', 'pesquisar'],
            ['/cadastro-fiscal/editar-fiscal.html', 'Editar Fiscal', 'fa-user-pen', 'editar'],
            ['/cadastro-fiscal/inativar-fiscal.html', 'Inativar Fiscal', 'fa-user-xmark', 'inativar']
        ]],
        ['Infrações', [
            ['/cadastro-infracao/cadastrar_infracao.html', 'Cadastrar Infração', 'fa-triangle-exclamation', 'cadastrar-infracao'],
            ['/cadastro-infracao/pesquisar_infracao.html', 'Pesquisar Infrações', 'fa-shield-halved', 'pesquisar-infracao'],
            ['/cadastro-infracao/editar_excluir_infracao.html', 'Editar / Excluir', 'fa-regular fa-pen-to-square', 'editar-infracao']
        ]]
    ];

    function mount(target, page) {
        if (!target) return;
        const aside = document.createElement('aside');
        aside.className = 'sidebar';
        aside.setAttribute('aria-label', 'Navegação principal');
        aside.innerHTML = `<div class="sidebar-header"><span>Sistema de Autos</span><button class="sidebar-toggle" type="button" aria-label="Abrir menu"><i class="fa-solid fa-bars"></i></button></div><nav class="sidebar-nav">${grupos.map(([titulo, links]) => `<div class="sidebar-section"><div class="sidebar-section-title">${titulo}</div><ul class="sidebar-menu">${links.map(([url, nome, icone, chave]) => `<li><a href="${url}" ${page === chave ? 'class="active" aria-current="page"' : ''}><span class="sidebar-icon"><i class="${icone.includes(' ') ? icone : `fa-solid ${icone}`}" aria-hidden="true"></i></span>${nome}</a></li>`).join('')}</ul></div>`).join('')}</nav>`;
        const toggle = aside.querySelector('.sidebar-toggle');
        toggle.addEventListener('click', () => aside.classList.toggle('active'));
        target.prepend(aside);
        const launcher = document.createElement('button');
        launcher.className = 'sidebar-launcher';
        launcher.type = 'button';
        launcher.setAttribute('aria-label', 'Abrir navegação');
        launcher.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        launcher.addEventListener('click', () => aside.classList.add('active'));
        document.body.appendChild(launcher);
        return aside;
    }

    window.SIGAISidebar = { mount };
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.dataset.fiscalPage) return; // fiscal-layout monta o mesmo componente no shell.
        const existing = document.querySelector('.sidebar');
        const target = document.querySelector('.container-main') || document.body;
        const page = document.body.dataset.currentPage || (location.pathname === '/home' ? 'dashboard' : '');
        if (existing) existing.remove();
        mount(target, page);
    });
})();
