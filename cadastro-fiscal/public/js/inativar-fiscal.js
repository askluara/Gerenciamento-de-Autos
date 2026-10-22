document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error('A biblioteca do Supabase não foi carregada.');
        return;
    }

    window.supabaseClient = supabase.createClient(
        'https://kabdcameedigsitnlarf.supabase.co/',
        'sb_publishable_dnRtSwHIBL10lHIGtLzHRw_GyjdtJBu'
    );

    const termo = document.querySelector('#filtro-termo');
    document.querySelector('#btn-pesquisar')?.addEventListener('click', () => executarBuscaInativar(window.supabaseClient));
    termo?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            executarBuscaInativar(window.supabaseClient);
        }
    });
});

async function executarBuscaInativar(db) {
    const termo = document.querySelector('#filtro-termo')?.value.trim() || '';
    const tbody = document.querySelector('#tabela-resultados-inativar');
    const results = document.querySelector('#resultados-inativar');
    const helper = document.querySelector('#mensagem-busca-inativar');
    if (!tbody || !results) return;

    try {
        let query = db.from('fiscal').select('*').order('matricula_fiscal', { ascending: true });
        if (termo) {
            const cpf = termo.replace(/\D/g, '');
            const filters = [`nome.ilike.%${termo}%`, `matricula_fiscal.ilike.%${termo}%`];
            if (cpf) filters.push(`cpf.ilike.%${cpf}%`);
            query = query.or(filters.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;

        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="fiscal-empty-state">Nenhum fiscal encontrado.</td></tr>';
        } else {
            data.forEach(fiscal => {
                const isActive = fiscal.ativo !== false;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${fiscal.matricula_fiscal || ''}</td>
                    <td class="is-strong">${fiscal.nome || ''}</td>
                    <td><span class="fiscal-status ${isActive ? 'is-active' : 'is-inactive'}">${isActive ? 'Ativo' : 'Inativo'}</span></td>
                    <td class="is-centered"><button type="button" class="fiscal-button ${isActive ? 'is-danger' : 'is-success'} btn-toggle-status" data-matricula="${fiscal.matricula_fiscal}" data-ativo="${isActive}">${isActive ? 'Inativar' : 'Ativar'}</button></td>`;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll('.btn-toggle-status').forEach(button => {
                button.addEventListener('click', () => {
                    const matricula = button.dataset.matricula;
                    alterarStatusFiscal(db, matricula, button.dataset.ativo !== 'true');
                });
            });
        }
        results.hidden = false;
        if (helper) helper.hidden = true;
    } catch (error) {
        console.error('Erro na pesquisa:', error);
        alert('Erro ao pesquisar fiscais.');
    }
}

async function alterarStatusFiscal(db, matricula, novoEstado) {
    const acao = novoEstado ? 'ativar' : 'inativar';
    if (!confirm(`Tem certeza que deseja ${acao} o fiscal com a matrícula ${matricula}?`)) return;

    try {
        const { error } = await db
            .from('fiscal')
            .update({ ativo: novoEstado })
            .eq('matricula_fiscal', matricula);
        if (error) throw error;

        window.finalizarAcaoFiscal(`Fiscal ${novoEstado ? 'ativado' : 'inativado'} com sucesso.`);
    } catch (error) {
        console.error('Erro ao atualizar estado do fiscal:', error);
        alert(`Erro ao atualizar: ${error.message || JSON.stringify(error)}`);
    }
}
