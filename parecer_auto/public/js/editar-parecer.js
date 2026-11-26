(() => {
    const formBusca = document.getElementById('form-buscar-parecer');
    const form = document.getElementById('form-editar-parecer');
    const tbody = document.getElementById('lista-editar-parecer');
    const mensagem = document.getElementById('mensagem-editar-parecer');
    let pareceres = [];
    let perfil = '';

    function preencher(parecer) {
        if (!parecer) return;
        document.getElementById('edit-auto').value = parecer.numero_auto || parecer.id_auto || '';
        document.getElementById('edit-parecer').value = parecer.parecer || parecer.id_parecer;
        document.getElementById('edit-contribuinte').value = parecer.contribuinte || 'Não informado';
        document.getElementById('edit-documento').value = parecer.documento || 'Não informado';
        document.getElementById('edit-data').value = parecer.data ? new Date(parecer.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
        document.getElementById('edit-decisao').value = parecer.decisao === 'Improcedente' ? 'Improcedente' : 'Procedente';
        document.getElementById('edit-fundamentacao').value = parecer.observacao || '';
        form.dataset.parecerId = parecer.parecer || parecer.id_parecer;
        form.hidden = false;
    }

    function render(lista) {
        if (!lista.length) {
            tbody.innerHTML = '<tr><td class="parecer-empty" colspan="5">Parecer não existe ou não foi cadastrado no sistema.</td></tr>';
            mensagem.textContent = 'Nenhum parecer encontrado.';
            return;
        }
        mensagem.textContent = `${lista.length} parecer(es) cadastrado(s).`;
        tbody.innerHTML = lista.map(parecer => `<tr data-parecer="${parecer.parecer || parecer.id_parecer}" tabindex="0"><td class="parecer-table-code">${parecer.parecer || parecer.id_parecer}</td><td>${parecer.numero_auto || parecer.id_auto || '-'}</td><td>${parecer.contribuinte || '-'}</td><td>${parecer.decisao || parecer.status_banco || '-'}</td><td>${parecer.data ? new Date(parecer.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td></tr>`).join('');
        tbody.querySelectorAll('tr[data-parecer]').forEach(linha => {
            const abrir = () => preencher(pareceres.find(item => (item.parecer || item.id_parecer) === linha.dataset.parecer));
            linha.addEventListener('click', abrir);
            linha.addEventListener('keydown', evento => { if (evento.key === 'Enter') abrir(); });
        });
    }

    async function carregar() {
        const sessao = await fetch('/api/verificar-sessao', { credentials: 'include' }).then(r => r.json());
        perfil = sessao.usuario?.perfil || '';
        const resposta = await fetch('/api/pareceres', { credentials: 'include' });
        if (!resposta.ok) throw new Error('Não foi possível carregar os pareceres cadastrados.');
        pareceres = await resposta.json();
        render(pareceres);

        const parametro = new URLSearchParams(location.search);
        const id = parametro.get('parecer') || parametro.get('id');
        if (id) {
            const encontrado = pareceres.find(item => (item.parecer || item.id_parecer) === id);
            if (encontrado) preencher(encontrado);
            else { mensagem.textContent = 'Parecer não existe ou não foi cadastrado no sistema.'; render([]); }
        }

        if (!['COORDENADOR', 'ADMINISTRADOR'].includes(perfil)) {
            const heading = document.querySelector('.fiscal-page-heading h2');
            const description = document.querySelector('.fiscal-page-heading p');
            const headingIcon = document.querySelector('.fiscal-page-heading .fiscal-heading-icon');
            if (heading) heading.textContent = 'Pesquisar Parecer';
            if (description) description.textContent = 'Consulte os pareceres cadastrados e visualize os dados registrados.';
            if (headingIcon) headingIcon.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
            document.title = 'Pesquisar Parecer | SIGAI';

            form.querySelectorAll('input, select, textarea, button').forEach(campo => { campo.disabled = true; campo.readOnly = true; });
            form.querySelectorAll('.fiscal-form-actions').forEach(acoes => acoes.remove());
            document.getElementById('secao-dados-editaveis')?.remove();
            mensagem.textContent = 'Você pode visualizar os pareceres, mas não pode alterá-los.';
        }
    }

    formBusca?.addEventListener('submit', event => {
        event.preventDefault();
        const busca = document.getElementById('busca-parecer').value.trim().toLowerCase();
        if (!busca) return render(pareceres);
        const encontrados = pareceres.filter(item =>
            String(item.parecer || item.id_parecer).toLowerCase().includes(busca) ||
            String(item.numero_auto || item.id_auto || '').toLowerCase().includes(busca)
        );
        render(encontrados);
    });

    document.getElementById('limpar-busca-parecer')?.addEventListener('click', () => {
        document.getElementById('busca-parecer').value = '';
        render(pareceres);
    });

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!['COORDENADOR', 'ADMINISTRADOR'].includes(perfil)) return;
        const confirmacao = window.confirmarModal ? await window.confirmarModal('Confirmar alterações deste parecer?', {titulo:'Confirmar edição'}) : confirm('Confirmar alterações deste parecer?');
        if (!confirmacao) return;
        const id = form.dataset.parecerId;
        const resposta = await fetch(`/api/pareceres/${encodeURIComponent(id)}`, {
            method: 'PATCH', credentials: 'include', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ decisao: document.getElementById('edit-decisao').value, observacao: document.getElementById('edit-fundamentacao').value.trim() })
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            if (window.abrirModal) await window.abrirModal(dados.mensagem || 'Não foi possível gravar.', {titulo:'Erro'});
            return;
        }
        if (window.abrirModal) await window.abrirModal('Parecer atualizado com sucesso.', {titulo:'Ação concluída'});
        location.assign('pesquisar-pareceres.html');
    });

    document.getElementById('cancelar-edicao')?.addEventListener('click', () => location.assign('pesquisar-pareceres.html'));
    carregar().catch(error => { mensagem.textContent = error.message; });

    document.getElementById('busca-parecer')?.addEventListener('input', event => {
        const busca = event.target.value.trim().toLowerCase();
        if (!busca) return render(pareceres);
        render(pareceres.filter(item =>
            String(item.parecer || item.id_parecer).toLowerCase().includes(busca) ||
            String(item.numero_auto || item.id_auto || '').toLowerCase().includes(busca)
        ));
    });
})();
