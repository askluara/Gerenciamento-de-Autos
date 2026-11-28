(() => {
    const api = '/api/defesas';
    const cadastro = location.pathname.endsWith('/registrar');
    const $ = id => document.getElementById(id);
    const buscaAuto = $('busca-auto');
    const buscaDefesas = $('busca-defesas');
    const formulario = $('dados-defesa');
    const protocolo = formulario.elements.data_envio;
    const anexo = formulario.elements.documento;
    const editarModal = $('editar-modal');
    if (!cadastro) editarModal.append(formulario);
    let selecionado;
    let pagina = 1;
    let paginaAuto = 1;
    let filtroAuto = {};
    let pesquisandoAutos = false;
    let modoTeste = false;
    let filtros = {};
    let consultaAtual = 0;
    let administrador = false;
    let alterandoSituacao = false;
    let aberturaEdicao = 0;
    const maxArquivo = 10 * 1024 * 1024;

    document.body.dataset.currentPage = cadastro ? 'registrar-defesa' : 'gerenciar-defesas';
    const titulo = cadastro ? 'Registrar Defesa' : 'Gerenciar Defesas';
    document.title = `${titulo} | SIGAI`;
    $('titulo').textContent = titulo;
    $('descricao').textContent = cadastro
        ? 'Vincule uma defesa administrativa a um Auto de Infração.'
        : 'Consulte, corrija e gerencie a situação das defesas administrativas.';
    $('registrar').hidden = !cadastro;
    $('filtros').hidden = cadastro;
    $('listagem').hidden = cadastro;

    async function requisicao(url, opcoes) {
        const resposta = await fetch(url, opcoes);
        if (resposta.status === 401) {
            location.assign('/');
            throw new Error('Sua sessão expirou.');
        }
        const dados = await resposta.json();
        if (!resposta.ok) throw Object.assign(new Error(dados.mensagem || 'Não foi possível concluir a operação.'), { codigo: dados.codigo });
        return dados;
    }

    function escrever(id, texto, erro = false) {
        const alvo = $(id);
        alvo.textContent = texto || '';
        alvo.hidden = !texto;
        alvo.classList.toggle('erro', erro);
    }

    function enviar(metodo, dados) {
        return { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) };
    }

    function escapar(valor) {
        const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(valor ?? '').replace(/[&<>"']/g, caractere => mapa[caractere]);
    }

    function data(valor) {
        return valor ? escapar(String(valor).slice(0, 10).split('-').reverse().join('/')) : '—';
    }

    function status(valor) {
        return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    function julgado(auto) {
        return auto?.possui_parecer || ['deferido', 'indeferido', 'julgado'].includes(status(auto?.status_processo));
    }

    function encerrado(auto) {
        return ['encerrado com multa', 'arquivado'].includes(status(auto?.status_processo));
    }

    function aguardaDefesa(auto) {
        return ['em aberto', 'aguardando defesa'].includes(status(auto?.status_processo));
    }

    function emAnalise(auto) {
        return ['defesa apresentada', 'em analise'].includes(status(auto?.status_processo));
    }

    function tabela(cabecalhos, linhas) {
        return `<div class="defesa-tabela-wrap" tabindex="0" role="region" aria-label="Resultados da pesquisa"><table class="defesa-tabela">
            <thead><tr>${cabecalhos.map(campo => `<th scope="col">${campo}</th>`).join('')}</tr></thead>
            <tbody>${linhas.join('')}</tbody>
        </table></div>`;
    }

    function contribuinte(auto) {
        const pessoa = auto?.contribuinte;
        return `${escapar(pessoa?.nome || 'Não informado')}<small>${escapar(pessoa?.cpf || pessoa?.cnpj || '—')}</small>`;
    }

    function vazio(elemento, texto) {
        const item = document.createElement('p');
        item.className = 'defesa-vazio';
        item.textContent = texto;
        elemento.replaceChildren(item);
    }

    function acao(rotulo, indice, tipo, classe = '') {
        return `<button class="defesa-btn ${classe}" type="button" data-indice="${indice}" data-acao="${tipo}">${rotulo}</button>`;
    }

    function infracao(auto) {
        const item = Array.isArray(auto?.infracao) ? auto.infracao[0] : auto?.infracao;
        return item?.tipo || item?.descricao || 'Não informada';
    }

    function situacaoAuto(auto) {
        if (encerrado(auto)) return auto.status_processo;
        if (julgado(auto)) return 'Julgado';
        if (aguardaDefesa(auto)) return 'Aguardando Defesa';
        if (emAnalise(auto)) return 'Em Análise';
        return auto?.status_processo || 'Não informada';
    }

    function bloqueioCadastro(auto) {
        if (julgado(auto)) return 'Este auto já tem parecer ou foi julgado.';
        if (encerrado(auto)) return 'Este auto foi encerrado ou arquivado.';
        if (auto.possui_defesa) return 'Este auto já tem defesa. Consulte o registro em Gerenciar Defesas.';
        if (!modoTeste && !aguardaDefesa(auto)) return 'Para registrar uma defesa, o auto precisa estar Aguardando Defesa.';
        return '';
    }

    function mostrarResumoAuto(auto, motivo = '') {
        $('auto-selecionado').textContent = auto.numero_auto || auto.id_auto;
        const detalhes = [
            ['Contribuinte', escapar(auto.contribuinte?.nome || 'Não informado')],
            ['CPF/CNPJ', escapar(auto.contribuinte?.cpf || auto.contribuinte?.cnpj || '—')],
            ['Infração', escapar(infracao(auto))],
            ['Prazo legal', auto.prazo_defesa_ate ? `Até ${data(auto.prazo_defesa_ate)}` : '—']
        ];
        $('auto-detalhes').innerHTML = detalhes.map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>`).join('');
        $('resumo-auto').hidden = false;
        $('auto-status').textContent = situacaoAuto(auto);
        escrever('auto-bloqueio', motivo);
    }

    function selecionarAuto(auto) {
        if (formulario.querySelector('[type="submit"]').disabled) return;
        const motivo = bloqueioCadastro(auto);
        if (!motivo) return prepararFormulario(auto);
        fecharFormulario();
        mostrarResumoAuto(auto, motivo);
        $('resumo-auto').scrollIntoView({ block: 'start' });
        $('resumo-auto').focus({ preventScroll: true });
    }

    function atualizarContador() {
        const campo = formulario.elements.observacoes;
        $('observacoes-contador').textContent = `${campo.value.length}/${campo.maxLength}`;
    }

    formulario.elements.observacoes.maxLength = cadastro ? 1000 : 10000;
    formulario.elements.observacoes.addEventListener('input', atualizarContador);

    function prepararFormulario(auto, defesa) {
        selecionado = { auto, defesa };
        formulario.reset();
        protocolo.value = defesa?.data_envio?.slice(0, 10) || '';
        formulario.elements.observacoes.value = defesa?.observacoes ?? '';
        anexo.required = !defesa?.documento_nome && !defesa?.url_defesa?.trim();
        $('anexo-label').textContent = anexo.required ? 'Documento digitalizado da defesa *' : 'Substituir documento';
        $('anexo-atual').before($('upload-defesa'));
        $('anexo-atual').innerHTML = defesa ? documento(defesa, true) : '';
        $('form-titulo').textContent = defesa ? 'Editar Defesa' : 'Dados da Defesa';
        if (defesa) {
            $('editar-titulo').textContent = defesa.id_defesa;
            $('editar-auto').textContent = `Vinculada ao ${auto.numero_auto || auto.id_auto || defesa.id_auto}`;
            const campos = [
                ['Contribuinte', auto.contribuinte?.nome || 'Não informado'],
                ['CPF/CNPJ', auto.contribuinte?.cpf || auto.contribuinte?.cnpj || '—']
            ];
            $('editar-contribuinte').innerHTML = campos.map(([rotulo, valor]) =>
                `<div><span>${rotulo}</span><strong>${escapar(valor)}</strong></div>`).join('');
        } else {
            mostrarResumoAuto(auto);
        }
        atualizarContador();
        $('cancelar-edicao').textContent = defesa ? 'Cancelar' : 'Voltar';
        formulario.querySelector('[type="submit"]').textContent = defesa ? 'Salvar alterações' : 'Gravar Defesa';
        $('formulario').hidden = Boolean(defesa);
        const temAnexo = Boolean(defesa && documento(defesa, true));
        $('anexo-atual').classList.toggle('defesa-anexo-edicao', temAnexo);
        if (temAnexo) $('anexo-atual').append($('upload-defesa'));
        anexo.setAttribute('aria-label', temAnexo ? 'Substituir documento' : 'Selecionar documento');
        $('nome-arquivo').textContent = temAnexo ? 'Substituir' : 'Selecionar documento';

        formulario.querySelectorAll('[aria-invalid]').forEach(campo => campo.removeAttribute('aria-invalid'));
        escrever('form-erro', '');
        mostrarPrazo();
        if (defesa) {
            if (!editarModal.open) editarModal.showModal();
        } else {
            $('resumo-auto').scrollIntoView({ block: 'start' });
        }
        protocolo.focus({ preventScroll: true });
    }

    function fecharFormulario() {
        aberturaEdicao++;
        selecionado = null;
        if (editarModal.open) editarModal.close();
        $('formulario').hidden = true;
        $('resumo-auto').hidden = true;
    }

    function mostrarPrazo() {
        const prazo = selecionado?.auto.prazo_defesa_ate;
        escrever('prazo-alerta', !prazo ? '' : protocolo.value > prazo
            ? `Defesa fora do prazo. Data limite: ${data(prazo)}.`
            : `Prazo configurado para este auto: ${data(prazo)}.`);
    }

    $('cancelar-edicao').addEventListener('click', () => {
        fecharFormulario();
        if (cadastro) buscaAuto.elements.consulta.focus();
    });
    $('editar-fechar').addEventListener('click', () => {
        if (!formulario.querySelector('[type="submit"]').disabled) fecharFormulario();
    });
    editarModal.addEventListener('cancel', evento => {
        evento.preventDefault();
        if (!formulario.querySelector('[type="submit"]').disabled) fecharFormulario();
    });
    protocolo.addEventListener('input', mostrarPrazo);
    anexo.addEventListener('change', () => {
        $('nome-arquivo').textContent = anexo.files[0]?.name
            || ($('anexo-atual').classList.contains('defesa-anexo-edicao') ? 'Substituir' : 'Selecionar documento');
    });
    for (const campo of [protocolo, anexo]) {
        campo.addEventListener('input', () => campo.removeAttribute('aria-invalid'));
    }

    function renderAutos(autos, mensagem) {
        if (!autos.length) return vazio($('autos'), mensagem || 'Nenhum auto encontrado.');
        $('autos').innerHTML = tabela(['Auto', 'Contribuinte', 'Infração', 'Prazo', 'Situação do auto', 'Ações'], autos.map((auto, indice) => {
            const bloqueado = julgado(auto) || encerrado(auto);
            const elegivel = !bloqueioCadastro(auto);
            return `<tr>
                <td>${acao(escapar(auto.numero_auto || auto.id_auto), indice, 'selecionar', 'defesa-link')}
                    <small>Emitido em ${data(auto.data_auto)}</small></td>
                <td>${contribuinte(auto)}</td><td>${escapar(infracao(auto))}</td><td>${data(auto.prazo_defesa_ate)}</td>
                <td><span class="defesa-tag ${bloqueado ? 'erro' : elegivel ? 'aviso' : 'neutra'}">${escapar(situacaoAuto(auto))}</span></td>
                <td>${elegivel ? acao('Incluir defesa', indice, 'incluir', 'discreto') : auto.possui_defesa && !bloqueado
                    ? '<a class="defesa-anexo" href="/cadastro-defesa/gerenciar">Gerenciar defesa</a>'
                    : bloqueioCadastro(auto)}</td>
            </tr>`;
        }));
        $('autos').querySelectorAll('[data-indice]').forEach(botao => botao.addEventListener('click', () => selecionarAuto(autos[botao.dataset.indice])));
    }

    async function listarAutos(novaPagina = 1, preservarMensagem = false) {
        if (pesquisandoAutos) return;
        pesquisandoAutos = true;
        const botao = buscaAuto.querySelector('button');
        botao.disabled = true;
        $('paginacao-autos').hidden = true;
        if (!preservarMensagem) escrever('mensagem', '');
        escrever('fila-titulo', 'Carregando autos…');
        $('autos').replaceChildren();
        try {
            const { dados, mensagem, fila_vazia, modo_teste } = await requisicao(`${api}/autos?${new URLSearchParams({ ...filtroAuto, pagina: novaPagina })}`);
            modoTeste = modo_teste === true;
            escrever('modo-teste-defesa', modoTeste ? 'Modo de teste: o cadastro aceita outros estados do auto enquanto estiver sem defesa e sem parecer.' : '');
            paginaAuto = novaPagina;
            const tituloFila = Object.keys(filtroAuto).length ? 'Resultado da pesquisa' : 'Fila de autos disponíveis';
            escrever('fila-titulo', fila_vazia && dados.length ? mensagem : tituloFila);
            renderAutos(dados, mensagem);
            $('paginacao-autos').hidden = fila_vazia === true || (paginaAuto === 1 && dados.length < 50);
            $('auto-anterior').disabled = paginaAuto <= 1;
            $('auto-proxima').disabled = dados.length < 50;
        } catch (erro) {
            escrever('fila-titulo', '');
            if (preservarMensagem) vazio($('autos'), erro.message);
            else escrever('mensagem', erro.message, true);
        } finally {
            botao.disabled = false;
            pesquisandoAutos = false;
        }
    }

    buscaAuto.addEventListener('submit', evento => {
        evento.preventDefault();
        if (pesquisandoAutos || formulario.querySelector('[type="submit"]').disabled) return;
        fecharFormulario();
        const valor = buscaAuto.elements.consulta.value.trim();
        const numero = valor.replace(/[.\/\s-]/g, '');
        filtroAuto = !valor ? {} : /^(\d{11}|\d{14})$/.test(numero) ? { cpf_cnpj: valor } : { numero_auto: valor };
        listarAutos();
    });

    function paginarAutos(deslocamento) {
        if (formulario.querySelector('[type="submit"]').disabled) return;
        fecharFormulario();
        listarAutos(paginaAuto + deslocamento);
    }

    $('auto-anterior').addEventListener('click', () => paginarAutos(-1));
    $('auto-proxima').addEventListener('click', () => paginarAutos(1));

    function lerArquivo(arquivo) {
        return new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload = () => resolve({ nome: arquivo.name, conteudo_base64: leitor.result.split(',')[1] });
            leitor.onerror = () => reject(new Error('Não foi possível ler o documento.'));
            leitor.readAsDataURL(arquivo);
        });
    }

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();
        if (!selecionado) return;
        const { defesa, auto } = selecionado;
        const arquivo = anexo.files[0];
        const invalido = !protocolo.value ? protocolo : anexo.required && !arquivo ? anexo : null;
        if (invalido) {
            if (!protocolo.value) protocolo.setAttribute('aria-invalid', 'true');
            if (anexo.required && !arquivo) anexo.setAttribute('aria-invalid', 'true');
            escrever('form-erro', 'Preencha os campos obrigatórios para continuar.', true);
            invalido.focus();
            return;
        }
        if (arquivo && (!arquivo.size || arquivo.size > maxArquivo)) {
            anexo.setAttribute('aria-invalid', 'true');
            escrever('form-erro', 'Selecione um documento com conteúdo e tamanho de até 10 MiB.', true);
            anexo.focus();
            return;
        }

        const botao = formulario.querySelector('[type="submit"]');
        botao.disabled = true;
        $('cancelar-edicao').disabled = true;
        $('editar-fechar').disabled = true;
        escrever('form-erro', '');
        try {
            const corpo = { data_envio: protocolo.value, observacoes: formulario.elements.observacoes.value };
            if (arquivo) corpo.documento = await lerArquivo(arquivo);
            if (!defesa) corpo.id_auto = auto.id_auto;
            const url = defesa ? `${api}/${encodeURIComponent(defesa.id_defesa)}` : api;
            const metodo = defesa ? 'PATCH' : 'POST';
            let resultado;
            try {
                resultado = await requisicao(url, enviar(metodo, corpo));
            } catch (erro) {
                if (erro.codigo !== 'DEFESA_FORA_PRAZO') throw erro;
                if (defesa) editarModal.close();
                const confirmado = await confirmarModal(erro.message, { titulo: 'Defesa fora do prazo' });
                if (defesa) editarModal.showModal();
                if (!confirmado) return;
                resultado = await requisicao(url, enviar(metodo, { ...corpo, confirmar_fora_prazo: true }));
            }
            fecharFormulario();
            escrever('mensagem', resultado.mensagem);
            if (cadastro) await listarAutos(1, true);
            else await listar(pagina, true);
            $('mensagem').focus();
        } catch (erro) {
            escrever('form-erro', erro.message, true);
        } finally {
            botao.disabled = false;
            $('cancelar-edicao').disabled = false;
            $('editar-fechar').disabled = false;
        }
    });

    function documento(defesa, atual = false) {
        const prefixo = atual ? '<span class="defesa-anexo-legenda">Documento atual</span>' : '';
        if (defesa.documento_nome) {
            const url = `${api}/${encodeURIComponent(defesa.id_defesa)}/documento`;
            return `<div><a class="defesa-anexo" href="${url}">${escapar(defesa.documento_nome)}</a>${prefixo}</div>`;
        }
        if (/^https?:\/\//i.test(defesa.url_defesa || '')) {
            return `<div><a class="defesa-anexo" href="${escapar(defesa.url_defesa)}" target="_blank" rel="noopener noreferrer">Abrir documento</a>${prefixo}</div>`;
        }
        return atual ? '' : '—';
    }

    async function mudarSituacao(defesa, botao) {
        if (alterandoSituacao) return;
        alterandoSituacao = true;
        const ativar = defesa.ativa === false;
        const rotulo = ativar ? 'Ativar defesa' : 'Inativar defesa';
        botao.disabled = true;
        try {
            const texto = ativar
                ? 'Deseja ativar esta defesa? O auto retornará para “Em Análise”.'
                : 'Deseja inativar esta defesa? O auto retornará para “Aguardando Defesa” quando ela for a última defesa ativa. Você poderá reativá-la nesta tela.';
            if (!await confirmarModal(texto, { titulo: rotulo, tipo: ativar ? 'info' : 'danger' })) return;
            const resposta = await requisicao(`${api}/${encodeURIComponent(defesa.id_defesa)}/situacao`, enviar('PATCH', { ativa: ativar }));
            if (selecionado?.defesa?.id_defesa === defesa.id_defesa) fecharFormulario();
            escrever('mensagem', resposta.mensagem);
            await listar(pagina, true);
            $('mensagem').focus();
        } catch (erro) {
            escrever('mensagem', erro.message, true);
        } finally {
            alterandoSituacao = false;
            botao.disabled = false;
        }
    }

    function bloqueioEdicao(defesa) {
        if (julgado(defesa.auto)) return 'A defesa está bloqueada porque o auto já tem parecer ou foi julgado.';
        if (encerrado(defesa.auto)) return 'A defesa está bloqueada porque o auto foi encerrado ou arquivado.';
        if (defesa.ativa === false) return 'Ative a defesa antes de editar.';
        if (!emAnalise(defesa.auto)) {
            return 'A edição fica disponível quando o auto está Em Análise.';
        }
        return '';
    }

    async function abrirEdicao(defesa, botao) {
        const bloqueio = bloqueioEdicao(defesa);
        if (bloqueio) {
            escrever('mensagem', bloqueio, true);
            $('mensagem').focus();
            return;
        }
        const abertura = ++aberturaEdicao;
        botao.disabled = true;
        escrever('mensagem', '');
        try {
            const { dados } = await requisicao(`${api}/${encodeURIComponent(defesa.id_defesa)}`);
            if (abertura !== aberturaEdicao) return;
            const atual = { ...defesa, ...dados, auto: { ...defesa.auto, ...dados.auto } };
            const motivo = bloqueioEdicao(atual);
            if (motivo) throw new Error(motivo);
            prepararFormulario(atual.auto, atual);
        } catch (erro) {
            if (abertura !== aberturaEdicao) return;
            escrever('mensagem', erro.message, true);
            $('mensagem').focus();
        } finally {
            botao.disabled = false;
        }
    }

    function renderDefesas(defesas, mensagem) {
        if (!defesas.length) return vazio($('resultados'), mensagem || 'Nenhuma defesa encontrada.');
        $('resultados').innerHTML = tabela(['Defesa / Auto', 'Contribuinte', 'Protocolo', 'Documento', 'Situação da defesa / auto', 'Ações'], defesas.map((defesa, indice) => {
            const auto = defesa.auto;
            const inativa = defesa.ativa === false;
            const bloqueada = julgado(auto) || encerrado(auto);
            const motivo = bloqueioEdicao(defesa);
            const podeMudar = administrador && !bloqueada && (emAnalise(auto) || (inativa && aguardaDefesa(auto)));
            const rotulo = inativa ? 'Inativa' : defesa.fora_prazo ? 'Ativa · fora do prazo' : 'Ativa';
            return `<tr>
                <td>${acao(escapar(defesa.id_defesa), indice, 'editar', 'defesa-link')}<small>${escapar(auto?.numero_auto || defesa.id_auto)}</small></td>
                <td>${contribuinte(auto)}</td><td>${data(defesa.data_envio)}</td><td>${documento(defesa)}</td>
                <td><div class="defesa-situacoes">
                    <span class="defesa-tag ${inativa ? 'neutra' : defesa.fora_prazo ? 'aviso' : ''}">${escapar(rotulo)}</span>
                    <small>Auto: ${escapar(situacaoAuto(auto))}</small>
                </div></td>
                <td><div class="defesa-acoes">
                    ${!motivo ? acao('Editar', indice, 'editar', 'discreto') : ''}
                    ${podeMudar ? acao(inativa ? 'Ativar' : 'Inativar', indice, 'situacao', inativa ? 'discreto' : 'inativar') : ''}
                    </div>
                ${motivo ? `<small>${escapar(motivo)}</small>` : ''}</td></tr>`;
        }));
        $('resultados').querySelectorAll('[data-indice]').forEach(botao => {
            const defesa = defesas[botao.dataset.indice];
            botao.addEventListener('click', () => {
                if (formulario.querySelector('[type="submit"]').disabled) return;
                if (botao.dataset.acao === 'editar') abrirEdicao(defesa, botao);
                else mudarSituacao(defesa, botao);
            });
        });
    }

    async function listar(novaPagina = 1, preservarMensagem = false) {
        const consulta = ++consultaAtual;
        if (!preservarMensagem) escrever('mensagem', '');
        $('total').textContent = 'Carregando…';
        $('paginacao').hidden = true;
        if (!preservarMensagem) $('resultados').replaceChildren();
        try {
            const { dados, mensagem } = await requisicao(`${api}?${new URLSearchParams({ ...filtros, pagina: novaPagina })}`);
            if (consulta !== consultaAtual) return;
            pagina = novaPagina;
            renderDefesas(dados, mensagem);
            $('total').textContent = `${dados.length} ${dados.length === 1 ? 'registro nesta página' : 'registros nesta página'}`;
            $('paginacao').hidden = pagina === 1 && dados.length < 50;
            $('anterior').disabled = pagina <= 1;
            $('proxima').disabled = dados.length < 50;
        } catch (erro) {
            if (consulta !== consultaAtual) return;
            $('total').textContent = '';
            vazio($('resultados'), erro.message);
        }
    }

    for (const busca of [buscaAuto, buscaDefesas]) {
        busca.addEventListener('keydown', evento => {
            if (evento.key !== 'Enter' || evento.isComposing || evento.defaultPrevented
                || evento.target.tagName !== 'INPUT') return;
            evento.preventDefault();
            if (!evento.repeat) busca.requestSubmit();
        });
    }

    buscaDefesas.addEventListener('submit', evento => {
        evento.preventDefault();
        filtros = Object.fromEntries([...new FormData(buscaDefesas)].map(([chave, valor]) => [chave, valor.trim()]).filter(([, valor]) => valor));
        listar();
    });
    buscaDefesas.addEventListener('reset', () => {
        filtros = {};
        listar();
    });
    $('anterior').addEventListener('click', () => listar(pagina - 1));
    $('proxima').addEventListener('click', () => listar(pagina + 1));

    requisicao('/api/verificar-sessao').then(sessao => {
        if (!sessao.logado) return location.assign('/');
        const nome = sessao.usuario?.login || 'Usuário';
        administrador = sessao.usuario?.perfil === 'ADMINISTRADOR';
        $('usuario').textContent = nome;
        $('perfil').textContent = administrador ? 'Administrador' : 'Analista';
        $('avatar').textContent = nome.charAt(0).toUpperCase();
        if (cadastro) {
            if (!pesquisandoAutos && !$('fila-titulo').textContent) listarAutos();
        } else if (consultaAtual === 0 || administrador) {
            listar(pagina, consultaAtual > 0);
        }
    }).catch(erro => escrever('mensagem', erro.message, true));
})();
