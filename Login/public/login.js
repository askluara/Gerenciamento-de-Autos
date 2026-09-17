//Variaveis para que os valores digitados no index.html sejam "trazidos" para o login.js
const email = document.getElementById('campoEmail');
const senhaLogin = document.getElementById('campoSenha');
const botao = document.getElementById('botaoEntrar');

//responsavel por iniciar a rotina de login/filtro dos dados
botao.addEventListener('click', async(event)=>{
    //permite que o evento funcione corretamente
    event.preventDefault();
    
    //"pega" os valores presentes em e-mail e senha para serem validados . value.trim()
    const emailValor = email.value.trim();
    const senhaValor = senhaLogin.value.trim();

    //verificação para formatos de email, gmail, hotmail e outlook
    const emailValido = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com)$/;

    //if's e else's para verificar se os campos foram preenchidos corretamente
    if(emailValor === "" || senhaValor === ""){
    alert("Campo e-mail ou senha não podem ser vazios");
    }else if(!emailValido.test(emailValor)){
    alert("Insira um e-mail valido")
    }else{
        try{
        //envia os dados(email e senha) para o servidor
        const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValor, senha: senhaValor })
        });

        //o const dados espera a resposta do arquivo.json
        const dados = await resposta.json();
         //Verifica se os dados são validos
        if (dados.sucesso) {
        window.location.href =  '/home'; // redireciona para a rota configurada no server.js
        } else {
        alert(dados.mensagem);
        }
    //Erro caso não conecte ao servidor
    }catch(erro){
        console.error("Erro ao conectar com o servidor:", erro);
        alert("Erro de conexão com o servidor. Tente novamente mais tarde.");
    }
}



});
