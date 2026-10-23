// =========================================================
// VALIDAÇÃO DE SESSÃO, ATUALIZAÇÃO DO PERFIL E CÓDIGO AUTOMÁTICO
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

    // 2. Geração do Código da Infração Visual (Auto-incremento)
    const campoCodigo = document.getElementById('id_infracao');
    if (campoCodigo) {
        try {
            const respostaInfracoes = await fetch('/infracoes');
            if (respostaInfracoes.ok) {
                const infracoes = await respostaInfracoes.json();
                const proximoNumero = infracoes.length + 1;
                campoCodigo.value = `INF-${String(proximoNumero).padStart(3, '0')}`;
            } else {
                campoCodigo.value = 'Erro ao gerar';
            }
        } catch (erro) {
            console.error('Erro ao buscar o próximo código:', erro);
            campoCodigo.placeholder = 'Falha ao carregar';
        }
    }
});
// =========================================================

const API_URL = '/infracoes'; // Uso de rota relativa para evitar problemas caso mude de porta

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

            // O id_infracao não precisa ser enviado, o server.js já o cria automaticamente!
            const novaInfracao = {
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
                
                // Atualiza o visual do código para o próximo número após o cadastro
                const campoCodigo = document.getElementById('id_infracao');
                if (campoCodigo) {
                    const partes = campoCodigo.value.split('-');
                    if(partes.length === 2) {
                        const prox = parseInt(partes[1]) + 1;
                        campoCodigo.value = `INF-${String(prox).padStart(3, '0')}`;
                    }
                }
            } else {
                abrirModal('❌ Erro ao tentar cadastrar no banco de dados. Verifique o terminal do Node.js.');
            }
        } catch (erro) {
            console.error('Erro no Javascript:', erro);
            abrirModal('Falha na comunicação. Certifique-se de que o Back-end está rodando!');
        }
    });
}