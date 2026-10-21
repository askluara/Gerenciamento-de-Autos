require('dotenv').config(); // Adicionado para garantir a leitura do seu arquivo .env

// Imports necessários
const express = require('express');
const path = require('path');
// Substituição para o arquivo supabase para importação de dados
const supabase = require('./supabase'); // Importa a conexão criada
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000; // Atualizado para suportar a nuvem

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Configurações do Supabase para o CRUD de INFRAÇÃO
// ==========================================
const SUPABASE_URL = `${process.env.SUPABASE_URL}/rest/v1/infracao`;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Cria sessão do utilizador (segurança)
app.use(session({
    secret: 'abracadabra', // provisório
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true em produção com HTTPS
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true
    }
}));

// Serve os ficheiros do front (HTML, JS, CSS) a partir da raiz
app.use(express.static(path.join(__dirname, '../public')));

// Função que impede o acesso à tela home sem login
function protegerRota(req, res, next) {
    if (req.session.usuarioLogado) {
        next();
    } else {
        return res.status(302).redirect('/');
    }
}

// Rota para a tela de login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html', 'index.html'));
});

// Rota da Tela Inicial (onde o utilizador vai após logar)
app.get('/home', protegerRota, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/html', 'home.html'));
});

// Rota onde o login.js envia os dados
// Susbtituição dos metodos que dependiam do usuarios.json para o supabase
app.post('/api/login', async(req, res) => {
    const { matricula, senha } = req.body;

    const mat = (matricula !== null && matricula !== undefined) ? matricula.trim() : undefined;
    const senhaInformada = (senha !== null && senha !== undefined) ? senha.trim() : undefined;

    // Proteção contra campos vazios
    if (!mat || !senhaInformada) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Preencha a matrícula e a senha.'
        });
    }

    // VALIDAÇÃO: Se o banco espera um Inteiro, verifica se a matrícula contém apenas números
    if (isNaN(mat) || isNaN(Number(mat))) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Matrícula ou senha inválidas.'
        });
    }

    const matNumero = parseInt(mat, 10);

    try {
        // Consulta MUITO mais simples e direta na coluna 'login'
        const { data: credenciais, error } = await supabase
            .from('credencial')
            .select('*')
            .eq('login', mat)
            .eq('senha_hash', senhaInformada);

        if (error) {
            console.error('ERRO DETALHADO DO SUPABASE:', error); 
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível conectar ao banco de dados.'
            });
        }

        // Se encontrou registo correspondente
        if (credenciais && credenciais.length > 0) {
            const usuario = credenciais[0];

            req.session.usuarioLogado = true;
            req.session.usuario = usuario;

            return req.session.save((err) => {
                if (err) {
                    console.error("Erro ao salvar sessão:", err);
                    return res.status(500).json({ sucesso: false, mensagem: "Erro ao criar sessão." });
                }

                return res.json({
                    sucesso: true,
                    usuario: usuario
                });
            });
        } else {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Matrícula ou senha inválidas.'
            });
        }

    } catch (err) {
        console.error('Erro interno:', err);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro de processamento interno no servidor.'
        });
    }
});

// Verifica se há sessão válida (CORRIGIDO PARA O SEU FRONT-END FUNCIONAR)
app.get('/api/verificar-sessao', (req, res) => {
    if (req.session.usuarioLogado) {
        return res.json({ logado: true, usuario: req.session.usuario });
    } else {
        return res.json({ logado: false });
    }
});

// Sessão de logout
app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ sucesso: false });
        }
        res.json({ sucesso: true });
    });
});

// 1. Contadores do Dashboard (usando status_processo e relacionamentos)
app.get('/api/dashboard/estatisticas', protegerRota, async(req, res) => {
    try {
        // Total de Autos
        const { count: totalAutos, error: errTotal } = await supabase
            .from('auto_infracao')
            .select('*', { count: 'exact', head: true });

        // Defesas Pendentes (contagem de registos na tabela defesa)
        const { count: defesasPendentes, error: errDefesa } = await supabase
            .from('defesa')
            .select('*', { count: 'exact', head: true });

        // Pareceres em Análise
        const { count: pareceresAnalise, error: errParecer } = await supabase
            .from('parecer')
            .select('*', { count: 'exact', head: true });

        // Multas Emitidas
        const { count: multasEmitidas, error: errMulta } = await supabase
            .from('multa')
            .select('*', { count: 'exact', head: true });

        if (errTotal || errDefesa || errParecer || errMulta) {
            throw new Error("Erro ao consultar tabelas do dashboard");
        }

        return res.json({
            totalAutos: totalAutos || 0,
            defesasPendentes: defesasPendentes || 0,
            pareceresAnalise: pareceresAnalise || 0,
            multasEmitidas: multasEmitidas || 0
        });

    } catch (err) {
        console.error('Erro nas estatísticas:', err);
        return res.status(500).json({ mensagem: 'Erro ao carregar estatísticas.' });
    }
});

// 2. Tabela de Autos Recentes (fazendo JOIN com 'contribuinte' e 'infracao')
app.get('/api/dashboard/recentes', protegerRota, async(req, res) => {
    try {
        const { data: autos, error } = await supabase
            .from('auto_infracao')
            .select(`
        id_auto,
        numero_auto,
        data_auto,
        status_processo,
        contribuinte:fk_contribuinte_id_contribuinte (
          nome,
          cpf,
          cnpj
        ),
        infracao (
          tipo,
          descricao
        )
      `)
            .order('data_auto', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Formata o resultado para coincidir com a estrutura da tabela HTML
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
        console.error('Erro ao buscar autos recentes:', err);
        return res.status(500).json({ mensagem: 'Erro ao carregar autos recentes.' });
    }
});

// ==========================================
// ROTAS INTEGRADAS: GERENCIAMENTO DE INFRAÇÕES
// ==========================================

// Cadastrar Infração (Catálogo)
app.post('/infracoes', async (req, res) => {
    // CORREÇÃO: Extrair também o "artigo" do corpo da requisição
    const { descricao, tipo, artigo, valor_base } = req.body;

    // Atualizado para validar se o artigo também foi preenchido
    if (!descricao || !tipo || !artigo || !valor_base) {
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
            artigo: artigo, 
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

// Pesquisar Infração (Catálogo)
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

// Editar Infração (Atualização Parcial - PATCH)
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

// Excluir Infração (Catálogo)
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
// Inicia o servidor
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});