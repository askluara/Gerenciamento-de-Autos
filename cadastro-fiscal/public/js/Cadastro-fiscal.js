document.addEventListener('DOMContentLoaded', async () => {
    const selectCargo = document.getElementById('cargo_id');
    const selectSetor = document.getElementById('setor_id');
    const selectNivel = document.getElementById('nivel_acesso_id');
    const formFiscal = document.getElementById('formCadastroFiscal');


    // Máscara e validação de limite para o CPF
    const inputCpf = document.getElementById('cpf');
    if (inputCpf) {
        inputCpf.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, ''); // Remove tudo o que não for número
            
            if (valor.length > 11) {
                valor = valor.slice(0, 11); // Limita a 11 dígitos
            }

            // Aplica a formatação 000.000.000-00
            if (valor.length > 9) {
                valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
            } else if (valor.length > 6) {
                valor = valor.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
            } else if (valor.length > 3) {
                valor = valor.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
            }

            e.target.value = valor;
        });
    }

    // Máscara e validação de limite para o Telefone
    const inputTelefone = document.getElementById('telefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, ''); // Remove tudo o que não for número
            
            if (valor.length > 11) {
                valor = valor.slice(0, 11); // Limita a 11 dígitos (DDD + 9 dígitos)
            }

            // Aplica a formatação (00) 00000-0000 ou (00) 0000-0000
            if (valor.length > 10) {
                valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (valor.length > 6) {
                valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (valor.length > 2) {
                valor = valor.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
            } else if (valor.length > 0) {
                valor = valor.replace(/^(\d*)/, '($1');
            }

            e.target.value = valor;
        });
    }

    async function carregarSelects() {
        try {
            // Carregar Cargos
            const respCargos = await fetch('/cargos');
            const cargos = await respCargos.json();
            selectCargo.innerHTML = '<option value="">Selecione o cargo</option>';
            cargos.forEach(c => {
                const nomeCargo = c.nome_cargo || c.cargo || c.nome;
                selectCargo.innerHTML += `<option value="${c.id || c.cargo_id}">${nomeCargo}</option>`;
            });

            // Carregar Setores
            const respSetores = await fetch('/setores');
            const setores = await respSetores.json();
            selectSetor.innerHTML = '<option value="">Selecione o setor</option>';
            setores.forEach(s => {
                const nomeSetor = s.nome_setor || s.setor || s.nome;
                selectSetor.innerHTML += `<option value="${s.id_setor || s.id}">${nomeSetor}</option>`;
            });

           // Carregar Níveis de Acesso
            const respNivel = await fetch('/niveis-acesso');
            const niveis = await respNivel.json();
            selectNivel.innerHTML = '<option value="">Selecione o nível de acesso</option>';
            niveis.forEach(n => {
                selectNivel.innerHTML += `<option value="${n.id_nivelAcesso}">${n.descrição}</option>`;
            });
        } catch (err) {
            console.error("Erro ao carregar as opções dos selects:", err);
        }
    }

    carregarSelects();

    // Manipular o envio do formulário de cadastro
    if (formFiscal) {
        formFiscal.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Pega o valor do telefone formatado e remove tudo o que não for número para enviar ao banco
            const telefoneInput = document.getElementById('telefone')?.value || '';
            const telefoneLimpo = telefoneInput.replace(/\D/g, '');

            const dadosForm = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                cpf: document.getElementById('cpf').value,
                fk_telefone_fiscal_telefone_fiscal_pk: telefoneLimpo,
                data_admissao: document.getElementById('data_admissao').value,
                fk_cargo_id: selectCargo.value,
                fk_idsetor: selectSetor.value,
                fk_idnivelacesso: selectNivel.value,
                observacao: document.getElementById('observacoes')?.value || ''
            };

            try {
                const resposta = await fetch('/fiscais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosForm)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    window.finalizarAcaoFiscal(resultado.mensagem || 'Fiscal cadastrado com sucesso.');
                } else {
                    alert('Erro ao cadastrar: ' + (resultado.erro || resultado.detalhe));
                }
            } catch (err) {
                console.error('Erro na requisição:', err);
                alert('Erro de conexão com o servidor.');
            }
        });
    }
});
