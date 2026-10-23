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

// Função para aplicar as máscaras em tempo real
function aplicarMascaras() {
    const cpfInput = document.getElementById('cpf');
    const telInput = document.getElementById('telefone');

    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, ""); // Remove tudo o que não é número
            valor = valor.substring(0, 11); // Limita a exatamente 11 números antes de formatar
            
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = valor;
        });
    }

    if (telInput) {
        telInput.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, ""); // Remove tudo o que não é número
            valor = valor.substring(0, 11); // Limita o telefone a 11 números (2 do DDD + 9 dígitos)
            
            valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
            valor = valor.replace(/(\d)(\d{4})$/, "$1-$2");
            e.target.value = valor;
        });
    }
}

async function executarBusca(db) {
    const termo = document.querySelector('#filtro-termo')?.value.trim() || '';
    const tbody = document.querySelector('#tabela-resultados-busca');
    const resultados = document.querySelector('#resultados-editar');
    const mensagemBusca = document.querySelector('#mensagem-busca-editar');

    try {
        let query = db.from('fiscal').select('*').order('matricula_fiscal', { ascending: true });

        if (termo) {
            const cpfNum = termo.replace(/\D/g, '');
            const filtros = [`nome.ilike.%${termo}%`, `matricula_fiscal.ilike.%${termo}%`];
            if (cpfNum) filtros.push(`cpf.ilike.%${cpfNum}%`);
            query = query.or(filtros.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;

        resultados.hidden = false;
        mensagemBusca.hidden = true;
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="fiscal-empty-state">Nenhum fiscal encontrado.</td></tr>';
            return;
        }

        data.forEach(fiscal => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${fiscal.matricula_fiscal || ''}</td>
                <td class="is-strong">${fiscal.nome || ''}</td>
                <td>${fiscal.cpf || ''}</td>
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
        alert('Erro ao pesquisar fiscais.');
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
            alert('Fiscal não encontrado.');
            return;
        }

        document.querySelector('#matricula').value = data.matricula_fiscal || '';
        document.querySelector('#nome').value = data.nome || '';
        document.querySelector('#cpf').value = data.cpf || '';
        document.querySelector('#email').value = data.email || '';
        document.querySelector('#telefone').value = data.fk_telefone_fiscal_telefone_fiscal_pk || '';
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
        alert('Selecione um fiscal na tabela acima antes de salvar.');
        return;
    }

    const nome = document.querySelector('#nome').value.trim();
    const cpf = document.querySelector('#cpf').value.trim();
    const email = document.querySelector('#email').value.trim();
    const telefone = document.querySelector('#telefone').value.trim();
    const observacao = document.querySelector('#observacao').value.trim();
    const cargo = document.querySelector('#cargo_id').value;
    const setor = document.querySelector('#setor_id').value;
    const nivelAcesso = document.querySelector('#nivel_acesso_id').value;

    try {
        const { error } = await db
            .from('fiscal')
            .update({
                nome: nome,
                cpf: cpf, // O banco de dados vai receber a formatação bonitinha!
                email: email,
                fk_telefone_fiscal_telefone_fiscal_pk: telefone || null,
                observacao: observacao,
                fk_cargo_id: cargo,
                fk_idsetor: setor,
                fk_idnivelacesso: nivelAcesso
            })
            .eq('matricula_fiscal', matricula);

        if (error) throw error;

        if (typeof window.finalizarAcaoFiscal === 'function') {
            window.finalizarAcaoFiscal('Fiscal atualizado com sucesso.');
        } else {
            alert('Fiscal atualizado com sucesso.');
        }
    } catch (err) {
        console.error('Erro ao atualizar:', err);
        alert('Erro ao atualizar: ' + (err.message || JSON.stringify(err)));
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