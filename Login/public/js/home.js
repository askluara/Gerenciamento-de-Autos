// Antes de carregar, lê o conteúdo inserido, valida a sessão e atualiza a interface
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resposta = await fetch('/api/verificar-sessao', {
            credentials: 'include' // ISTO É ESSENCIAL PARA A VERIFICAÇÃO DA SESSÃO
        });

        // Responsável por "pegar" algum erro http
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        // Espera a resposta da API
        const dados = await resposta.json();

        if (!dados.logado) {
            window.location.href = '/';
        } else {
            // Sessão válida - Atualiza o cabeçalho com os dados reais do banco
            if (dados.usuario) {
                const login = dados.usuario.login || 'Usuário';
                const perfil = dados.usuario.perfil || 'Admin';
                
                const nameElement = document.querySelector('.header-right .name');
                const roleElement = document.querySelector('.header-right .role');
                const avatarElement = document.querySelector('.header-right .user-avatar');

                if (nameElement) nameElement.textContent = login;
                if (roleElement) roleElement.textContent = perfil;
                if (avatarElement) avatarElement.textContent = login.charAt(0).toUpperCase();
            }
        }
    } catch (error) {
        console.error(error.message);
        window.location.href = '/';
    }

    // Carrega os dados do dashboard
    carregarEstatisticas();
    carregarAutosRecentes();
});

// Função para tela de carregar estatísticas 
async function carregarEstatisticas() {
    try {
        const resposta = await fetch('/api/dashboard/estatisticas');
        const dados = await resposta.json();

        document.getElementById('cardTotalAutos').textContent = dados.totalAutos || 0;
        document.getElementById('cardDefesasPendentes').textContent = dados.defesasPendentes || 0;
        document.getElementById('cardPareceres').textContent = dados.pareceresAnalise || 0;
        document.getElementById('cardMultas').textContent = dados.multasEmitidas || 0;
    } catch (erro) {
        console.error('Erro ao carregar estatísticas:', erro);
    }
}

// Criação de função para tabela com dados recentes dos autos de infração
async function carregarAutosRecentes() {
    try {
        const resposta = await fetch('/api/dashboard/recentes');
        const autos = await resposta.json();

        const tbody = document.getElementById('tabelaAutosBody');
        tbody.innerHTML = '';

        if (!autos || autos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum auto cadastrado.</td></tr>';
            return;
        }

        autos.forEach(auto => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td><a href="#">${auto.protocolo}</a></td>
        <td>${auto.contribuinte}</td>
        <td>${auto.cpf_cnpj}</td>
        <td>${new Date(auto.data).toLocaleDateString('pt-BR')}</td>
        <td>${auto.tipo_infracao}</td>
        <td><span class="badge badge-${auto.status.toLowerCase().replace(/\s+/g, '-')}">${auto.status}</span></td>
      `;
            tbody.appendChild(tr);
        });
    } catch (erro) {
        console.error('Erro ao carregar tabela:', erro);
    }
}

// Funções para o botão de logout
// Confirmar o logout
document.getElementById('botaoLogout').addEventListener('click', async () => {
    const confirmar = await confirmarModal('Deseja realmente sair?', { tipo: 'danger' });

    if (confirmar) {
        await fetch('/api/logout', {
            credentials: 'include'
        });
        window.location.href = '/';
    }
});
