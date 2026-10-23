(function () {
    const CACHE_KEY = 'sigai-sidebar-permissions';
    const grupos = [
        ['Autos de Infração', null, [
            ['/home', 'Dashboard', 'fa-house', 'dashboard']
        ]],
        ['Fiscais', 'fiscais', [
            ['/cadastro-fiscal/Cadastro-fiscal.html', 'Cadastrar Fiscal', 'fa-user-plus', 'cadastrar'],
            ['/cadastro-fiscal/pesquisar-fiscal.html', 'Pesquisar Fiscais', 'fa-user-gear', 'pesquisar'],
            ['/cadastro-fiscal/editar-fiscal.html', 'Editar/Inativar', 'fa-user-pen', 'editar']
        ]],
        ['Infrações', 'infracoes', [
            ['/cadastro-infracao/cadastrar_infracao.html', 'Cadastrar Infração', 'fa-triangle-exclamation', 'cadastrar-infracao'],
            ['/cadastro-infracao/pesquisar_infracao.html', 'Pesquisar Infrações', 'fa-shield-halved', 'pesquisar-infracao'],
            ['/cadastro-infracao/editar_excluir_infracao.html', 'Editar / Excluir', 'fa-regular fa-pen-to-square', 'editar-infracao']
        ]]
    ];

    function lerPermissoesEmCache() {
        try {
            const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
            const permissoes = cache?.permissoes;
            if (typeof permissoes?.fiscais === 'boolean' && typeof permissoes?.infracoes === 'boolean') {
                return permissoes;
            }
        } catch (error) {
            try { sessionStorage.removeItem(CACHE_KEY); } catch {}
        }
        return { fiscais: false, infracoes: false };
    }

    function renderizarMenu(aside, page, permissoes) {
        const gruposPermitidos = grupos.filter(([, permissao]) => !permissao || permissoes[permissao]);
        aside.querySelector('.sidebar-nav').innerHTML = gruposPermitidos.map(([titulo, , links]) =>
            `<div class="sidebar-section"><div class="sidebar-section-title">${titulo}</div><ul class="sidebar-menu">${links.map(([url, nome, icone, chave]) =>
                `<li><a href="${url}" ${page === chave ? 'class="active" aria-current="page"' : ''}><span class="sidebar-icon"><i class="${icone.includes(' ') ? icone : `fa-solid ${icone}`}" aria-hidden="true"></i></span>${nome}</a></li>`
            ).join('')}</ul></div>`
        ).join('');
    }

    function mount(target, page) {
        if (!target) return;

        const aside = document.createElement('aside');
        aside.className = 'sidebar';
        aside.setAttribute('aria-label', 'Navegação principal');
        aside.innerHTML = '<div class="sidebar-header"><span>Sistema de Autos</span><button class="sidebar-toggle" type="button" aria-label="Abrir menu" aria-expanded="false"><i class="fa-solid fa-bars" aria-hidden="true"></i></button></div><nav class="sidebar-nav"></nav>';

        let permissoesAtuais = lerPermissoesEmCache();
        renderizarMenu(aside, page, permissoesAtuais);
        target.prepend(aside);

        const toggle = aside.querySelector('.sidebar-toggle');
        toggle.addEventListener('click', () => {
            const aberto = aside.classList.toggle('active');
            toggle.setAttribute('aria-expanded', String(aberto));
        });

        const launcher = document.createElement('button');
        launcher.className = 'sidebar-launcher';
        launcher.type = 'button';
        launcher.setAttribute('aria-label', 'Abrir navegação');
        launcher.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
        launcher.addEventListener('click', () => {
            aside.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
        });
        document.body.appendChild(launcher);

        fetch('/api/verificar-sessao', { credentials: 'include' })
            .then(resposta => {
                if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
                return resposta.json();
            })
            .then(sessao => {
                if (!sessao.logado) {
                    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
                    return;
                }
                const permissoes = sessao.permissoes || { fiscais: false, infracoes: false };
                try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ permissoes })); } catch {}
                if (permissoes.fiscais !== permissoesAtuais.fiscais || permissoes.infracoes !== permissoesAtuais.infracoes) {
                    permissoesAtuais = permissoes;
                    renderizarMenu(aside, page, permissoesAtuais);
                }
            })
            .catch(error => console.error('Não foi possível atualizar as permissões do menu:', error));

        return aside;
    }

    window.SIGAISidebar = { mount };

    if (!document.body.dataset.fiscalPage) {
        const target = document.querySelector('.container-main') || document.body;
        const page = document.body.dataset.currentPage || (location.pathname === '/home' ? 'dashboard' : '');
        const existing = document.querySelector('.sidebar');
        if (existing) existing.remove();
        mount(target, page);
    }
})();
