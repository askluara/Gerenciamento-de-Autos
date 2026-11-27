(() => {
    const formBusca = document.getElementById('form-buscar-auto');
    const form = document.getElementById('form-cadastrar-parecer');
    const resumo = document.getElementById('card-resumo-auto');
    let autosCadastro = [];

    function possuiParecer(autoId, pareceres) {
        return pareceres.some(item => String(item.id_auto) === String(autoId));
    }

    async function renderizarListaCadastro(lista) {
        const tbody = document.getElementById('lista-autos-cadastro');
        const pareceres = await fetch('/api/pareceres', { credentials: 'include' }).then(resposta => resposta.ok ? resposta.json() : []);
        const listaElegivel = (lista || []).filter(auto => !possuiParecer(auto.id_auto, pareceres));
        document.getElementById('cadastro-autos-contador').textContent = `${listaElegivel.length} ${listaElegivel.length === 1 ? 'auto encontrado' : 'autos encontrados'}.`;
        if (!listaElegivel.length) {
            tbody.innerHTML = '<tr><td class="parecer-empty" colspan="5">Nenhum auto disponível para cadastro de parecer.</td></tr>'; 
            return;
        }
        tbody.innerHTML = listaElegivel.map(auto => {
            const data = auto.data_auto ? new Date(auto.data_auto + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            const jaPossui = possuiParecer(auto.id_auto, pareceres);
            return `<tr data-auto-id="${auto.id_auto}" class="${jaPossui ? 'parecer-auto-ja-vinculado' : ''}" tabindex="0"><td class="parecer-table-code">${auto.numero_auto || auto.id_auto || '-'}</td><td>${auto.nome_contribuinte || '-'}</td><td>${auto.tipo_infracao || auto.descricao_infracao || '-'}</td><td>${jaPossui ? 'Com parecer' : (auto.status_processo || '-')}</td><td>${data}</td></tr>`;
        }).join('');
        tbody.querySelectorAll('tr[data-auto-id]').forEach(linha => {
            const abrir = () => {
                const auto = autosCadastro.find(item => String(item.id_auto) === linha.dataset.autoId);
                if (!auto) return;
                if (possuiParecer(auto.id_auto, pareceres)) {
                    if (window.abrirModal) window.abrirModal('Este auto já possui um parecer cadastrado.', { titulo: 'Parecer já cadastrado' });
                    resumo.hidden = true;
                    return;
                }
                document.getElementById('numero-auto').value = auto.numero_auto || auto.id_auto || '';
                document.getElementById('resumo-contribuinte').value = auto.nome_contribuinte || 'Não informado';
                document.getElementById('resumo-documento').value = auto.cpf || auto.cnpj || 'Não informado';
                document.getElementById('resumo-infracao').value = auto.descricao_infracao || auto.tipo_infracao || 'Não informada';
                resumo.hidden = false;
                form.dataset.autoId = auto.id_auto;
                document.getElementById('decisao').focus();
            };
            linha.addEventListener('click', abrir);
            linha.addEventListener('keydown', evento => { if (evento.key === 'Enter') abrir(); });
        });
    }

    async function carregarListaCadastro() {
        try {
            const resposta = await fetch('/api/autos', { credentials: 'include' });
            if (!resposta.ok) throw new Error('Não foi possível carregar os autos.');
            autosCadastro = await resposta.json();
            await renderizarListaCadastro(autosCadastro.slice(0, 100));
        } catch (error) {
            document.getElementById('lista-autos-cadastro').innerHTML = `<tr><td class="parecer-empty" colspan="5">${error.message}</td></tr>`;
        }
    }

    fetch('/api/verificar-sessao', { credentials: 'include' })
        .then(resposta => resposta.json())
        .then(sessao => {
            if (!['COORDENADOR', 'ADMINISTRADOR'].includes(sessao.usuario?.perfil)) {
                document.querySelector('main')?.remove();
                window.location.replace('/cadastro-parecer/pesquisar-pareceres.html');
            }
        }).catch(error => console.error('Não foi possível verificar a sessão:', error));

    formBusca?.addEventListener('submit', async event => {
        event.preventDefault();
        const numero = document.getElementById('numero-auto').value.trim();
        if (!numero) return;
        try {
            const resposta = await fetch(`/api/autos?numero=${encodeURIComponent(numero)}`, { credentials: 'include' });
            const autos = resposta.ok ? await resposta.json() : [];
            const auto = autos.find(item => String(item.numero_auto).toUpperCase() === numero.toUpperCase()) || autos[0];
            if (!auto) {
                if (window.abrirModal) await window.abrirModal('Nenhum auto foi encontrado com este número.', { titulo: 'Auto não encontrado' });
                return;
            }

            const pareceres = await fetch('/api/pareceres', { credentials: 'include' }).then(r => r.ok ? r.json() : []);
            if (pareceres.some(item => item.id_auto === auto.id_auto)) {
                if (window.abrirModal) await window.abrirModal('Este auto já possui um parecer cadastrado.', { titulo: 'Parecer já cadastrado' });
                resumo.hidden = true;
                return;
            }

            document.getElementById('resumo-contribuinte').value = auto.nome_contribuinte || 'Não informado';
            document.getElementById('resumo-documento').value = auto.cpf || auto.cnpj || 'Não informado';
            document.getElementById('resumo-infracao').value = auto.descricao_infracao || auto.tipo_infracao || 'Não informada';
            resumo.hidden = false;
            form.dataset.autoId = auto.id_auto;
            document.getElementById('decisao').focus();
        } catch (error) {
            console.error(error);
            if (window.abrirModal) await window.abrirModal('Não foi possível consultar o auto. Tente novamente.', { titulo: 'Erro na consulta' });
        }
    });

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.dataset.autoId) {
            if (window.abrirModal) await window.abrirModal('Busque um auto antes de cadastrar o parecer.', { titulo: 'Auto não localizado' });
            return;
        }
        const decisao = document.getElementById('decisao').value;
        const observacao = document.getElementById('fundamentacao').value.trim();
        if (!decisao || !observacao) return;

        try {
            const resposta = await fetch('/api/pareceres', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_auto: form.dataset.autoId, decisao, observacao })
            });
            const dados = await resposta.json();
            if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível cadastrar o parecer.');
            if (window.abrirModal) await window.abrirModal('Parecer cadastrado com sucesso.', { titulo: 'Ação concluída' });
            window.location.assign('/cadastro-parecer/pesquisar-pareceres.html');
        } catch (error) {
            if (window.abrirModal) await window.abrirModal(error.message, { titulo: 'Não foi possível gravar' });
        }
    });

    document.getElementById('cancelar-cadastro')?.addEventListener('click', () => {
        window.location.assign('/cadastro-parecer/pesquisar-pareceres.html');
    });

    void carregarListaCadastro();

    document.getElementById('numero-auto')?.addEventListener('input', event => {
        const termo = event.target.value.trim().toLowerCase();
        void renderizarListaCadastro((autosCadastro || []).filter(auto =>
            !termo || String(auto.numero_auto || auto.id_auto || '').toLowerCase().includes(termo)
        ).slice(0, 100));
    });
})();
