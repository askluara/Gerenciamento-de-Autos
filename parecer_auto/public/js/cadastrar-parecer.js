(() => {
    const formBusca = document.getElementById('form-buscar-auto');
    const form = document.getElementById('form-cadastrar-parecer');
    const resumo = document.getElementById('card-resumo-auto');

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
})();
