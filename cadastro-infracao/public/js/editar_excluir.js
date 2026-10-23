// =========================================================
// INICIALIZAÇÃO DA PÁGINA E VALIDAÇÃO DE SESSÃO
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validação de Sessão
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

    // 2. Carrega as infrações para edição
    await carregarInfracoes();
});

// Rota relativa para a API
const API_URL = '/infracoes';

// Função para buscar e desenhar a tabela
async function carregarInfracoes() {
    try {
        const resposta = await fetch(API_URL);
        if (!resposta.ok) throw new Error('Falha na resposta do servidor');
        
        const infracoes = await resposta.json();
        
        const tbody = document.getElementById('tabela-acoes');
        if (!tbody) return;
        
        tbody.innerHTML = ''; 

        if (!infracoes || infracoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhuma infração registada.</td></tr>';
            return;
        }

        infracoes.forEach(inf => {
            const tr = document.createElement('tr');
            tr.id = `linha-${inf.id_infracao}`;
            
            tr.innerHTML = `
                <td><strong>${inf.id_infracao || '-'}</strong></td>
                <td id="td-desc-${inf.id_infracao}">${inf.descricao || '-'}</td>
                <td id="td-tipo-${inf.id_infracao}">${inf.tipo || '-'}</td>
                <td id="td-artigo-${inf.id_infracao}">${inf.artigo || '-'}</td>
                <td id="td-valor-${inf.id_infracao}">${Number(inf.valor_base || 0).toFixed(2)}</td>
                <td id="td-acoes-${inf.id_infracao}" style="text-align: center;">
                    <button onclick="habilitarEdicao('${inf.id_infracao}')" style="background: #f59e0b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">✏️ Editar</button>
                    <button onclick="excluirInfracao('${inf.id_infracao}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (erro) {
        console.error('Erro ao carregar:', erro);
        const tbody = document.getElementById('tabela-acoes');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar os dados do servidor.</td></tr>';
    }
}

// Funções de CRUD
async function excluirInfracao(id) {
    const confirmar = await confirmarModal(
        `Tem certeza que deseja excluir a infração ${id}?\nEssa ação não pode ser desfeita.`,
        { tipo: 'danger' }
    );
    if (!confirmar) return; 

    try {
        const resposta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

        if (resposta.ok) {
            await concluirAcao('Infração excluída com sucesso.');
            carregarInfracoes(); // Recarrega a tabela
        } else {
            abrirModal('❌ Erro ao excluir no banco de dados.');
        }
    } catch (erro) {
        abrirModal('Falha na comunicação com o servidor.');
    }
}

function habilitarEdicao(id) {
    const tdDesc = document.getElementById(`td-desc-${id}`);
    const tdTipo = document.getElementById(`td-tipo-${id}`);
    const tdArtigo = document.getElementById(`td-artigo-${id}`);
    const tdValor = document.getElementById(`td-valor-${id}`);
    const tdAcoes = document.getElementById(`td-acoes-${id}`);

    const descAtual = tdDesc.innerText === '-' ? '' : tdDesc.innerText;
    const tipoAtual = tdTipo.innerText === '-' ? '' : tdTipo.innerText;
    const artAtual = tdArtigo.innerText === '-' ? '' : tdArtigo.innerText;
    const valorAtual = tdValor.innerText;

    tdDesc.innerHTML = `<input type="text" id="input-desc-${id}" value="${descAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdTipo.innerHTML = `<input type="text" id="input-tipo-${id}" value="${tipoAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdArtigo.innerHTML = `<input type="text" id="input-artigo-${id}" value="${artAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdValor.innerHTML = `<input type="number" step="0.01" id="input-valor-${id}" value="${valorAtual}" style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;

    tdAcoes.innerHTML = `
        <button onclick="salvarEdicao('${id}')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">💾 Salvar</button>
        <button onclick="carregarInfracoes()" style="background: #6b7280; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">✖ Cancelar</button>
    `;
}

async function salvarEdicao(id) {
    const novaDescricao = document.getElementById(`input-desc-${id}`).value;
    const novoTipo = document.getElementById(`input-tipo-${id}`).value;
    const novoArtigo = document.getElementById(`input-artigo-${id}`).value;
    const novoValor = document.getElementById(`input-valor-${id}`).value;

    const dadosAtualizados = {
        descricao: novaDescricao,
        tipo: novoTipo,
        artigo: novoArtigo,
        valor_base: Number(novoValor)
    };

    try {
        const resposta = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAtualizados)
        });

        if (resposta.ok) {
            await concluirAcao('Infração atualizada com sucesso.');
            carregarInfracoes(); // Recarrega a tabela atualizada
        } else {
            abrirModal('❌ Erro ao tentar atualizar.');
        }
    } catch (erro) {
        abrirModal('Falha na comunicação com o servidor.');
    }
}