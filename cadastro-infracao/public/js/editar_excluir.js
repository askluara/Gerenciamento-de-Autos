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

async function carregarInfracoes() {
    try {
        const resposta = await fetch(API_URL);
        const infracoes = await resposta.json();
        
        const tbody = document.getElementById('tabela-acoes');
        tbody.innerHTML = ''; 

        infracoes.forEach(inf => {
            const tr = document.createElement('tr');
            tr.id = `linha-${inf.id_infracao}`;
            
            tr.innerHTML = `
                <td><strong>${inf.id_infracao}</strong></td>
                <td id="td-desc-${inf.id_infracao}">${inf.descricao}</td>
                <td id="td-tipo-${inf.id_infracao}">${inf.tipo}</td>
                <td id="td-artigo-${inf.id_infracao}">${inf.artigo || '-'}</td>
                <td id="td-valor-${inf.id_infracao}">${Number(inf.valor_base).toFixed(2)}</td>
                <td id="td-acoes-${inf.id_infracao}">
                    <button onclick="habilitarEdicao('${inf.id_infracao}')" style="background: #f59e0b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">✏️ Editar</button>
                    <button onclick="excluirInfracao('${inf.id_infracao}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (erro) {
        console.error('Erro ao carregar:', erro);
    }
}

async function excluirInfracao(id) {
    if (!confirm(`🚨 Tem a certeza que deseja excluir a infração ${id}?\nEssa ação não pode ser desfeita.`)) {
        return; 
    }

    try {
        const resposta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });

        if (resposta.ok) {
            alert('✅ Infração excluída com sucesso!');
            carregarInfracoes();
        } else {
            alert('❌ Erro ao excluir no banco de dados.');
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

function habilitarEdicao(id) {
    const tdDesc = document.getElementById(`td-desc-${id}`);
    const tdTipo = document.getElementById(`td-tipo-${id}`);
    const tdArtigo = document.getElementById(`td-artigo-${id}`);
    const tdValor = document.getElementById(`td-valor-${id}`);
    const tdAcoes = document.getElementById(`td-acoes-${id}`);

    const descAtual = tdDesc.innerText;
    const tipoAtual = tdTipo.innerText;
    const artAtual = tdArtigo.innerText === '-' ? '' : tdArtigo.innerText;
    const valorAtual = tdValor.innerText;

    tdDesc.innerHTML = `<input type="text" id="input-desc-${id}" value="${descAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdTipo.innerHTML = `<input type="text" id="input-tipo-${id}" value="${tipoAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdArtigo.innerHTML = `<input type="text" id="input-artigo-${id}" value="${artAtual}" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;
    tdValor.innerHTML = `<input type="number" id="input-valor-${id}" value="${valorAtual}" style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">`;

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
            alert('✅ Infração atualizada com sucesso!');
            carregarInfracoes();
        } else {
            alert('❌ Erro ao tentar atualizar.');
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

window.onload = carregarInfracoes;
