// =========================================================
// VALIDAÇÃO DE SESSÃO E ATUALIZAÇÃO DO PERFIL NO CABEÇALHO
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resposta = await fetch('/api/verificar-sessao', { credentials: 'include' });
        
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        
        const dados = await resposta.json();
        
        if (!dados.logado) {
            window.location.href = '/'; // Expulsa para o login se não tiver logado
        } else {
            // Atualiza o nome, cargo e letra do avatar no HTML
            const matricula = dados.usuario?.login || "Usuário";
            const perfil = dados.usuario?.perfil || "Cargo";
            
            const elNome = document.getElementById('nome-usuario');
            const elAvatar = document.getElementById('avatar-letra');
            const elCargo = document.getElementById('cargo-usuario');

            if (elNome) elNome.innerText = matricula;
            if (elAvatar) elAvatar.innerText = perfil.charAt(0).toUpperCase();
            if (elCargo) elCargo.innerText = perfil;
        }
    } catch (error) {
        console.error("Erro na sessão:", error.message);
        window.location.href = '/';
    }
});
// =========================================================

// Função para validar o login e pegar o nome para o cabeçalho
async function verificarUsuarioLogado() {
    try {
        const resposta = await fetch('/api/verificar-sessao', {
            credentials: 'include' // Essencial para ler o cookie do Vitor
        });
        
        const dados = await resposta.json();

        if (!dados.logado) {
            // Se não estiver logado, chuta a pessoa de volta pra tela de login
            window.location.href = '/'; 
            return;
        }

        // Se estiver logado, atualiza o nome na tela!
        // Como não sei o nome exato da coluna no seu banco, deixei 'matricula_fiscal' como teste. 
        // Troque 'matricula_fiscal' pelo nome correto da coluna (ex: 'nome' ou 'cargo')
        const nomeUsuario = dados.usuario.matricula_fiscal || "Administrador"; 
        
        document.getElementById('nome-usuario').innerText = nomeUsuario;
        document.getElementById('avatar-letra').innerText = String(nomeUsuario).charAt(0).toUpperCase();
        
    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);
    }
}

// Chame isso logo no início do seu window.onload
window.onload = () => {
    verificarUsuarioLogado();
    carregarInfracoes(); // O seu código que já estava aqui
};


const API_URL = 'http://localhost:3000/infracoes';

// Função para buscar e mostrar os dados na tabela
async function carregarInfracoes() {
    try {
        const resposta = await fetch(API_URL);
        const infracoes = await resposta.json();
        renderizarTabela(infracoes);
    } catch (erro) {
        console.error('Erro ao buscar dados:', erro);
        abrirModal('Não foi possível conectar com o back-end.');
    }
}

// Função auxiliar para desenhar o HTML da tabela
function renderizarTabela(infracoes) {
    const tbody = document.getElementById('tabela-resultados');
    tbody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (infracoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhuma infração encontrada com estes filtros.</td></tr>';
        return;
    }

    infracoes.forEach(infracao => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${infracao.id_infracao}</strong></td>
            <td>${infracao.descricao}</td>
            <td>${infracao.tipo}</td>
            <td>${infracao.artigo || '-'}</td>
            <td>${Number(infracao.valor_base).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Lógica para aplicar os filtros quando clicas em "Pesquisar"
document.getElementById('form-pesquisa').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    
    // Captura o texto que foi digitado nas caixas e converte para minúsculas
    const filtroCodigo = document.getElementById('filtro_codigo').value.toLowerCase();
    const filtroDescricao = document.getElementById('filtro_descricao').value.toLowerCase();
    const filtroCategoria = document.getElementById('filtro_categoria').value.toLowerCase();

    try {
        const resposta = await fetch(API_URL);
        const todasInfracoes = await resposta.json();

        // Filtra os dados localmente no front-end
        const infraFiltradas = todasInfracoes.filter(inf => {
            const bateCodigo = inf.id_infracao.toLowerCase().includes(filtroCodigo);
            const bateDescricao = inf.descricao.toLowerCase().includes(filtroDescricao);
            const bateCategoria = inf.tipo.toLowerCase().includes(filtroCategoria);
            
            return bateCodigo && bateDescricao && bateCategoria;
        });

        renderizarTabela(infraFiltradas);
    } catch (erro) {
        console.error('Erro ao filtrar:', erro);
    }
});

// Carrega tudo automaticamente ao abrir a página
window.onload = carregarInfracoes;
