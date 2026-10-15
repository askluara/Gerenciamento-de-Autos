const API_URL = 'http://localhost:3000/infracoes';

// Função para buscar e mostrar os dados na tabela
async function carregarInfracoes() {
    try {
        const resposta = await fetch(API_URL);
        const infracoes = await resposta.json();
        renderizarTabela(infracoes);
    } catch (erro) {
        console.error('Erro ao buscar dados:', erro);
        alert('Não foi possível conectar com o back-end.');
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
