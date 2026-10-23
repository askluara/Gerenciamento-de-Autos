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
    const matriculaGerada = 'FS' + Math.floor(Math.random() * 100000).toString().padStart(5, '0');

    const novoFiscal = {
        matricula_fiscal: matriculaGerada,
        nome: document.getElementById('nome').value,
        cpf: document.getElementById('cpf').value,
        email: document.getElementById('email').value,
        fk_telefone_fiscal_telefone_fiscal_pk: document.getElementById('telefone').value,
        data_admissao: document.getElementById('data_admissao').value,
        fk_cargo_id: document.getElementById('cargo_id').value,
        fk_idsetor: document.getElementById('setor_id').value,
        fk_idnivelacesso: document.getElementById('nivel_acesso_id').value,
        observacao: document.getElementById('observacoes').value,
        ativo: true
    };

    try {
        const res = await fetch('/api/fiscais/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoFiscal)
        });

        if (res.ok) {
            alert(`Fiscal cadastrado com sucesso! Matrícula: ${matriculaGerada}`);
            document.getElementById('formCadastroFiscal').reset();
        } else {
            const erro = await res.json();
            alert('Erro ao cadastrar: ' + (erro.mensagem || 'Verifique os dados informados.'));
        }
    } catch (erro) {
        console.error('Erro na requisição:', erro);
        alert('Erro de conexão com o servidor.');
    }
}