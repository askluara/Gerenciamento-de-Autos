document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error('A biblioteca do Supabase não foi carregada no HTML via CDN.');
        return;
    }

    const db = supabase.createClient(
        'https://kabdcameedigsitnlarf.supabase.co/',
        'sb_publishable_dnRtSwHIBL10lHIGtLzHRw_GyjdtJBu'
    );
    const results = document.querySelector('#resultado-pesquisa');

    carregarOpcoes('/cargos', '#filtro-cargo', ['nome_cargo', 'cargo', 'nome'], ['id', 'cargo_id'], 'Todos os cargos');
    carregarOpcoes('/setores', '#filtro-setor', ['nome_setor', 'setor', 'nome'], ['id_setor', 'id'], 'Todos os setores');
    carregarOpcoes('/niveis-acesso', '#filtro-nivel', ['descricao', 'descrição', 'descricao_nivel_acesso'], ['id_nivelAcesso', 'id'], 'Todos os níveis');

    document.querySelector('#btn-pesquisar')?.addEventListener('click', () => executarPesquisa(db, true));
    document.querySelector('#btn-limpar')?.addEventListener('click', () => {
        document.querySelectorAll('.fiscal-card input').forEach(input => { input.value = ''; });
        document.querySelectorAll('.fiscal-card select').forEach(select => { select.selectedIndex = 0; });
        executarPesquisa(db, true);
    });
    document.querySelectorAll('.fiscal-card input').forEach(input => input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            executarPesquisa(db, true);
        }
    }));

    // Mantém a consulta inicial existente, mas exibe a tabela somente após uma pesquisa solicitada.
    executarPesquisa(db, false);
});

async function carregarOpcoes(url, selector, labelKeys, valueKeys, placeholder) {
    const select = document.querySelector(selector);
    if (!select) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
        const rows = await response.json();
        rows.forEach(row => {
            const value = valueKeys.map(key => row[key]).find(item => item !== undefined && item !== null);
            const label = labelKeys.map(key => row[key]).find(item => item !== undefined && item !== null);
            if (value === undefined || label === undefined) return;
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.append(option);
        });
    } catch (error) {
        console.error(`Erro ao carregar opções de ${placeholder.toLowerCase()}:`, error);
    }
}

async function executarPesquisa(db, mostrarResultados = true) {
    const value = selector => document.querySelector(selector)?.value.trim() || '';
    const nome = value('#filtro-nome');
    const cpf = value('#filtro-cpf');
    const matricula = value('#filtro-matricula');
    const cargo = value('#filtro-cargo');
    const setor = value('#filtro-setor');
    const nivel = value('#filtro-nivel');
    const status = value('#filtro-status');
    const admissaoDe = value('#filtro-admissao-de');
    const admissaoAte = value('#filtro-admissao-ate');

    try {
        let query = db.from('fiscal').select('*').order('matricula_fiscal', { ascending: true });
        if (nome) query = query.ilike('nome', `%${nome}%`);
        if (cpf) query = query.eq('cpf', cpf.replace(/\D/g, ''));
        if (matricula) query = query.ilike('matricula_fiscal', `%${matricula}%`);
        if (cargo) query = query.eq('fk_cargo_id', cargo);
        if (setor) query = query.eq('fk_idsetor', setor);
        if (nivel) query = query.eq('fk_idnivelacesso', nivel);
        if (status) query = query.eq('ativo', status === 'ativo');
        if (admissaoDe) query = query.gte('data_admissao', admissaoDe);
        if (admissaoAte) query = query.lte('data_admissao', admissaoAte);

        const { data, error } = await query;
        if (error) throw error;
        renderizarTabela(data || []);
        const container = document.querySelector('#resultado-pesquisa');
        if (container && mostrarResultados) container.hidden = false;
    } catch (error) {
        console.error('Erro na consulta ao Supabase:', error);
        const container = document.querySelector('#resultado-pesquisa');
        if (container && mostrarResultados) {
            container.innerHTML = '<div class="fiscal-empty-state">Não foi possível carregar os fiscais. Tente novamente.</div>';
            container.hidden = false;
        }
    }
}

function renderizarTabela(fiscais) {
    const container = document.querySelector('#resultado-pesquisa');
    if (!container) return;

    if (fiscais.length === 0) {
        container.innerHTML = '<div class="fiscal-empty-state">Nenhum fiscal encontrado com estes critérios.</div>';
        return;
    }

    const linhas = fiscais.map(fiscal => `
        <tr>
            <td>${fiscal.matricula_fiscal || '-'}</td>
            <td class="is-strong">${fiscal.nome || '-'}</td>
            <td>${fiscal.cpf || '-'}</td>
            <td>${fiscal.fk_telefone_fiscal_telefone_fiscal_pk || '-'}</td>
            <td>${fiscal.email || '-'}</td>
            <td>${fiscal.data_admissao ? new Date(`${fiscal.data_admissao}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="is-centered"><a class="fiscal-button is-primary" href="editar-fiscal.html?matricula=${encodeURIComponent(fiscal.matricula_fiscal || '')}">Editar</a></td>
        </tr>`).join('');

    container.innerHTML = `
        <h3 class="fiscal-results-title">Resultados da consulta (${fiscais.length})</h3>
        <div class="fiscal-table-wrap"><table class="fiscal-table">
            <thead><tr><th>Matrícula</th><th>Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>Admissão</th><th class="is-centered">Ações</th></tr></thead>
            <tbody>${linhas}</tbody>
        </table></div>`;
}
