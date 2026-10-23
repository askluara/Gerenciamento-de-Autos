document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carregar as opções do banco de dados
    await carregarOpcoesSelects();
    
    // 2. Aplicar máscaras de formatação (CPF e Telefone)
    aplicarMascaras();

    // 3. Configurar o envio do formulário
    const formCadastro = document.getElementById('formCadastroFiscal');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            await salvarFiscal();
        });
    }
});

// Busca os dados na API e preenche os campos <select>
async function carregarOpcoesSelects() {
    try {
        const resCargos = await fetch('/api/cargos');
        if (resCargos.ok) {
            const cargos = await resCargos.json();
            const selectCargo = document.getElementById('cargo_id');
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
            const selectSetor = document.getElementById('setor_id');
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
            const selectNivel = document.getElementById('nivel_acesso_id');
            niveis.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n.id_nivelAcesso;
                opt.textContent = n.descrição; 
                selectNivel.appendChild(opt);
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar opções dos formulários:", erro);
    }
}

// Envia os dados do formulário para o back-end
async function salvarFiscal() {
    const matricula = document.getElementById('matricula').value.trim();
    const senha = document.getElementById('senha').value;

    const novoFiscal = {
        matricula_fiscal: matricula,
        nome: document.getElementById('nome').value,
        cpf: somenteNumeros(document.getElementById('cpf').value),
        email: document.getElementById('email').value,
        fk_telefone_fiscal_telefone_fiscal_pk: somenteNumeros(document.getElementById('telefone').value) || null,
        data_admissao: document.getElementById('data_admissao').value,
        fk_cargo_id: document.getElementById('cargo_id').value,
        fk_idsetor: document.getElementById('setor_id').value,
        fk_idnivelacesso: document.getElementById('nivel_acesso_id').value,
        observacao: document.getElementById('observacoes').value,
        ativo: true,
        credencial: { senha }
    };

    try {
        const res = await fetch('/api/fiscais/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoFiscal)
        });

        if (res.ok) {
            await concluirAcao(`Fiscal cadastrado com sucesso! Matrícula: ${matricula}`);
        } else {
            const erro = await res.json();
            abrirModal('Erro ao cadastrar: ' + (erro.mensagem || 'Verifique os dados informados.'));
        }
    } catch (erro) {
        console.error('Erro na requisição:', erro);
        abrirModal('Erro de conexão com o servidor.');
    }
}
