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
            alert('✅ Sucesso! Infração cadastrada na base de dados.');
            document.getElementById('form-infracao').reset(); // Limpa as caixinhas automaticamente
        } else {
            alert('❌ Erro ao tentar cadastrar no banco de dados. Verifique o terminal do Node.js.');
        }
    } catch (erro) {
        console.error('Erro no Javascript:', erro);
        alert('Falha na comunicação. Certifique-se de que o Back-end está rodando!');
    }
});