(() => {
    let dados = [];
    let autos = [];
    let perfil = '';

    function badge(status) {
        const classes = {Procedente:'badge-deferido', Improcedente:'badge-indeferido', Cancelado:'badge-cancelado', 'Aguardando Parecer':'parecer-badge-pendente'};
        return `<span class="${classes[status] || 'badge-cancelado'} parecer-badge">${status}</span>`;
    }

    function formatarData(data) {
        return data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
    }

    function render(lista) {
        const tbody = document.getElementById('tabela-pareceres');
        document.getElementById('parecer-contador').textContent = `${lista.length} registros`;
        if (!lista.length) {
            tbody.innerHTML = '<tr><td class="parecer-empty" colspan="6">Nenhum parecer encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map(item => {
            const id = item.parecer || item.id_parecer;
            const podeGerir = ['COORDENADOR', 'ADMINISTRADOR'].includes(perfil);
            let acoes = `<a class="fiscal-button" href="editar-parecer.html?parecer=${encodeURIComponent(id)}"><i class="fa-solid fa-eye"></i> Visualizar</a>`;
            if (podeGerir) {
                acoes = `<a class="fiscal-button" href="editar-parecer.html?parecer=${encodeURIComponent(id)}"><i class="fa-solid fa-pen"></i> Editar</a><a class="fiscal-button is-danger" href="cancelar-parecer.html?parecer=${encodeURIComponent(id)}"><i class="fa-solid fa-ban"></i> Cancelar</a>`;
            }
            return `<tr><td class="parecer-table-code">${item.numero_auto || item.id_auto || '-'}</td><td class="parecer-table-code">${id}</td><td class="parecer-contribuinte"><strong>${item.contribuinte || '-'}</strong><span>${item.documento || '-'}</span></td><td>${badge(item.decisao || item.status_banco)}</td><td>${formatarData(item.data)}</td><td><div class="parecer-actions">${acoes}</div></td></tr>`;
        }).join('');
    }

    function renderAutos(lista) {
        const tbody = document.getElementById('tabela-autos-pesquisa');
        document.getElementById('parecer-autos-contador').textContent = `${lista.length} ${lista.length === 1 ? 'auto encontrado' : 'autos encontrados'}.`;
        if (!lista.length) {
            tbody.innerHTML = '<tr><td class="parecer-empty" colspan="5">Nenhum auto encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map(auto => {
            const data = auto.data_auto ? new Date(auto.data_auto + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            return `<tr><td class="parecer-table-code">${auto.numero_auto || auto.id_auto || '-'}</td><td>${auto.nome_contribuinte || '-'}</td><td>${auto.tipo_infracao || auto.descricao_infracao || '-'}</td><td>${auto.status_processo || '-'}</td><td>${data}</td></tr>`;
        }).join('');
    }

    async function carregarSugestoesAutos() {
        try {
            const resposta = await fetch('/api/autos', { credentials: 'include' });
            if (!resposta.ok) return;
            const autos = await resposta.json();
            renderAutos(autos);
            const numeros = [...new Set((autos || [])
                .map(auto => String(auto.numero_auto || '').trim())
                .filter(Boolean))].sort((a, b) => b.localeCompare(a, 'pt-BR', { numeric: true }));

            document.getElementById('lista-autos').innerHTML = numeros
                .map(numero => `<option value="${numero.replaceAll('"', '&quot;')}"></option>`)
                .join('');
        } catch (error) {
            console.error('Não foi possível carregar sugestões de autos:', error);
        }
    }

    async function carregar() {
        const sessao = await fetch('/api/verificar-sessao', { credentials:'include' }).then(r => r.json());
        perfil = sessao.usuario?.perfil || '';
        const podeGerir = ['COORDENADOR', 'ADMINISTRADOR'].includes(perfil);

        const novoParecer = document.getElementById('novo-parecer');
        if (!podeGerir && novoParecer) novoParecer.remove();

        void carregarSugestoesAutos();

        const resposta = await fetch('/api/pareceres', { credentials:'include' });
        if (!resposta.ok) throw new Error('Não foi possível carregar os pareceres cadastrados.');
        dados = await resposta.json();
        render(dados);
    }

    document.getElementById('form-filtros-parecer')?.addEventListener('submit', event => {
        event.preventDefault();
        const auto = document.getElementById('filtro-auto').value.trim().toLowerCase();
        const documento = document.getElementById('filtro-documento').value.replace(/\D/g,'');
        const status = document.getElementById('filtro-status').value;
        render(dados.filter(item =>
            (!auto || String(item.numero_auto || item.id_auto || '').toLowerCase().includes(auto)) &&
            (!documento || String(item.documento || '').replace(/\D/g,'').includes(documento)) &&
            (!status || (item.decisao || item.status_banco) === status)
        ));
    });

    document.querySelector('#form-filtros-parecer button[type="reset"]')?.addEventListener('click', () => {
        setTimeout(() => {
            render(dados);
            renderAutos(autos);
        }, 0);
    });

    document.getElementById('filtro-auto')?.addEventListener('input', event => {
        const termo = event.target.value.trim().toLowerCase();
        renderAutos((autos || []).filter(auto =>
            !termo || String(auto.numero_auto || auto.id_auto || '').toLowerCase().includes(termo)
        ).slice(0, 100));
    });

    carregar().catch(error => {
        document.getElementById('tabela-pareceres').innerHTML = `<tr><td class="parecer-empty" colspan="6">${error.message}</td></tr>`;
    });
})();
