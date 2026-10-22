const express = require('express');

const router = express.Router();
const SUPABASE_BASE_URL = (process.env.SUPABASE_URL || 'https://kabdcameedigsitnlarf.supabase.co').replace(/\/+$/, '');
const SUPABASE_URL = SUPABASE_BASE_URL.endsWith('/rest/v1')
    ? SUPABASE_BASE_URL
    : `${SUPABASE_BASE_URL}/rest/v1`;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function supabaseHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...extra
    };
}

async function encaminharResposta(res, resposta) {
    const dados = await resposta.json();
    return res.status(resposta.status).json(dados);
}

router.get('/niveis-acesso', async (req, res) => {
    try {
        const resposta = await fetch(`${SUPABASE_URL}/nivel_acesso?order=id_nivelAcesso.asc`, {
            headers: supabaseHeaders()
        });
        return encaminharResposta(res, resposta);
    } catch (error) {
        console.error('Erro ao buscar níveis de acesso:', error);
        return res.status(500).json({ erro: 'Erro ao buscar níveis de acesso.' });
    }
});

router.post('/fiscais', async (req, res) => {
    try {
        // A matrícula é gerada pelo banco; nunca aceite um valor enviado pelo navegador.
        const dadosFiscal = { ...req.body };
        delete dadosFiscal.matricula_fiscal;
        const resposta = await fetch(`${SUPABASE_URL}/fiscal`, {
            method: 'POST',
            headers: supabaseHeaders({ Prefer: 'return=representation' }),
            body: JSON.stringify(dadosFiscal)
        });
        return encaminharResposta(res, resposta);
    } catch (error) {
        console.error('Erro ao cadastrar fiscal:', error);
        return res.status(500).json({ erro: 'Erro interno ao cadastrar fiscal.' });
    }
});

router.get('/fiscais', async (req, res) => {
    try {
        const query = '?select=*,cargo:fk_cargo_id(nome_cargo),setor:fk_idsetor(nome_setor),nivel_acesso:fk_idnivelacesso(descricao)&order=matricula_fiscal.asc';
        const resposta = await fetch(`${SUPABASE_URL}/fiscal${query}`, {
            headers: supabaseHeaders()
        });
        return encaminharResposta(res, resposta);
    } catch (error) {
        console.error('Erro ao pesquisar fiscais:', error);
        return res.status(500).json({ erro: 'Erro ao pesquisar fiscais.' });
    }
});

router.get('/cargos', async (req, res) => {
    try {
        const resposta = await fetch(`${SUPABASE_URL}/cargo`, { headers: supabaseHeaders() });
        return encaminharResposta(res, resposta);
    } catch (error) {
        console.error('Erro ao buscar cargos:', error);
        return res.status(500).json({ erro: 'Erro ao buscar cargos.' });
    }
});

router.get('/setores', async (req, res) => {
    try {
        const resposta = await fetch(`${SUPABASE_URL}/setor`, { headers: supabaseHeaders() });
        return encaminharResposta(res, resposta);
    } catch (error) {
        console.error('Erro ao buscar setores:', error);
        return res.status(500).json({ erro: 'Erro ao buscar setores.' });
    }
});

module.exports = router;
