require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// Credenciais e Configuração do Supabase
// ==========================================
// A URL agora usa 'infracao' minúsculo
const SUPABASE_URL = 'https://kabdcameedigsitnlarf.supabase.co/rest/v1/infracao';

// A chave secreta agora é puxada do arquivo .env de forma segura
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

// ==========================================
// Cadastrar Infração (Catálogo)
// ==========================================
app.post('/infracoes', async (req, res) => {
    const { descricao, tipo, valor_base } = req.body;

    if (!descricao || !tipo || !valor_base) {
        return res.status(400).json({ erro: "Erro: Preencha todos os campos obrigatórios para continuar." });
    }

    try {
        const getResp = await fetch(SUPABASE_URL, { headers });
        const infracoesExistentes = await getResp.json();
        
        const proximoNumero = infracoesExistentes.length + 1;
        const novoId = `INF-${String(proximoNumero).padStart(3, '0')}`;

        const novaInfracao = {
            id_infracao: novoId,
            descricao: descricao,
            tipo: tipo,
            valor_base: valor_base
        };

        const postResp = await fetch(SUPABASE_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(novaInfracao)
        });

        if (postResp.ok) {
            return res.status(201).json({ mensagem: "Infração cadastrada com sucesso na Base de Dados!", infracao: novaInfracao });
        } else {
            return res.status(500).json({ erro: "Erro ao gravar no Supabase." });
        }
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// Pesquisar Infração (Catálogo)
// ==========================================
app.get('/infracoes', async (req, res) => {
    try {
        // Mantendo a ordenação correta na visualização dos dados
        const urlOrdenada = `${SUPABASE_URL}?order=id_infracao.asc`;
        
        const resposta = await fetch(urlOrdenada, { headers });
        const dados = await resposta.json();
        
        return res.status(200).json(dados);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao pesquisar infrações." });
    }
});

// ==========================================
// Editar Infração (Atualização Parcial - PATCH)
// ==========================================
app.patch('/infracoes/:id', async (req, res) => {
    const idParam = req.params.id;
    const bodyData = req.body; 

    try {
        const urlEdicao = `${SUPABASE_URL}?id_infracao=eq.${idParam}`;
        
        const patchResp = await fetch(urlEdicao, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(bodyData)
        });

        if (patchResp.ok) {
            return res.status(200).json({ mensagem: "Infração atualizada com sucesso na Base de Dados!" });
        } else {
            return res.status(404).json({ erro: "Erro ao atualizar ou infração não encontrada." });
        }
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// Excluir Infração (Catálogo)
// ==========================================
app.delete('/infracoes/:id', async (req, res) => {
    const idParam = req.params.id;

    try {
        const urlExclusao = `${SUPABASE_URL}?id_infracao=eq.${idParam}`;
        
        const deleteResp = await fetch(urlExclusao, {
            method: 'DELETE',
            headers: headers
        });

        if (deleteResp.ok) {
            return res.status(200).json({ mensagem: "Auto de Infração excluído com sucesso da Base de Dados!" });
        } else {
            return res.status(404).json({ erro: "Erro ao excluir ou infração não encontrada." });
        }
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// ==========================================
// Configuração da Porta e Inicialização
// ==========================================
const PORTA = 3000;
app.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});