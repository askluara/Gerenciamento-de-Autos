// ==========================================
// IMPORTS E CONFIGURAÇÕES INICIAIS
// ==========================================
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const supabase = require('./supabase');
const { identificarDocumento } = require('./documento');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
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
const autosUiBuild = path.join(__dirname, '../public/autos-ui');
app.get('/autos-ui', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => res.redirect('/autos-ui/'));
app.use('/autos-ui', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), express.static(autosUiBuild));

app.use(express.static(path.join(__dirname, '../public')));

// 2. Módulo de Fiscais (Luara)
const publicFiscais = path.join(__dirname, '../../cadastro-fiscal/public');
const publicFiscaisHtml = path.join(publicFiscais, 'html');

app.get('/cadastro-fiscal', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), (req, res) => {
    return res.redirect('/cadastro-fiscal/Cadastro-fiscal.html');
});
app.get('/cadastro-fiscal/Cadastro-fiscal.html', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicFiscaisHtml, 'Cadastro-fiscal.html'));
});
app.get('/cadastro-fiscal/pesquisar-fiscal.html', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicFiscaisHtml, 'pesquisar-fiscal.html'));
});
app.get('/cadastro-fiscal/editar-fiscal.html', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicFiscaisHtml, 'editar-fiscal.html'));
});
app.get('/cadastro-fiscal/inativar-fiscal.html', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicFiscaisHtml, 'inativar-fiscal.html'));
});
app.use('/cadastro-fiscal/css', express.static(path.join(publicFiscais, 'css')));
app.use('/cadastro-fiscal/js', express.static(path.join(publicFiscais, 'js')));

// 3. Módulo de Infrações (Luis Gabriel)
const publicInfracoes = path.join(__dirname, '../../cadastro-infracao/public');
const publicInfracoesHtml = path.join(publicInfracoes, 'html');
app.get('/cadastro-infracao', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.redirect('/cadastro-infracao/cadastrar_infracao.html');
});
app.get('/cadastro-infracao/cadastrar_infracao.html', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicInfracoesHtml, 'cadastrar_infracao.html'));
});
app.get('/cadastro-infracao/pesquisar_infracao.html', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicInfracoesHtml, 'pesquisar_infracao.html'));
});
app.get('/cadastro-infracao/editar_excluir_infracao.html', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(publicInfracoesHtml, 'editar_excluir_infracao.html'));
});
app.use('/cadastro-infracao/css', express.static(path.join(publicInfracoes, 'css')));
app.use('/cadastro-infracao/js', express.static(path.join(publicInfracoes, 'js')));


// ==========================================
// ROTAS DE PÁGINAS GERAIS
// ==========================================
// M?dulo de Autos de Infra??o (Interface React / Vite)
const publicAutos = path.join(__dirname, '../../cadastro-auto/public');

app.get('/cadastro-auto', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(autosUiBuild, 'index.html'));
});
app.get('/cadastro-auto/gerenciar-autos.html', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), (req, res) => {
    return res.sendFile(path.join(autosUiBuild, 'index.html'));
});

app.use('/cadastro-auto/css', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), express.static(path.join(publicAutos, 'css')));
app.use('/cadastro-auto/js', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), express.static(path.join(publicAutos, 'js')));

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

app.patch('/api/fiscais/:matricula/status', protegerRota, protegerPerfil('COORDENADOR', 'ADMINISTRADOR'), async (req, res) => {
    const matricula = String(req.params.matricula || '').trim();
    const { ativo } = req.body;
    if (!matricula || typeof ativo !== 'boolean') {
        return res.status(400).json({ sucesso: false, mensagem: 'Informe uma matrícula e um status válido.' });
    }

    try {
        const { data, error } = await supabase
            .from('fiscal')
            .update({ ativo })
            .eq('matricula_fiscal', matricula)
            .select('matricula_fiscal, ativo');

        if (error) throw error;
        if (!data?.length) {
            return res.status(404).json({ sucesso: false, mensagem: 'Fiscal não encontrado.' });
        }
        return res.json({ sucesso: true, fiscal: data[0] });
    } catch (err) {
        console.error('Erro ao alterar status do fiscal:', err);
        return res.status(500).json({ sucesso: false, mensagem: 'Não foi possível alterar o status do fiscal.' });
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
const STATUS_PROCESSO_VALIDOS = [
    'Em Aberto', 'Defesa Apresentada', 'Em Julgamento',
    'Encerrado com Multa', 'Arquivado', 'Não Apresentou'
];

app.get('/api/autos/opcoes', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
    try {
        const [contribuintes, fiscais] = await Promise.all([
            supabase.from('contribuinte').select('id_contribuinte,nome,cpf,cnpj,tipo').order('nome'),
            supabase.from('fiscal').select('matricula_fiscal,nome').order('nome')
        ]);
        if (contribuintes.error) throw contribuintes.error;
        if (fiscais.error) throw fiscais.error;
        return res.json({ contribuintes: contribuintes.data || [], fiscais: fiscais.data || [] });
    } catch (error) {
        console.error('Erro ao carregar opções dos autos:', error);
        return res.status(500).json({ mensagem: 'Não foi possível carregar contribuintes e fiscais.' });
    }
});

app.get('/api/autos', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
    try {
        let consulta = supabase.from('auto_infracao').select(`
            *,
            contribuinte:fk_contribuinte_id_contribuinte (*),
            infracao:infracao!fk_auto_infracao_id_auto (*),
            fiscal:fk_fiscal_matricula (nome)
        `).order('data_auto', { ascending: false });

        if (req.query.numero) consulta = consulta.ilike('numero_auto', `%${String(req.query.numero).trim()}%`);
        if (req.query.status && STATUS_PROCESSO_VALIDOS.includes(req.query.status)) consulta = consulta.eq('status_processo', req.query.status);

        const { data, error } = await consulta;
        if (error) throw error;

        // Formata os dados unificando os relacionamentos para o frontend
        const resultado = (data || []).map(auto => {
            const inf = Array.isArray(auto.infracao) ? auto.infracao[0] : auto.infracao;
            const contrib = Array.isArray(auto.contribuinte) ? auto.contribuinte[0] : auto.contribuinte;
            const fisc = Array.isArray(auto.fiscal) ? auto.fiscal[0] : auto.fiscal;

            return {
                ...auto,
                local: auto.local_ocorrencia || null,
                local_ocorrencia: auto.local_ocorrencia || null,
                valor_base: inf?.valor_base ?? null,
                tipo_infracao: inf?.tipo || auto.tipo_infracao || null,
                base_legal: inf?.artigo || auto.base_legal || null,
                nome_fiscal: fisc?.nome || null,
                nome_contribuinte: contrib?.nome || contrib?.razao_social || null,
                cpf: contrib?.cpf || null,
                cnpj: contrib?.cnpj || null,
                rua: contrib?.rua || null,
                numero: contrib?.numero || null,
                bairro: contrib?.bairro || null
            };
        });

        return res.json(resultado);
    } catch (error) {
        console.error('Erro ao pesquisar autos:', error);
        return res.status(500).json({ mensagem: 'Não foi possível pesquisar os autos.' });
    }
});
app.post('/api/autos/imagens', protegerRota, protegerPerfil('FISCAL', 'ADMINISTRADOR'), async (req, res) => {
    try {
        const { nome, tipo, base64 } = req.body || {};
        if (!nome || !tipo || !String(tipo).startsWith('image/') || !base64) return res.status(400).json({ mensagem: 'Imagem inválida.' });
        const buffer = Buffer.from(String(base64), 'base64');
        if (!buffer.length || buffer.length > 2 * 1024 * 1024) return res.status(400).json({ mensagem: 'Cada imagem deve ter no máximo 2 MB.' });
        const extensao = (String(nome).split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const caminho = `${Date.now()}-${require('crypto').randomUUID()}.${extensao}`;
        const { error } = await supabase.storage.from('autos-evidencias').upload(caminho, buffer, { contentType: tipo, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('autos-evidencias').getPublicUrl(caminho);
        return res.status(201).json({ url: data.publicUrl });
    } catch (error) {
        console.error('Erro ao enviar imagem do auto:', error);
        return res.status(500).json({ mensagem: 'Não foi possível armazenar a imagem. Confira se o bucket autos-evidencias foi criado no Supabase.' });
    }
});

function gerarIdAuto() {
    // A coluna id_auto é CHAR(11), sem sequence/default no PostgreSQL.
    return require('crypto').randomBytes(8).toString('hex').slice(0, 11).toUpperCase();
}

function somenteDigitos(valor) { return String(valor || '').replace(/\D/g, ''); }

// Recebe um único documento (CPF ou CNPJ), identifica o tipo, localiza o contribuinte
// e, se ele ainda não existir, cadastra. Retorna { id, criado }.
async function localizarOuCriarContribuinte(payload) {
    const informado = payload.documento || payload.cpf || payload.cnpj;
    if (!informado) throw new Error('Informe o CPF ou o CNPJ do contribuinte.');
    const doc = identificarDocumento(informado);
    if (doc.erro) throw new Error(doc.erro);

    const fisica = doc.tipo === 'CPF';
    const { data: encontrados, error: buscaErro } = await supabase.from('contribuinte')
        .select('id_contribuinte,tipo,contribuinte_tipo,cpf,cnpj,nome,razao_social')
        .or(`${doc.coluna}.eq.${doc.digitos},${doc.coluna}.eq.${doc.formatado}`)
        .limit(1);
    if (buscaErro) throw buscaErro;
    const existente = encontrados?.[0];
    if (existente) {
        const tipoEsperado = fisica ? 'Fisico' : 'Juridico';
        if (existente.tipo && existente.tipo !== tipoEsperado) throw new Error('O documento encontrado está classificado com um tipo incompatível no cadastro de contribuintes.');
        return { id: existente.id_contribuinte, criado: false };
    }

    const nome = String(payload.nome_contribuinte || payload.razao_social || '').trim();
    if (!nome) throw new Error(fisica ? 'Informe o nome da pessoa física.' : 'Informe a razão social da pessoa jurídica.');

    const novo = {
        id_contribuinte: require('crypto').randomUUID(),
        nome,
        tipo: fisica ? 'Fisico' : 'Juridico',
        contribuinte_tipo: fisica ? 1 : 2,
        cpf: fisica ? doc.digitos : null,
        cnpj: fisica ? null : doc.digitos,
        razao_social: fisica ? null : nome,
        rua: payload.rua || null,
        numero: payload.numero || null,
        bairro: payload.bairro || null
    };

    const { data, error } = await supabase.from('contribuinte').insert(novo).select('id_contribuinte').single();
    if (error) throw error;
    return { id: data.id_contribuinte, criado: true };
}

function camposAuto(payload) {
    const permitidos = ['numero_auto','data_auto','prazo_defesa','local_ocorrencia','descricao_detalhada','assinatura_autuado','url_auto','status_processo','base_legal','cnae','nome_fantasia','inicio_fiscalizacao','fim_fiscalizacao','responsavel_assinou','testemunha_nome','testemunha_matricula','observacoes','imagens_urls'];
    const resultado = {};
    for (const campo of permitidos) if (payload[campo] !== undefined) resultado[campo] = payload[campo] === '' ? null : payload[campo];
    return resultado;
}
// Função auxiliar para buscar o auto com todas as suas relações montadas
async function buscarAutoCompleto(idAuto) {
    const { data: auto, error } = await supabase
        .from('auto_infracao')
        .select(`
            *,
            contribuinte:fk_contribuinte_id_contribuinte (*),
            infracao:infracao!fk_auto_infracao_id_auto (*),
            fiscal:fk_fiscal_matricula (nome)
        `)
        .eq('id_auto', idAuto)
        .single();

    if (error || !auto) return null;

    const inf = Array.isArray(auto.infracao) ? auto.infracao[0] : auto.infracao;
    const contrib = Array.isArray(auto.contribuinte) ? auto.contribuinte[0] : auto.contribuinte;
    const fisc = Array.isArray(auto.fiscal) ? auto.fiscal[0] : auto.fiscal;

    return {
        ...auto,
        local: auto.local_ocorrencia || null,
        local_ocorrencia: auto.local_ocorrencia || null,
        valor_base: inf?.valor_base ?? null,
        tipo_infracao: inf?.tipo || auto.tipo_infracao || null,
        base_legal: inf?.artigo || auto.base_legal || null,
        descricao_infracao: inf?.descricao || auto.descricao_detalhada || null,
        nome_fiscal: fisc?.nome || null,
        nome_contribuinte: contrib?.nome || contrib?.razao_social || null,
        cpf: contrib?.cpf || null,
        cnpj: contrib?.cnpj || null,
        rua: contrib?.rua || null,
        numero: contrib?.numero || null,
        bairro: contrib?.bairro || null
    };
}
// ROTA DE CRIAÇÃO (POST)
app.post('/api/autos', protegerRota, protegerPerfil('FISCAL'), async (req, res) => {
    const matricula = req.session.usuario?.matricula_fiscal;
    if (!matricula) return res.status(403).json({ mensagem: 'A sessão não está vinculada a uma matrícula de fiscal.' });
    try {
        const body = req.body || {};
        if (!body.numero_auto || !body.data_auto || !body.tipo_infracao || !body.base_legal) {
            return res.status(400).json({ mensagem: 'Informe número, data, tipo de infração e base legal.' });
        }
		const valorUfms = body.valor_base === undefined || body.valor_base === ''
    ? null
    : Number(body.valor_base);

if (valorUfms !== null && (!Number.isInteger(valorUfms) || valorUfms < 0)) {
    return res.status(400).json({
        mensagem: 'O valor da multa deve ser um número inteiro positivo, informado em UFMS.'
    });
}
        const contribuinte = await localizarOuCriarContribuinte(body);
        const contribuinteId = contribuinte.id;
        const auto = {
            ...camposAuto(body),
            id_auto: gerarIdAuto(),
            fk_fiscal_matricula: matricula,
            fk_contribuinte_id_contribuinte: contribuinteId,
            status_processo: body.status_processo || 'Em Aberto'
        };
        if (!STATUS_PROCESSO_VALIDOS.includes(auto.status_processo)) throw new Error('Status de processo inválido.');

        const { data: criado, error: autoErro } = await supabase.from('auto_infracao').insert(auto).select().single();
        if (autoErro) throw autoErro;

        const { error: infracaoErro } = await supabase.from('infracao').insert({
            id_infracao: require('crypto').randomUUID(),
            descricao: body.descricao_infracao || body.descricao_detalhada || null,
            tipo: body.tipo_infracao,
            artigo: body.base_legal,
           valor_base: valorUfms,
            fk_auto_infracao_id_auto: criado.id_auto
        });

        if (infracaoErro) {
            await supabase.from('auto_infracao').delete().eq('id_auto', criado.id_auto);
            throw infracaoErro;
        }

        // Retorna o objeto completo formatado
        const autoCompleto = await buscarAutoCompleto(criado.id_auto);
        return res.status(201).json({ ...autoCompleto, contribuinte_criado: contribuinte.criado });
    } catch (error) {
        console.error('Erro ao cadastrar auto:', error);
        return res.status(400).json({ mensagem: error.message || 'Não foi possível cadastrar o auto.' });
    }
});

// ROTA DE EDIÇÃO (PATCH)
app.patch('/api/autos/:id', protegerRota, protegerPerfil('FISCAL'), async (req, res) => {
    const matricula = req.session.usuario?.matricula_fiscal;
    if (!matricula) return res.status(403).json({ mensagem: 'Somente o fiscal responsável pode editar este auto.' });
    try {
        const payload = camposAuto(req.body || {});
		const valorUfms = req.body?.valor_base === undefined
    ? undefined
    : req.body.valor_base === ''
        ? null
        : Number(req.body.valor_base);

if (valorUfms !== undefined && valorUfms !== null &&
    (!Number.isInteger(valorUfms) || valorUfms < 0)) {
    return res.status(400).json({
        mensagem: 'O valor da multa deve ser um número inteiro positivo, informado em UFMS.'
    });
}

        const { data: autoAtual, error: buscaErro } = await supabase.from('auto_infracao').select('id_auto')
            .eq('id_auto', req.params.id).eq('fk_fiscal_matricula', matricula).maybeSingle();
        if (buscaErro) throw buscaErro;
        if (!autoAtual) return res.status(404).json({ mensagem: 'Auto não encontrado ou você não é o fiscal responsável.' });

        if (payload.status_processo && !STATUS_PROCESSO_VALIDOS.includes(payload.status_processo)) throw new Error('Status de processo inválido.');

        if (Object.keys(payload).length) {
            const { error } = await supabase.from('auto_infracao').update(payload).eq('id_auto', req.params.id).eq('fk_fiscal_matricula', matricula);
            if (error) throw error;
        }

        if (req.body?.tipo_infracao !== undefined || req.body?.base_legal !== undefined || req.body?.descricao_infracao !== undefined || req.body?.valor_base !== undefined) {
            const atualizacao = {};
            if (req.body.tipo_infracao !== undefined) atualizacao.tipo = req.body.tipo_infracao;
            if (req.body.base_legal !== undefined) atualizacao.artigo = req.body.base_legal;
            if (req.body.descricao_infracao !== undefined) atualizacao.descricao = req.body.descricao_infracao;
            if (valorUfms !== undefined) atualizacao.valor_base = valorUfms;

            const { data: inf, error: infBuscaErro } = await supabase.from('infracao').select('id_infracao').eq('fk_auto_infracao_id_auto', req.params.id).limit(1).maybeSingle();
            if (infBuscaErro) throw infBuscaErro;

            if (inf) {
                const { error } = await supabase.from('infracao').update(atualizacao).eq('id_infracao', inf.id_infracao);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('infracao').insert({ id_infracao: require('crypto').randomUUID(), fk_auto_infracao_id_auto: req.params.id, ...atualizacao });
                if (error) throw error;
            }
        }

        // Retorna o objeto completo atualizado
        const autoCompleto = await buscarAutoCompleto(req.params.id);
        return res.json(autoCompleto);
    } catch (error) {
        console.error('Erro ao editar auto:', error);
        return res.status(400).json({ mensagem: error.message || 'Não foi possível atualizar o auto.' });
    }
});

app.delete('/api/autos/:id', protegerRota, protegerPerfil('FISCAL'), async (req, res) => {
    const matricula = req.session.usuario?.matricula_fiscal;
    if (!matricula) return res.status(403).json({ mensagem: 'Somente o fiscal responsável pode excluir este auto.' });
    try {
        const { data, error } = await supabase.from('auto_infracao').delete()
            .eq('id_auto', req.params.id).eq('fk_fiscal_matricula', matricula).select('id_auto').maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ mensagem: 'Auto não encontrado ou você não é o fiscal responsável.' });
        return res.json({ mensagem: 'Auto excluído.', id_auto: data.id_auto });
    } catch (error) {
        console.error('Erro ao excluir auto:', error);
        return res.status(400).json({ mensagem: error.message || 'Não foi possível excluir o auto.' });
    }
});


// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor unificado rodando em: http://localhost:${PORT}`);
});
