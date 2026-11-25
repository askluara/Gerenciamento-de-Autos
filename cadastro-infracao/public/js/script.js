// =========================================================
// VALIDAÇÃO DE SESSÃO E ATUALIZAÇÃO DO PERFIL
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Validação de Sessão
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

// ==========================================
// CALCULADORA DINÂMICA DE UFMs
// ==========================================
const campoUFM = document.getElementById('valor_base');
const campoCalculado = document.getElementById('valor_calculado');
const VALOR_UFM_REAIS = 29.00; // Valor fixo de 1 UFM (em Reais)

if (campoUFM && campoCalculado) {
    campoUFM.addEventListener('input', () => {
        // Pega o valor digitado (garante que é inteiro). Se apagar o número, assume 0.
        const qtdUFMs = parseInt(campoUFM.value) || 0; 
        const totalReais = qtdUFMs * VALOR_UFM_REAIS;
        
        // Formata o resultado automaticamente para o padrão moeda do Brasil (R$ 0,00)
        campoCalculado.value = totalReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    });
}

const API_URL = '/infracoes'; 

// ==========================================
// [POST] Função para Cadastrar Nova Infração
// ==========================================
const formInfracao = document.getElementById('form-infracao');

if (formInfracao) {
    formInfracao.addEventListener('submit', async (evento) => {
        evento.preventDefault(); // Impede a página de recarregar

        try {
            // Captura os dados digitados
            const tipo = document.getElementById('tipo').value;
            const descricao = document.getElementById('descricao').value;
            const artigo = document.getElementById('artigo').value;
            const valor_base = document.getElementById('valor_base').value;

            // O id_infracao não precisa ser enviado, o server.js/banco o cria automaticamente!
            const novaInfracao = {
                descricao: descricao,
                tipo: tipo,
                artigo: artigo,
                valor_base: parseInt(valor_base) // Garantindo o número inteiro de UFMs
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
                
                // Limpa o formulário e zera a calculadora de Reais após cadastrar
                formInfracao.reset();
                if (campoCalculado) campoCalculado.value = 'R$ 0,00';
            } else {
                abrirModal('❌ Erro ao tentar cadastrar no banco de dados. Verifique o terminal do Node.js.');
            }
        } catch (erro) {
            console.error('Erro no Javascript:', erro);
            abrirModal('Falha na comunicação. Certifique-se de que o Back-end está rodando!');
        }
    });
}