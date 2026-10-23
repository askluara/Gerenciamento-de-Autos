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

const API_URL = 'http://localhost:3000/infracoes';

// ==========================================
// [POST] Função para Cadastrar Nova Infração
// ==========================================
document.getElementById('form-infracao').addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Impede a página de recarregar

    try {
        // Captura os dados digitados
        const id_infracao = document.getElementById('id_infracao').value;
        const tipo = document.getElementById('tipo').value;
        const descricao = document.getElementById('descricao').value;
        const artigo = document.getElementById('artigo').value;
        const valor_base = document.getElementById('valor_base').value;

        const novaInfracao = {
            id_infracao: id_infracao,
            descricao: descricao,
            tipo: tipo,
            artigo: artigo,
            valor_base: Number(valor_base)
        };

        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novaInfracao)
        });

        if (resposta.ok) {
            await concluirAcao('Infração cadastrada com sucesso.');
        } else {
            abrirModal('❌ Erro ao tentar cadastrar no banco de dados. Verifique o terminal do Node.js.');
        }
    } catch (erro) {
        console.error('Erro no Javascript:', erro);
        abrirModal('Falha na comunicação. Certifique-se de que o Back-end está rodando!');
    }
});
