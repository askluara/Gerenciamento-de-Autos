document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validação de Sessão
    try {
        const resposta = await fetch('/api/verificar-sessao', { credentials: 'include' });
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        
        const dados = await resposta.json();
        if (!dados.logado) {
            window.location.href = '/';
        } else if (dados.usuario) {
            const login = String(dados.usuario.login || 'Usuário');
            const perfil = String(dados.usuario.perfil || 'Admin');
            
            const nomeEl = document.getElementById('nome-usuario');
            const cargoEl = document.getElementById('cargo-usuario');
            const avatarEl = document.getElementById('avatar-letra');

            if (nomeEl) nomeEl.textContent = login;
            if (cargoEl) cargoEl.textContent = perfil;
            if (avatarEl) avatarEl.textContent = login.charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('Erro na sessão:', error);
        window.location.href = '/';
    }

    // 2. Manipulação do Formulário de Cadastro de Infração
    const formInfracao = document.getElementById('form-infracao');
    if (formInfracao) {
        formInfracao.addEventListener('submit', async (e) => {
            e.preventDefault();

            const novaInfracao = {
                id_infracao: document.getElementById('id_infracao').value,
                tipo: document.getElementById('tipo').value,
                descricao: document.getElementById('descricao').value,
                artigo: document.getElementById('artigo').value,
                valor_base: document.getElementById('valor_base').value
            };

            try {
                const res = await fetch('/api/infracoes/cadastrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaInfracao),
                    credentials: 'include'
                });

                if (res.ok) {
                    abrirModal('Infração cadastrada com sucesso!');
                    formInfracao.reset();
                } else {
                    const errData = await res.json();
                    abrirModal('Erro ao cadastrar: ' + (errData.mensagem || 'Erro desconhecido'));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                abrirModal('Erro de conexão com o servidor.');
            }
        });
    }
});