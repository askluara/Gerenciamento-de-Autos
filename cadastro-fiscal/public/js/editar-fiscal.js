let opcoesEdicaoPromise = Promise.resolve();

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error("A biblioteca do Supabase não foi carregada.");
        return;
    }

    const SUPABASE_URL = 'https://kabdcameedigsitnlarf.supabase.co/';
    const SUPABASE_KEY = 'sb_publishable_dnRtSwHIBL10lHIGtLzHRw_GyjdtJBu'; 
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const btnPesquisar = document.querySelector('#btn-pesquisar');
    const btnSalvar = document.querySelector('#btn-salvar');
    
    // Inicia máscaras de formatação
    aplicarMascaras();
    
    // Inicia o carregamento das opções dos selects
    opcoesEdicaoPromise = carregarOpcoesEdicao();

    // Se vier com matrícula da página de pesquisa externa
    const urlParams = new URLSearchParams(window.location.search);
    const matriculaUrl = urlParams.get('matricula');
    if (matriculaUrl) {
        carregarFiscalDireto(window.supabaseClient, matriculaUrl);
    }

    // Ação do botão pesquisar
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', () => {
            executarBusca(window.supabaseClient);
        });
    }

    document.querySelector('#filtro-termo')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            executarBusca(window.supabaseClient);
        }
    });

    // Ação do botão salvar
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            salvarAlteracoes(window.supabaseClient);
        });
    }
});

async function executarBusca(db) {
    const termo = document.querySelector('#filtro-termo')?.value.trim() || '';
    const tbody = document.querySelector('#tabela-resultados-busca');
    const resultados = document.querySelector('#resultados-editar');
    const mensagemBusca = document.querySelector('#mensagem-busca-editar');

    try {
        let query = db.from('fiscal').select('*').order('matricula_fiscal', { ascending: true });

        if (termo) {
            // A comparação dos critérios acontece em memória, normalizando os dígitos do CPF.
        }

        const { data, error } = await query;
        if (error) throw error;

        const termoNormalizado = termo.toLocaleLowerCase('pt-BR');
        const termoNumerico = somenteNumeros(termo);
        const fiscais = termo ? (data || []).filter(fiscal =>
            String(fiscal.nome || '').toLocaleLowerCase('pt-BR').includes(termoNormalizado) ||
            String(fiscal.matricula_fiscal || '').toLocaleLowerCase('pt-BR').includes(termoNormalizado) ||
            (termoNumerico && somenteNumeros(fiscal.cpf).includes(termoNumerico))
        ) : (data || []);

        resultados.hidden = false;
        mensagemBusca.hidden = true;
        tbody.innerHTML = '';

        if (fiscais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="fiscal-empty-state">Nenhum fiscal encontrado.</td></tr>';
            return;
        }

        fiscais.forEach(fiscal => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${fiscal.matricula_fiscal || ''}</td>
                <td class="is-strong">${fiscal.nome || ''}</td>
                <td>${formatarCpf(fiscal.cpf) || ''}</td>
                <td class="is-centered">
                    <button type="button" class="fiscal-button is-primary btn-selecionar" data-matricula="${fiscal.matricula_fiscal}">Selecionar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adiciona evento aos botões "Selecionar" da tabela gerada
        document.querySelectorAll('.btn-selecionar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mat = e.target.getAttribute('data-matricula');
                carregarFiscalDireto(db, mat);
            });
        });

    } catch (err) {
        console.error('Erro na pesquisa:', err);
        abrirModal('Erro ao pesquisar fiscais.');
    }
}

async function carregarFiscalDireto(db, matricula) {
    try {
        await opcoesEdicaoPromise;
        const { data, error } = await db
            .from('fiscal')
            .select('*')
            .eq('matricula_fiscal', matricula)
            .single();

        if (error || !data) {
            abrirModal('Fiscal não encontrado.');
            return;
        }

        document.querySelector('#matricula').value = data.matricula_fiscal || '';
        document.querySelector('#nome').value = data.nome || '';
        document.querySelector('#cpf').value = formatarCpf(data.cpf);
        document.querySelector('#email').value = data.email || '';
        document.querySelector('#telefone').value = formatarTelefone(data.fk_telefone_fiscal_telefone_fiscal_pk);
        document.querySelector('#senha-nova').value = '';
        document.querySelector('#observacao').value = data.observacao || '';
        document.querySelector('#cargo_id').value = data.fk_cargo_id ?? '';
        document.querySelector('#setor_id').value = data.fk_idsetor ?? '';
        document.querySelector('#nivel_acesso_id').value = data.fk_idnivelacesso ?? '';

        document.querySelector('#titulo-form').textContent = `Editando Fiscal: ${data.nome || data.matricula_fiscal}`;
        const formEdicao = document.querySelector('#form-edicao');
        formEdicao.hidden = false;
        window.scrollTo({ top: formEdicao.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
    } catch (err) {
        console.error('Erro ao carregar fiscal:', err);
    }
}

async function salvarAlteracoes(db) {
    const form = document.querySelector('#form-edicao');
    if (form && !form.reportValidity()) return;

    const matricula = document.querySelector('#matricula').value.trim();
    if (!matricula) {
        abrirModal('Selecione um fiscal na tabela acima antes de salvar.');
        return;
    }

    const nome = document.querySelector('#nome').value.trim();
    const cpf = somenteNumeros(document.querySelector('#cpf').value);
    const email = document.querySelector('#email').value.trim();
    const telefone = somenteNumeros(document.querySelector('#telefone').value);
    const observacao = document.querySelector('#observacao').value.trim();
    const cargo = document.querySelector('#cargo_id').value;
    const setor = document.querySelector('#setor_id').value;
    const nivelAcesso = document.querySelector('#nivel_acesso_id').value;
    const senhaNova = document.querySelector('#senha-nova').value.trim();

    if (senhaNova && senhaNova.length < 6) {
        abrirModal('A nova senha deve ter pelo menos 6 caracteres.');
        return;
    }

    try {
        const { error } = await db
            .from('fiscal')
            .update({
                nome: nome,
                cpf: cpf,
                email: email,
                fk_telefone_fiscal_telefone_fiscal_pk: telefone || null,
                observacao: observacao,
                fk_cargo_id: cargo,
                fk_idsetor: setor,
                fk_idnivelacesso: nivelAcesso
            })
            .eq('matricula_fiscal', matricula);

        if (error) throw error;

        if (senhaNova) {
            const respostaSenha = await fetch(`/api/fiscais/${encodeURIComponent(matricula)}/senha`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ senha: senhaNova })
            });
            const resultadoSenha = await respostaSenha.json();
            if (!respostaSenha.ok) {
                throw new Error(`Os dados do fiscal foram salvos, mas a senha não foi alterada: ${resultadoSenha.mensagem || 'erro no servidor.'}`);
            }
        }

        document.querySelector('#senha-nova').value = '';
        await concluirAcao(senhaNova ? 'Dados do fiscal e senha atualizados com sucesso.' : 'Dados do fiscal atualizados com sucesso.');
    } catch (err) {
        console.error('Erro ao atualizar:', err);
        abrirModal('Erro ao atualizar: ' + (err.message || JSON.stringify(err)));
    }
}

async function carregarOpcoesEdicao() {
    try {
        const resCargos = await fetch('/api/cargos');
        if (resCargos.ok) {
            const cargos = await resCargos.json();
            const selectCargo = document.querySelector('#cargo_id');
            cargos.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome_cargo;
                selectCargo.appendChild(opt);
            });
        }

        const resSetores = await fetch('/api/setores');
        if (resSetores.ok) {
            const setores = await resSetores.json();
            const selectSetor = document.querySelector('#setor_id');
            setores.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id_setor;
                opt.textContent = s.nome_setor;
                selectSetor.appendChild(opt);
            });
        }

        const resNiveis = await fetch('/api/niveis-acesso');
        if (resNiveis.ok) {
            const niveis = await resNiveis.json();
            const selectNivel = document.querySelector('#nivel_acesso_id');
            niveis.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n.id_nivelAcesso;
                opt.textContent = n.descrição; 
                selectNivel.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar opções:", error);
    }
}
