const express = require('express');
const DefesaService = require('./DefesaService');

module.exports = function criarRotasDefesa(supabase, protegerPerfil) {
    const router = express.Router();
    const defesas = new DefesaService(supabase);

    router.use((req, res, next) => {
        if (req.session.usuarioLogado) return next();
        return res.status(401).json({ sucesso: false, mensagem: 'Autenticação obrigatória.' });
    });
    router.use(protegerPerfil('ANALISTA', 'ADMINISTRADOR'));
    router.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });

    const json = express.json({ limit: '14mb' });
    router.get('/autos', async (req, res) => {
        const semFiltros = !req.query.numero_auto?.trim?.() && !req.query.cpf_cnpj?.trim?.();
        const dados = await defesas.pesquisar(req.query, true);
        const primeiraPagina = Number(req.query.pagina ?? 1) === 1;
        if (semFiltros && primeiraPagina && !dados.length) {
            const outrosAutos = await defesas.pesquisar(req.query, true, { listarTodos: true });
            return res.json({
                sucesso: true,
                dados: outrosAutos,
                fila_vazia: true,
                modo_teste: defesas.modoTeste,
                mensagem: outrosAutos.length
                    ? 'Nenhum auto está apto a receber defesa. Confira abaixo a situação dos autos cadastrados.'
                    : 'Nenhum auto de infração cadastrado.'
            });
        }
        res.json({
            sucesso: true,
            dados,
            modo_teste: defesas.modoTeste,
            mensagem: dados.length ? undefined : 'Nenhum auto encontrado nesta página.'
        });
    });
    router.get('/', async (req, res) => {
        const dados = await defesas.pesquisar(req.query);
        res.json({
            sucesso: true,
            dados,
            mensagem: dados.length ? undefined : 'Nenhum registro encontrado para os critérios informados. Verifique os dados e tente novamente.'
        });
    });
    router.get('/:id/documento', async (req, res) => {
        const documento = await defesas.consultar(req.params.id, true);
        res.attachment(documento.nome);
        res.set('Content-Type', 'application/octet-stream');
        res.set('X-Content-Type-Options', 'nosniff');
        res.send(Buffer.from(documento.conteudo_base64, 'base64'));
    });
    router.get('/:id', async (req, res) => {
        const dados = await defesas.consultar(req.params.id);
        res.json({ sucesso: true, dados });
    });
    router.post('/', json, async (req, res) => {
        const dados = await defesas.gravar('cadastrar', null, req.body, req.session.usuario);
        res.status(201).json({ sucesso: true, dados, mensagem: 'Defesa registrada com sucesso!' });
    });
    router.patch('/:id', json, async (req, res) => {
        const dados = await defesas.gravar('editar', req.params.id, req.body, req.session.usuario);
        res.json({ sucesso: true, dados, mensagem: 'Defesa atualizada com sucesso!' });
    });
    router.patch('/:id/situacao', protegerPerfil('ADMINISTRADOR'), json, async (req, res) => {
        if (typeof req.body?.ativa !== 'boolean') {
            return res.status(400).json({ sucesso: false, mensagem: 'Informe a situação da defesa.' });
        }
        const ativa = req.body.ativa;
        await defesas.gravar(ativa ? 'ativar' : 'inativar', req.params.id, null, req.session.usuario);
        res.json({ sucesso: true, mensagem: ativa ? 'Defesa ativada com sucesso!' : 'Defesa inativada com sucesso!' });
    });

    router.use((erro, req, res, next) => {
        if (res.headersSent) return next(erro);
        if (erro.status === 400 || erro.status === 404 || erro.status === 409) {
            const mensagem = erro.type === 'entity.parse.failed' ? 'JSON inválido.' : erro.message;
            return res.status(erro.status).json({ sucesso: false, mensagem, codigo: erro.codigo });
        }
        if (erro.status === 413) {
            return res.status(413).json({ sucesso: false, mensagem: 'O documento deve ter até 10 MiB.' });
        }
        const codigo = /^[A-Z0-9]{5,8}$/.test(erro.code || '') ? erro.code : undefined;
        console.error('Erro no módulo de defesas:', req.method, req.route?.path, codigo || erro.name);
        const mensagem = codigo
            ? `O banco recusou a operação de defesa (código ${codigo}).`
            : 'Não foi possível concluir a operação de defesa. Verifique a conexão e tente novamente.';
        return res.status(500).json({ sucesso: false, mensagem });
    });

    return router;
};
