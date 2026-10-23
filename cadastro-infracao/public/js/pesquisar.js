// =========================================================
// INICIALIZAÇÃO DA PÁGINA (Sessão e Cabeçalho)
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validação de Sessão e preenchimento do cabeçalho
    try {
        const respostaSessao = await fetch('/api/verificar-sessao', { credentials: 'include' });
        
        if (!respostaSessao.ok) throw new Error(`Erro HTTP: ${respostaSessao.status}`);
        
        const dados = await respostaSessao.json();
        
        if (!dados.logado) {
            window.location.href = '/'; 
            return;
        } else {
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
        return;
    }
});

// Rota relativa para a API
const API_URL = '/infracoes';

// Função para buscar e mostrar os dados na tabela
async function carregarInfracoes() {
    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) throw new Error('Falha na resposta do servidor');
        
        const infracoes = await resposta.json();
        renderizarTabela(infracoes);
    } catch (erro) {
        console.error('Erro ao buscar dados:', erro);
        const tbody = document.getElementById('tabela-resultados');
        if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro ao carregar os dados do servidor.</td></tr>';
    }
}

// Função auxiliar para desenhar o HTML da tabela
function renderizarTabela(infracoes) {
    const tbody = document.getElementById('tabela-resultados');
    if (!tbody) return;
    
    tbody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (!infracoes || infracoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhuma infração encontrada.</td></tr>';
        return;
    }

    infracoes.forEach(infracao => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${infracao.id_infracao || '-'}</strong></td>
            <td>${infracao.descricao || '-'}</td>
            <td>${infracao.tipo || '-'}</td>
            <td>${infracao.artigo || '-'}</td>
            <td>${Number(infracao.valor_base || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Lógica para aplicar os filtros quando clicar em "Pesquisar"
const formPesquisa = document.getElementById('form-pesquisa');
if (formPesquisa) {
    formPesquisa.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        
        const filtroCodigo = document.getElementById('filtro_codigo')?.value.toLowerCase().trim() || '';
        const filtroDescricao = document.getElementById('filtro_descricao')?.value.toLowerCase().trim() || '';
        const filtroCategoria = document.getElementById('filtro_categoria')?.value.toLowerCase().trim() || '';

        try {
            const resposta = await fetch(API_URL);
            const todasInfracoes = await resposta.json();

            const infraFiltradas = todasInfracoes.filter(inf => {
                const codigo = (inf.id_infracao || '').toLowerCase();
                const descricao = (inf.descricao || '').toLowerCase();
                const categoria = (inf.tipo || '').toLowerCase();
                
                const bateCodigo = codigo.includes(filtroCodigo);
                const bateDescricao = descricao.includes(filtroDescricao);
                const bateCategoria = categoria.includes(filtroCategoria);
                
                return bateCodigo && bateDescricao && bateCategoria;
            });

            renderizarTabela(infraFiltradas);
        } catch (erro) {
            console.error('Erro ao filtrar:', erro);
        }
    });
}

// =========================================================
// GATILHO DE CARREGAMENTO DOS DADOS (Com atraso estratégico)
// =========================================================
window.addEventListener('load', () => {
    setTimeout(() => {
        carregarInfracoes();
    }, 500); // 500 milissegundos de atraso para o sidebar não apagar a tabela
});