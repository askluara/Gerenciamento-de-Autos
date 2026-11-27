// =========================================================
// ESTADO DA PÁGINA
// =========================================================
let autosPendentes = [];
let todasMultas = [];
let autoSelecionado = null;
let multaSelecionada = null;

// =========================================================
// INICIALIZAÇÃO E VALIDAÇÃO DE SESSÃO
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respostaSessao = await fetch('/api/verificar-sessao', { credentials: 'include' });
        if (!respostaSessao.ok) throw new Error(`Erro HTTP: ${respostaSessao.status}`);

        const dados = await respostaSessao.json();
        if (!dados.logado) {
            window.location.href = '/';
            return;
        }

        const matricula = dados.usuario?.login || 'Usuário';
        const perfil = dados.usuario?.perfil || 'Cargo';

        const elNome = document.getElementById('nome-usuario');
        const elAvatar = document.getElementById('avatar-letra');
        const elCargo = document.getElementById('cargo-usuario');

        if (elNome) elNome.innerText = matricula;
        if (elAvatar) elAvatar.innerText = perfil.charAt(0).toUpperCase();
        if (elCargo) elCargo.innerText = perfil;
    } catch (error) {
        console.error('Erro na sessão:', error.message);
        window.location.href = '/';
        return;
    }

    configurarAbas();
    configurarEventos();
});

window.addEventListener('load', () => {
    setTimeout(() => {
        carregarPendentes();
        carregarMultas();
    }, 400);
});

// =========================================================
// UTILITÁRIOS DE FORMATAÇÃO E NOTIFICAÇÃO
// =========================================================
function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const partes = String(dataStr).split('T')[0].split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function dataMaisDias(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
}

async function notificarSucesso(msg) {
    if (typeof concluirAcao === 'function') {
        await concluirAcao(msg);
    } else if (typeof abrirModal === 'function') {
        abrirModal(msg);
    } else {
        alert(msg);
    }
}

function notificarErro(msg) {
    if (typeof abrirModal === 'function') {
        abrirModal(msg);
    } else {
        alert(msg);
    }
}

// =========================================================
// ABAS
// =========================================================
function configurarAbas() {
    const botoes = document.querySelectorAll('.multas-tab');
    const abaPendentes = document.getElementById('aba-pendentes');
    const abaEmitidas = document.getElementById('aba-emitidas');

    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            botoes.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');

            const alvo = btn.dataset.tab;
            abaPendentes.hidden = alvo !== 'pendentes';
            abaEmitidas.hidden = alvo !== 'emitidas';
        });
    });
}

// =========================================================
// ABA 1: AUTOS PENDENTES DE MULTA
// =========================================================
async function carregarPendentes() {
    const tbody = document.getElementById('tabela-pendentes');
    try {
        const resp = await fetch('/api/multas/pendentes', { credentials: 'include' });
        if (!resp.ok) throw new Error('Erro ao carregar autos pendentes');
        autosPendentes = await resp.json();
        renderizarPendentes(autosPendentes);
    } catch (erro) {
        console.error(erro);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar autos pendentes.</td></tr>';
        }
    }
}

function renderizarPendentes(lista) {
    const tbody = document.getElementById('tabela-pendentes');
    if (!tbody) return;

    tbody.innerHTML = '';
    autoSelecionado = null;
    document.getElementById('painel-emissao').hidden = true;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum auto pendente para emissão de multa.</td></tr>';
        return;
    }

    lista.forEach(auto => {
        const tr = document.createElement('tr');
        tr.dataset.id = auto.id_auto;
        tr.innerHTML = `
            <td><strong>${auto.numero_auto}</strong></td>
            <td>${auto.contribuinte}</td>
            <td>${auto.descricao_infracao}</td>
            <td>${auto.ufms}</td>
            <td><strong>${formatarMoeda(auto.valor_calculado)}</strong></td>
            <td>${auto.status_processo || '-'}</td>
        `;
        tr.addEventListener('click', () => selecionarAuto(auto));
        tbody.appendChild(tr);
    });
}

function selecionarAuto(auto) {
    autoSelecionado = auto;
    document.querySelectorAll('#tabela-pendentes tr[data-id]').forEach(tr => {
        tr.classList.toggle('is-selected', tr.dataset.id === String(auto.id_auto));
    });

    document.getElementById('auto-selecionado-label').textContent =
        `Auto selecionado: ${auto.numero_auto} — ${auto.contribuinte} (${auto.ufms} UFMs)`;
    document.getElementById('input-valor-emissao').value = Number(auto.valor_calculado || 0).toFixed(2);
    document.getElementById('input-vencimento-emissao').value = dataMaisDias(30);
    document.getElementById('painel-emissao').hidden = false;
}

async function emitirMulta() {
    if (!autoSelecionado) return;

    const valor = document.getElementById('input-valor-emissao').value;
    const data_vencimento = document.getElementById('input-vencimento-emissao').value;

    if (!valor || Number(valor) <= 0) {
        notificarErro('Informe um valor válido para a multa.');
        return;
    }
    if (!data_vencimento) {
        notificarErro('Informe a data de vencimento da multa.');
        return;
    }

    try {
        const resp = await fetch('/api/multas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                fk_auto_infracao_id_auto: autoSelecionado.id_auto,
                valor: Number(valor),
                data_vencimento
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.mensagem || 'Erro ao emitir multa.');
        }

        await notificarSucesso('Multa emitida com sucesso!');
        await carregarPendentes();
        await carregarMultas();
    } catch (erro) {
        console.error(erro);
        notificarErro(`❌ ${erro.message}`);
    }
}

// =========================================================
// ABA 2: MULTAS EMITIDAS
// =========================================================
async function carregarMultas() {
    const tbody = document.getElementById('tabela-multas');
    try {
        const resp = await fetch('/api/multas', { credentials: 'include' });
        if (!resp.ok) throw new Error('Erro ao carregar multas');
        todasMultas = await resp.json();
        renderizarMultas(todasMultas);
    } catch (erro) {
        console.error(erro);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Erro ao carregar multas emitidas.</td></tr>';
        }
    }
}

function renderizarMultas(lista) {
    const tbody = document.getElementById('tabela-multas');
    if (!tbody) return;

    tbody.innerHTML = '';
    multaSelecionada = null;
    document.getElementById('painel-acoes-multa').hidden = true;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhuma multa encontrada.</td></tr>';
        return;
    }

    lista.forEach(multa => {
        const statusNorm = (multa.status || 'Emitida').toLowerCase();
        const classeBadge = statusNorm === 'paga'
            ? 'status-paga'
            : statusNorm === 'cancelada'
                ? 'status-cancelada'
                : 'status-emitida';

        const tr = document.createElement('tr');
        tr.dataset.id = multa.id_multa;
        tr.innerHTML = `
            <td><strong>${multa.id_multa}</strong></td>
            <td>${multa.numero_auto || '-'}</td>
            <td>${multa.contribuinte || '-'}</td>
            <td><strong>${formatarMoeda(multa.valor)}</strong></td>
            <td>${formatarData(multa.data_emissao)}</td>
            <td>${formatarData(multa.data_vencimento)}</td>
            <td><span class="status-badge ${classeBadge}">${multa.status || 'Emitida'}</span></td>
        `;
        tr.addEventListener('click', () => selecionarMulta(multa));
        tbody.appendChild(tr);
    });
}

function selecionarMulta(multa) {
    multaSelecionada = multa;
    document.querySelectorAll('#tabela-multas tr[data-id]').forEach(tr => {
        tr.classList.toggle('is-selected', tr.dataset.id === String(multa.id_multa));
    });

    document.getElementById('multa-selecionada-label').textContent =
        `Selecionada: ${multa.id_multa} (Auto ${multa.numero_auto}) — ${multa.contribuinte} | Status: ${multa.status || 'Emitida'}`;

    document.getElementById('form-edicao-multa').hidden = true;
    document.getElementById('form-cancelamento-multa').hidden = true;
    document.getElementById('painel-acoes-multa').hidden = false;
}

async function atualizarMulta(payload, mensagemSucesso) {
    if (!multaSelecionada) return;

    try {
        const resp = await fetch(`/api/multas/${multaSelecionada.id_multa}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.mensagem || 'Erro ao atualizar multa.');
        }

        await notificarSucesso(mensagemSucesso);
        await carregarMultas();
        await carregarPendentes();
    } catch (erro) {
        console.error(erro);
        notificarErro(`❌ ${erro.message}`);
    }
}

// =========================================================
// EVENTOS DOS BOTÕES E FILTROS
// =========================================================
function configurarEventos() {
    // Emissão
    document.getElementById('btn-confirmar-emissao')?.addEventListener('click', emitirMulta);
    document.getElementById('btn-cancelar-selecao-auto')?.addEventListener('click', () => {
        autoSelecionado = null;
        document.querySelectorAll('#tabela-pendentes tr').forEach(tr => tr.classList.remove('is-selected'));
        document.getElementById('painel-emissao').hidden = true;
    });

    // Filtros da tabela de multas
    document.getElementById('form-filtro-multas')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = (document.getElementById('filtro-texto-multa')?.value || '').toLowerCase().trim();
        const status = (document.getElementById('filtro-status-multa')?.value || '').toLowerCase().trim();

        const filtradas = todasMultas.filter(m => {
            const alvoTexto = `${m.id_multa} ${m.numero_auto} ${m.contribuinte}`.toLowerCase();
            const statusMulta = (m.status || 'emitida').toLowerCase();
            return alvoTexto.includes(texto) && (!status || statusMulta === status);
        });
        renderizarMultas(filtradas);
    });

    document.getElementById('btn-limpar-filtro-multa')?.addEventListener('click', () => {
        document.getElementById('form-filtro-multas').reset();
        renderizarMultas(todasMultas);
    });

    // Visualizar / Imprimir DAM
    document.getElementById('btn-visualizar-dam')?.addEventListener('click', () => {
        if (!multaSelecionada) return;
        abrirVisualizacaoDAM(multaSelecionada);
    });

    // Marcar como Paga
    document.getElementById('btn-marcar-paga')?.addEventListener('click', () => {
        atualizarMulta({ status: 'Paga' }, 'Multa marcada como Paga!');
    });

    // Abrir Edição
    document.getElementById('btn-abrir-edicao-multa')?.addEventListener('click', () => {
        if (!multaSelecionada) return;
        document.getElementById('form-cancelamento-multa').hidden = true;
        document.getElementById('edit-valor-multa').value = Number(multaSelecionada.valor || 0).toFixed(2);
        document.getElementById('edit-vencimento-multa').value = (multaSelecionada.data_vencimento || '').split('T')[0];
        document.getElementById('form-edicao-multa').hidden = false;
    });

    document.getElementById('btn-salvar-edicao-multa')?.addEventListener('click', () => {
        const valor = document.getElementById('edit-valor-multa').value;
        const data_vencimento = document.getElementById('edit-vencimento-multa').value;
        atualizarMulta({ valor: Number(valor), data_vencimento }, 'Multa atualizada com sucesso!');
    });

    // Abrir Cancelamento
    document.getElementById('btn-abrir-cancelamento-multa')?.addEventListener('click', () => {
        if (!multaSelecionada) return;
        document.getElementById('form-edicao-multa').hidden = true;
        document.getElementById('input-motivo-cancelamento').value = multaSelecionada.motivo_cancelamento || '';
        document.getElementById('form-cancelamento-multa').hidden = false;
    });

    document.getElementById('btn-confirmar-cancelamento')?.addEventListener('click', () => {
        const motivo = document.getElementById('input-motivo-cancelamento').value.trim();
        atualizarMulta(
            { status: 'Cancelada', motivo_cancelamento: motivo || 'Cancelada pelo administrador' },
            'Multa cancelada e auto devolvido para julgamento.'
        );
    });
}

// =========================================================
// VISUALIZAÇÃO / IMPRESSÃO DO DAM (PDF)
// =========================================================
function abrirVisualizacaoDAM(multa) {
    const numLimpo = String(multa.id_multa || '000').replace(/\D/g, '').padStart(6, '0');
    const linhaDigitavel = `81660000000-4 ${numLimpo}0001-2 20260000000-8 00000000000-1`;

    const janela = window.open('', '_blank', 'width=850,height=700');
    if (!janela) {
        notificarErro('Permita pop-ups no navegador para visualizar o DAM.');
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>DAM - ${multa.id_multa}</title>
            <style>
                body { font-family: Arial, sans-serif; color: #1e293b; padding: 30px; max-width: 780px; margin: 0 auto; }
                .dam-box { border: 2px solid #0f172a; border-radius: 6px; padding: 24px; }
                .dam-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
                .dam-header h1 { font-size: 18px; margin: 0; text-transform: uppercase; }
                .dam-header p { font-size: 12px; margin: 4px 0 0; color: #475569; }
                .dam-tag { font-size: 14px; font-weight: bold; border: 1px solid #0f172a; padding: 6px 12px; border-radius: 4px; }
                .dam-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
                .dam-field { border: 1px solid #cbd5e1; padding: 10px; border-radius: 4px; }
                .dam-field span { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .dam-field strong { font-size: 14px; }
                .dam-valor { background: #f8fafc; border: 2px solid #0f172a; }
                .dam-valor strong { font-size: 18px; color: #0f172a; }
                .dam-barcode-area { border-top: 2px dashed #64748b; margin-top: 20px; padding-top: 16px; text-align: center; }
                .linha-digitavel { font-family: monospace; font-size: 15px; letter-spacing: 1px; margin-bottom: 12px; font-weight: bold; }
                .barcode-bars { height: 50px; background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px); width: 85%; margin: 0 auto 10px; }
                .acoes-print { text-align: center; margin-top: 20px; }
                .btn-print { background: #1d4ed8; color: #fff; border: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: bold; }
                @media print { .acoes-print { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="dam-box">
                <div class="dam-header">
                    <div>
                        <h1>Prefeitura Municipal de Vitória da Conquista</h1>
                        <p>Gerência de Posturas • Documento de Arrecadação Municipal (DAM)</p>
                    </div>
                    <div class="dam-tag">${multa.id_multa}</div>
                </div>

                <div class="dam-grid">
                    <div class="dam-field">
                        <span>Contribuinte / Autuado</span>
                        <strong>${multa.contribuinte || 'Não informado'}</strong>
                    </div>
                    <div class="dam-field">
                        <span>CPF / CNPJ</span>
                        <strong>${multa.documento || 'N/A'}</strong>
                    </div>
                    <div class="dam-field">
                        <span>Nº do Auto de Infração</span>
                        <strong>${multa.numero_auto || '-'}</strong>
                    </div>
                    <div class="dam-field">
                        <span>Status da Multa</span>
                        <strong>${multa.status || 'Emitida'}</strong>
                    </div>
                    <div class="dam-field">
                        <span>Data de Emissão</span>
                        <strong>${formatarData(multa.data_emissao)}</strong>
                    </div>
                    <div class="dam-field">
                        <span>Data de Vencimento</span>
                        <strong>${formatarData(multa.data_vencimento)}</strong>
                    </div>
                    <div class="dam-field dam-valor" style="grid-column: span 2;">
                        <span>Valor Total a Pagar</span>
                        <strong>${formatarMoeda(multa.valor)}</strong>
                    </div>
                </div>

                <div class="dam-barcode-area">
                    <div class="linha-digitavel">${linhaDigitavel}</div>
                    <div class="barcode-bars"></div>
                    <small>Documento gerado eletronicamente pelo SIGAI — Válido para apresentação e pagamento na rede conveniada.</small>
                </div>
            </div>

            <div class="acoes-print">
                <button class="btn-print" onclick="window.print()">Imprimir / Salvar em PDF</button>
            </div>
        </body>
        </html>
    `);
    janela.document.close();
}