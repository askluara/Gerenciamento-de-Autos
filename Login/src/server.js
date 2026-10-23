// ==========================================
// IMPORTS E CONFIGURAÇÕES INICIAIS
// ==========================================
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const supabase = require('./supabase');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurações Legadas do Supabase para o CRUD de Infrações (via fetch)
const SUPABASE_URL_INFRACOES = `${process.env.SUPABASE_URL}/rest/v1/infracao`;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const headersFetch = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// ==========================================
// SESSÃO E SEGURANÇA
// ==========================================
app.use(session({
    secret: 'abracadabra',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
    }
}));

function protegerRota(req, res, next) {
    if (req.session.usuarioLogado) {
        next();
    } else {
        return res.status(302).redirect('/');
    }
}

// ==========================================
// CONFIGURAÇÃO DAS PASTAS ESTÁTICAS
// ==========================================
// 1. Arquivos globais e Login (public na raiz do Login)
app.use(express.static(path.join(__dirname, '../public')));

// 2. Módulo de Fiscais (Luara)
const publicFiscais = path.join(__dirname, '../../cadastro-fiscal/public');
app.use('/cadastro-fiscal', protegerRota, express.static(path.join(publicFiscais, 'html')));
app.use('/cadastro-fiscal', express.static(publicFiscais));

// 3. Módulo de Infrações (Luis Gabriel)
const publicInfracoes = path.join(__dirname, '../../cadastro-infracao/public');
app.use('/cadastro-infracao', protegerRota, express.static(path.join(publicInfracoes, 'html')));
app.use('/cadastro-infracao', express.static(publicInfracoes));


// ==========================================
// ROTAS DE PÁGINAS GERAIS
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'html', 'index.html'));
});

app.get('/home', protegerRota, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'html', 'home.html'));
});


// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/api/login', async(req, res) => {
    const { matricula, senha } = req.body;
    const mat = (matricula !== null && matricula !== undefined) ? matricula.trim() : undefined;
    const senhaInformada = (senha !== null && senha !== undefined) ? senha.trim() : undefined;

    if (!mat || !senhaInformada) return res.status(400).json({ sucesso: false, mensagem: 'Preencha a matrícula e a senha.' });

    try {
        const { data: credenciais, error } = await supabase
            .from('credencial')
            .select('*')
            .eq('login', mat)
            .eq('senha_hash', senhaInformada)
            .eq('ativo', true);

        if (error) return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível conectar ao banco de dados.' });

        if (credenciais && credenciais.length > 0) {
            const usuario = credenciais[0];
            req.session.usuarioLogado = true;
            req.session.usuario = usuario;

            return req.session.save((err) => {
                if (err) return res.status(500).json({ sucesso: false, mensagem: "Erro ao criar sessão." });
                return res.json({ sucesso: true, usuario: usuario });
            });
        } else {
            return res.status(401).json({ sucesso: false, mensagem: 'Matrícula ou senha inválidas.' });
        }
    } catch (err) {
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
    }
});

app.get('/api/verificar-sessao', (req, res) => {
    if (req.session.usuarioLogado) {
        return res.json({ logado: true, usuario: req.session.usuario });
    } else {
        return res.json({ logado: false });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ sucesso: false });
        res.json({ sucesso: true });
    });
});


// ==========================================
// ROTAS DO DASHBOARD
// ==========================================
app.get('/api/dashboard/estatisticas', protegerRota, async(req, res) => {
    try {
        const { count: totalAutos } = await supabase.from('auto_infracao').select('*', { count: 'exact', head: true });
        const { count: defesasPendentes } = await supabase.from('defesa').select('*', { count: 'exact', head: true });
        const { count: pareceresAnalise } = await supabase.from('parecer').select('*', { count: 'exact', head: true });
        const { count: multasEmitidas } = await supabase.from('multa').select('*', { count: 'exact', head: true });

        return res.json({
            totalAutos: totalAutos || 0,
            defesasPendentes: defesasPendentes || 0,
            pareceresAnalise: pareceresAnalise || 0,
            multasEmitidas: multasEmitidas || 0
        });
    } catch (err) {
        return res.status(500).json({ mensagem: 'Erro ao carregar estatísticas.' });
    }
});

app.get('/api/dashboard/recentes', protegerRota, async(req, res) => {
    try {
        const { data: autos, error } = await supabase
            .from('auto_infracao')
            .select(`id_auto, numero_auto, data_auto, status_processo, contribuinte:fk_contribuinte_id_contribuinte (nome, cpf, cnpj), infracao (tipo, descricao)`)
            .order('data_auto', { ascending: false }).limit(5);

        if (error) throw error;

        const autosFormatados = autos.map(item => {
            const contrib = Array.isArray(item.contribuinte) ? item.contribuinte[0] : item.contribuinte;
            const inf = Array.isArray(item.infracao) ? item.infracao[0] : item.infracao;
            return {
                protocolo: item.numero_auto || item.id_auto,
                contribuinte: (contrib && contrib.nome) || 'Não informado',
                cpf_cnpj: (contrib && (contrib.cpf || contrib.cnpj)) || 'N/A',
                data: item.data_auto,
                tipo_infracao: (inf && (inf.tipo || inf.descricao)) || 'Geral',
                status: item.status_processo || 'Pendente'
            };
        });
        return res.json(autosFormatados);
    } catch (err) {
        return res.status(500).json({ mensagem: 'Erro ao carregar autos recentes.' });
    }
});


// ==========================================
// ROTAS DE FISCAIS (LUARA) E DADOS DE APOIO
// ==========================================

// Rota para buscar Cargos
app.get('/api/cargos', protegerRota, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('cargo')
            .select('id, nome_cargo') // CORRIGIDO PARA 'id'
            .order('nome_cargo', { ascending: true });
            
        if (error) throw error;
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar cargos' });
    }
});

// Rota para buscar Setores
app.get('/api/setores', protegerRota, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('setor')
            .select('id_setor, nome_setor')
            .order('nome_setor', { ascending: true });
            
        if (error) throw error;
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar setores' });
    }
});

// Rota para buscar Níveis de Acesso
app.get('/api/niveis-acesso', protegerRota, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('nivel_acesso')
            .select('id_nivelAcesso, descrição') // CORRIGIDO PARA 'descrição'
            .order('id_nivelAcesso', { ascending: true });
            
        if (error) throw error;
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar níveis de acesso' });
    }
});

// Rota para Cadastrar o Fiscal no Banco de Dados
app.post('/api/fiscais/cadastrar', protegerRota, async (req, res) => {
    try {
        const novoFiscal = req.body;
        
        // Insere o fiscal na tabela 'fiscal' do Supabase
        const { data, error } = await supabase
            .from('fiscal')
            .insert([novoFiscal])
            .select();

        if (error) throw error;
        return res.status(201).json({ sucesso: true, fiscal: data[0] });
    } catch (err) {
        console.error("Erro no cadastro de fiscal:", err);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gravar fiscal no banco de dados.' });
    }
});


// ==========================================
// ROTAS DE INFRAÇÕES (LUIS)
// ==========================================
app.post('/infracoes', async (req, res) => {
    const { descricao, tipo, artigo, valor_base } = req.body;
    if (!descricao || !tipo || !artigo || !valor_base) {
        return res.status(400).json({ erro: "Erro: Preencha todos os campos obrigatórios para continuar." });
    }
    try {
        const getResp = await fetch(SUPABASE_URL_INFRACOES, { headers: headersFetch });
        const infracoesExistentes = await getResp.json();
        
        const proximoNumero = infracoesExistentes.length + 1;
        const novoId = `INF-${String(proximoNumero).padStart(3, '0')}`;

        const novaInfracao = { id_infracao: novoId, descricao, tipo, artigo, valor_base };

        const postResp = await fetch(SUPABASE_URL_INFRACOES, {
            method: 'POST',
            headers: headersFetch,
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

app.get('/infracoes', async (req, res) => {
    try {
        const urlOrdenada = `${SUPABASE_URL_INFRACOES}?order=id_infracao.asc`;
        const resposta = await fetch(urlOrdenada, { headers: headersFetch });
        const dados = await resposta.json();
        return res.status(200).json(dados);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao pesquisar infrações." });
    }
});

app.patch('/infracoes/:id', async (req, res) => {
    const idParam = req.params.id;
    try {
        const urlEdicao = `${SUPABASE_URL_INFRACOES}?id_infracao=eq.${idParam}`;
        const patchResp = await fetch(urlEdicao, {
            method: 'PATCH',
            headers: headersFetch,
            body: JSON.stringify(req.body)
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

app.delete('/infracoes/:id', async (req, res) => {
    const idParam = req.params.id;
    try {
        const urlExclusao = `${SUPABASE_URL_INFRACOES}?id_infracao=eq.${idParam}`;
        const deleteResp = await fetch(urlExclusao, { method: 'DELETE', headers: headersFetch });
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
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor unificado rodando em: http://localhost:${PORT}`);
});