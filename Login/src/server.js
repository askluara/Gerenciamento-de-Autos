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

function normalizarPerfil(usuario) {
    const adminAtivo = usuario?.is_admin === true
        || usuario?.is_admin === 1
        || ['true', '1'].includes(String(usuario?.is_admin).toLowerCase());
    if (adminAtivo) return 'ADMINISTRADOR';

    const perfil = String(usuario?.perfil || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
    if (perfil.includes('ADMIN')) return 'ADMINISTRADOR';
    if (perfil.includes('COORDENADOR')) return 'COORDENADOR';
    if (perfil.includes('FISCAL')) return 'FISCAL';
    if (usuario?.matricula_admin) return 'ADMINISTRADOR';
    if (usuario?.matricula_coordenador) return 'COORDENADOR';
    if (usuario?.matricula_fiscal) return 'FISCAL';
    return 'SEM_PERFIL';
}

function protegerPerfil(...perfisPermitidos) {
    return (req, res, next) => {
        if (perfisPermitidos.includes(req.session.usuario?.perfil)) {
            return next();
        }
        if (req.originalUrl.split('?')[0].startsWith('/api/')) {
            return res.status(403).json({ sucesso: false, mensagem: 'Você não tem permissão para acessar este recurso.' });
        }
        return res.status(403).send('Você não tem permissão para acessar este recurso.');
    };
}

function obterPermissoes(usuario) {
    const perfil = usuario?.perfil;
    return {
        fiscais: ['COORDENADOR', 'ADMINISTRADOR'].includes(perfil),
        infracoes: ['FISCAL', 'ADMINISTRADOR'].includes(perfil)
    };
}

// ==========================================
// CONFIGURAÇÃO DAS PASTAS ESTÁTICAS
// ==========================================
// 1. Arquivos globais e Login (public na raiz do Login)
app.use(express.static(path.join(__dirname, '../public')));

// 2. Módulo de Fiscais (Luara)
const publicFiscais = path.join(__dirname, '../../cadastro-fiscal/public');
app.use('/cadastro-fiscal', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), express.static(path.join(publicFiscais, 'html')));
app.use('/cadastro-fiscal', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), express.static(publicFiscais));

// 3. Módulo de Infrações (Luis Gabriel)
const publicInfracoes = path.join(__dirname, '../../cadastro-infracao/public');
app.get('/cadastro-infracao', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.redirect('/cadastro-infracao/cadastrar_infracao.html');
});
app.get('/cadastro-infracao/cadastrar_infracao.html', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicInfracoes, 'html', 'cadastrar_infracao.html'));
});
app.use('/cadastro-infracao', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), express.static(path.join(publicInfracoes, 'html')));
app.use('/cadastro-infracao', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), express.static(publicInfracoes));


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

    const mat = (matricula !== null && matricula !== undefined) ? String(matricula).trim() : '';
    const senhaInformada = (senha !== null && senha !== undefined) ? String(senha).trim() : '';

    if (!mat || !senhaInformada) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Preencha a matrícula e a senha.'
        });
    }

    // Colunas de matrícula aceitas no login
    const COLUNAS_MATRICULA = [
        'matricula_coordenador',
        'matricula_fiscal',
        'matricula_admin'
    ];

    const buscar = (coluna) => supabase
        .from('credencial')
        .select('*')
        .eq(coluna, mat)
        .eq('senha_hash', senhaInformada)
        .eq('ativo', true);

    try {
        const respostas = await Promise.all(COLUNAS_MATRICULA.map(buscar));

        const erro = respostas.map(r => r.error).find(Boolean);
        if (erro) {
            console.error('Erro no Supabase:', erro);
            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível conectar ao banco de dados.'
            });
        }

        const credenciais = respostas.flatMap(r => r.data || []);

        if (credenciais.length > 0) {
            // Não envia o hash/senha para a sessão nem para o front
            const { senha_hash, ...usuario } = credenciais[0];
            usuario.perfil = normalizarPerfil(usuario);

            req.session.usuarioLogado = true;
            req.session.usuario = usuario;

            return req.session.save((err) => {
                if (err) {
                    console.error('Erro ao salvar sessão:', err);
                    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar sessão.' });
                }
                return res.json({ sucesso: true, usuario: usuario });
            });
        }

        return res.status(401).json({
            sucesso: false,
            mensagem: 'Matrícula ou senha inválidas.'
        });

    } catch (err) {
        console.error('Erro interno:', err);
        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro de processamento interno no servidor.'
        });
    }
});

app.get('/api/verificar-sessao', (req, res) => {
    if (req.session.usuarioLogado) {
        return res.json({
            logado: true,
            usuario: req.session.usuario,
            permissoes: obterPermissoes(req.session.usuario)
        });
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
app.get('/api/cargos', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
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
app.get('/api/setores', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
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
app.get('/api/niveis-acesso', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
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
app.post('/api/fiscais/cadastrar', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
    try {
        const { credencial, ...novoFiscal } = req.body;
        const matricula = String(novoFiscal.matricula_fiscal || '').trim();
        const senha = String(credencial?.senha || '');
        if (!matricula || senha.length < 6) {
            return res.status(400).json({ sucesso: false, mensagem: 'Informe uma matrícula e uma senha com pelo menos 6 caracteres.' });
        }

        const { data: credenciaisExistentes, error: erroConsulta } = await supabase
            .from('credencial').select('login').eq('login', matricula).limit(1);
        if (erroConsulta) throw erroConsulta;
        if (credenciaisExistentes?.length) {
            return res.status(409).json({ sucesso: false, mensagem: 'Já existe uma credencial com essa matrícula.' });
        }
        
        // Insere o fiscal na tabela 'fiscal' do Supabase
        const { data, error } = await supabase
            .from('fiscal')
            .insert([novoFiscal])
            .select();

        if (error) throw error;

        const { error: erroCredencial } = await supabase.from('credencial').insert([{
            login: matricula,
            senha_hash: senha,
            perfil: 'FISCAL',
            matricula_fiscal: matricula,
            matricula_coordenador: null,
            ativo: true,
            data_criacao: new Date().toISOString(),
            is_admin: false
        }]);
        if (erroCredencial) {
            await supabase.from('fiscal').delete().eq('matricula_fiscal', matricula);
            throw erroCredencial;
        }
        return res.status(201).json({ sucesso: true, fiscal: data[0] });
    } catch (err) {
        console.error("Erro no cadastro de fiscal:", err);
        return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gravar fiscal no banco de dados.' });
    }
});

app.patch('/api/fiscais/:matricula/senha', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
    const matricula = String(req.params.matricula || '').trim();
    const senha = String(req.body.senha || '').trim();
    if (!matricula || senha.length < 6) {
        return res.status(400).json({ sucesso: false, mensagem: 'Informe uma senha com pelo menos 6 caracteres.' });
    }

    try {
        const { data, error } = await supabase
            .from('credencial')
            .update({ senha_hash: senha })
            .eq('login', matricula)
            .eq('matricula_fiscal', matricula)
            .select('login');

        if (error) throw error;
        if (!data?.length) {
            return res.status(404).json({ sucesso: false, mensagem: 'Não foi encontrada uma credencial de fiscal para essa matrícula.' });
        }
        return res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro ao atualizar senha do fiscal:', err);
        return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível atualizar a senha.' });
    }
});


// ==========================================
// ROTAS DE INFRAÇÕES (LUIS)
// ==========================================
app.post('/infracoes', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
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

app.get('/infracoes', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
    try {
        const urlOrdenada = `${SUPABASE_URL_INFRACOES}?order=id_infracao.asc`;
        const resposta = await fetch(urlOrdenada, { headers: headersFetch });
        const dados = await resposta.json();
        return res.status(200).json(dados);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao pesquisar infrações." });
    }
});

app.patch('/infracoes/:id', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
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

app.delete('/infracoes/:id', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
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
