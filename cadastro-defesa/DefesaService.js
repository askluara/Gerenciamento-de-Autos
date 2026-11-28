const { Buffer } = require('node:buffer');

const OBRIGATORIOS = 'Erro: Preencha todos os campos obrigatórios para continuar.';
const MAX_DOCUMENTO = 10 * 1024 * 1024;

function erroValidacao(mensagem) {
    return Object.assign(new Error(mensagem), { status: 400 });
}

function dataValida(valor) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) {
        return false;
    }
    const data = new Date(valor);
    return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function textoOpcional(valor, campo, limite) {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== 'string' || valor.length > limite || valor.includes('\0')) {
        throw erroValidacao(`Valor inválido para ${campo}.`);
    }
    return valor.trim() || null;
}

function documentoValido(documento) {
    const base64 = documento?.conteudo_base64;
    const nome = textoOpcional(documento?.nome, 'documento.nome', 255);
    if (!nome || !base64) throw erroValidacao(OBRIGATORIOS);
    if (typeof base64 !== 'string' || base64.length > Math.ceil(MAX_DOCUMENTO / 3) * 4) {
        throw erroValidacao('O documento deve ter até 10 MiB.');
    }
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > MAX_DOCUMENTO || bytes.toString('base64') !== base64) {
        throw erroValidacao('Envie o documento em Base64 válido, com até 10 MiB.');
    }
    return { nome, conteudo_base64: base64 };
}

class DefesaService {
    constructor(supabase) {
        this.supabase = supabase;
        this.modoTeste = process.env.DEFESA_MODO_TESTE === 'true';
    }

    async executar(funcao, parametros) {
        const { data, error } = await this.supabase.rpc(funcao, parametros);
        if (error) {
            const status = { PT400: 400, PT404: 404, PT409: 409 }[error.code];
            if (status) {
                const codigo = error.details === 'DEFESA_FORA_PRAZO' ? error.details : undefined;
                throw Object.assign(new Error(error.message), { status, codigo });
            }
            throw error;
        }
        return data;
    }

    async filaAutos(pagina) {
        const inicio = (pagina - 1) * 50;
        const consulta = this.supabase.from('auto_infracao')
            .select(`id_auto, numero_auto, data_auto, status_processo, prazo_defesa_ate,
                contribuinte:fk_contribuinte_id_contribuinte (nome, cpf, cnpj),
                infracao (tipo, descricao), defesas:defesa(), pareceres:parecer()`)
            .is('defesas', null)
            .is('pareceres', null)
            .order('data_auto', { ascending: false, nullsFirst: false })
            .order('id_auto');
        if (this.modoTeste) consulta.not('status_processo', 'in', '("Encerrado com Multa","Arquivado")');
        else consulta.eq('status_processo', 'Em Aberto');
        const { data, error } = await consulta.range(inicio, inicio + 49);
        if (error) throw error;
        return data.map(auto => {
            const emissao = auto.data_auto?.slice(0, 10);
            let prazo = auto.prazo_defesa_ate;
            if (!prazo && dataValida(emissao)) {
                const limite = new Date(emissao);
                limite.setUTCDate(limite.getUTCDate() + 10);
                prazo = limite.toISOString().slice(0, 10);
            }
            return { ...auto, prazo_defesa_ate: prazo };
        });
    }

    async pesquisar(filtros, apenasAutos = false, { listarTodos = false } = {}) {
        const numero = textoOpcional(filtros.numero_auto, 'numero_auto', 100);
        const documento = textoOpcional(filtros.cpf_cnpj, 'cpf_cnpj', 30)?.replace(/[.\/\s-]/g, '');
        if (documento !== undefined && !/^(\d{11}|\d{14})$/.test(documento)) {
            throw erroValidacao('Informe um CPF ou CNPJ válido.');
        }

        const inicio = filtros.data_inicio ?? null;
        const fim = filtros.data_fim ?? null;
        if ((inicio !== null && !dataValida(inicio)) || (fim !== null && !dataValida(fim))
            || (inicio && fim && inicio > fim)) {
            throw erroValidacao('Informe um período de protocolo válido.');
        }
        const pagina = Number(filtros.pagina ?? 1);
        if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 1000000) {
            throw erroValidacao('Informe uma página válida.');
        }

        if (apenasAutos && !numero && !documento && !listarTodos) return this.filaAutos(pagina);

        const registros = await this.executar('gd_pesquisar', {
            p_apenas_autos: apenasAutos,
            p_numero: numero,
            p_documento: documento ?? null,
            p_nome: textoOpcional(filtros.nome_contribuinte, 'nome_contribuinte', 200),
            p_inicio: inicio,
            p_fim: fim,
            p_pagina: pagina
        });
        if (!apenasAutos || !registros.length) return registros;

        const { data, error } = await this.supabase.from('auto_infracao')
            .select('id_auto, infracao (tipo, descricao)')
            .in('id_auto', registros.map(auto => auto.id_auto));
        if (error) throw error;
        const infracoes = new Map(data.map(auto => [auto.id_auto, auto.infracao]));
        return registros.map(auto => ({ ...auto, infracao: infracoes.get(auto.id_auto) }));
    }

    consultar(id, documento = false) {
        return this.executar('gd_consultar', { p_id: id, p_documento: documento });
    }

    gravar(acao, id, corpo, usuario) {
        const dados = {};
        if (acao === 'cadastrar' || acao === 'editar') {
            corpo ??= {};
            if (acao === 'cadastrar') {
                const idAuto = corpo.id_auto;
                if ((typeof idAuto !== 'string' && !Number.isSafeInteger(idAuto)) || !String(idAuto).trim()) {
                    throw erroValidacao(OBRIGATORIOS);
                }
                dados.id_auto = String(idAuto).trim();
                if (this.modoTeste) dados.ignorar_status_para_teste = true;
            }

            if (acao === 'cadastrar' || Object.hasOwn(corpo, 'data_envio')) {
                if (!corpo.data_envio) throw erroValidacao(OBRIGATORIOS);
                if (!dataValida(corpo.data_envio)) throw erroValidacao('Informe uma data de protocolo válida.');
                dados.data_envio = corpo.data_envio;
            }
            if (Object.hasOwn(corpo, 'observacoes')) {
                dados.observacoes = textoOpcional(corpo.observacoes, 'observacoes', 10000);
            }
            if (acao === 'cadastrar' || Object.hasOwn(corpo, 'documento')) {
                dados.documento = documentoValido(corpo.documento);
            }
            if (!Object.keys(dados).length) throw erroValidacao('Informe os dados a atualizar.');
            dados.confirmar_fora_prazo = corpo.confirmar_fora_prazo === true;
        }

        const ator = usuario.matricula_admin ?? usuario.matricula_analista
            ?? usuario.matricula_coordenador ?? usuario.matricula_fiscal ?? usuario.login;
        return this.executar('gd_gravar', { p_acao: acao, p_id: id, p_dados: dados, p_ator: String(ator ?? '') });
    }
}

module.exports = DefesaService;
