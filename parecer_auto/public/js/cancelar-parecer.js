(() => {
    const formBusca = document.getElementById('form-buscar-cancelamento');
    const painel = document.getElementById('painel-cancelamento');
    const formCancelamento = document.getElementById('form-cancelar-parecer');
    const tbody = document.getElementById('lista-cancelar-parecer');
    const mensagem = document.getElementById('mensagem-cancelar-parecer');
    let pareceres = [];
    let perfil = '';

    function preencher(parecer) {
        if (!parecer) return;
        document.getElementById('cancel-parecer').value = parecer.parecer || parecer.id_parecer;
        document.getElementById('cancel-auto').value = parecer.numero_auto || parecer.id_auto || '';
        document.getElementById('cancel-contribuinte').value = parecer.contribuinte || 'Não informado';
        document.getElementById('cancel-decisao').value = parecer.decisao || parecer.status_banco || '-';
        formCancelamento.dataset.parecerId = parecer.parecer || parecer.id_parecer;
        painel.hidden = false;
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
            linha.addEventListener('keydown', event => { if (event.key === 'Enter') abrir(); });
        });
    }

    async function carregar() {
        const sessao = await fetch('/api/verificar-sessao', { credentials: 'include' }).then(r => r.json());
        perfil = sessao.usuario?.perfil || '';
        const resposta = await fetch('/api/pareceres', { credentials: 'include' });
        if (!resposta.ok) throw new Error('Não foi possível carregar os pareceres cadastrados.');
        pareceres = await resposta.json();
        render(pareceres);
        const id = new URLSearchParams(location.search).get('parecer');
        if (id) {
            const encontrado = pareceres.find(item => (item.parecer || item.id_parecer) === id);
            if (encontrado) preencher(encontrado);
            else { mensagem.textContent = 'Parecer não existe ou não foi cadastrado no sistema.'; render([]); }
        }
    }

    formBusca?.addEventListener('submit', event => {
        event.preventDefault();
        const busca = document.getElementById('busca-cancelamento').value.trim().toLowerCase();
        if (!busca) return render(pareceres);
        render(pareceres.filter(item =>
            String(item.parecer || item.id_parecer).toLowerCase().includes(busca) ||
            String(item.numero_auto || item.id_auto || '').toLowerCase().includes(busca)
        ));
    });

    document.getElementById('limpar-busca-cancelamento')?.addEventListener('click', () => {
        document.getElementById('busca-cancelamento').value = '';
        render(pareceres);
    });

    formCancelamento?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!['COORDENADOR', 'ADMINISTRADOR'].includes(perfil)) {
            if (window.abrirModal) await window.abrirModal('Somente Administrador ou Coordenador podem cancelar pareceres.', {titulo:'Permissão insuficiente'});
            return;
        }
        const justificativa = document.getElementById('justificativa-cancelamento').value.trim();
        if (!justificativa) return;
        const confirmado = window.confirmarModal ? await window.confirmarModal('O parecer será cancelado e o auto retornará para Aguardando Parecer.', {titulo:'Confirmar cancelamento', tipo:'danger'}) : confirm('Confirmar cancelamento?');
        if (!confirmado) return;
        const id = formCancelamento.dataset.parecerId;
        const resposta = await fetch(`/api/pareceres/${encodeURIComponent(id)}/cancelar`, {
            method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ justificativa })
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            if (window.abrirModal) await window.abrirModal(dados.mensagem || 'Não foi possível cancelar.', {titulo:'Erro'});
            return;
        }
        if (window.abrirModal) await window.abrirModal(dados.mensagem, {titulo:'Parecer cancelado'});
        location.assign('pesquisar-pareceres.html');
    });

    document.getElementById('voltar-cancelamento')?.addEventListener('click', () => location.assign('pesquisar-pareceres.html'));
    carregar().catch(error => { mensagem.textContent = error.message; });

    document.getElementById('busca-cancelamento')?.addEventListener('input', event => {
        const busca = event.target.value.trim().toLowerCase();
        if (!busca) return render(pareceres);
        render(pareceres.filter(item =>
            String(item.parecer || item.id_parecer).toLowerCase().includes(busca) ||
            String(item.numero_auto || item.id_auto || '').toLowerCase().includes(busca)
        ));
    });
})();
