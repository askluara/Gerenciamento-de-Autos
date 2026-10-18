const matricula = document.getElementById('campoMatricula');
const senhaLogin = document.getElementById('campoSenha');
const botao = document.getElementById('botaoEntrar');

botao.addEventListener('click', async(event) => {
    event.preventDefault();

    const matriculaValor = matricula.value.trim();
    const senhaValor = senhaLogin.value.trim();

    if (!matriculaValor || !senhaValor) {
        alert("Preencha o campo de matrícula e senha.");
        return;
    }

    try {
        const resposta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matricula: matriculaValor,
                senha: senhaValor
            })
        });

        // Converte a resposta recebida em JSON
        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
            window.location.href = '/home';
        } else {
            // Exibe a mensagem personalizada enviada pelo backend
            alert(dados.mensagem || "Credenciais não encontradas ou inválidas.");
        }

    } catch (erro) {
        console.error("Erro ao conectar com o servidor:", erro);
        alert("Não foi possível conectar ao servidor. Tente novamente mais tarde.");
    }
});