//pega o "valor" presente no botaoLogout
const botaoSair = document.getElementById('botaoLogout')
//quando clicado ele aciona o mecanismo de logout
botaoSair.addEventListener('click', async()=>{
    try{
        const resposta = await fetch('/api/logout', {
            credentials: 'include'
        });
        if(resposta.ok){
            alert("Sessão encerrada com sucesso")
            window.location.href ='/';
        }else{
        //logout é cancelado
        }

    }catch(erro){
        alert("Erro ao comunicar com o servidor\nFalha no encerramento da sessão", erro)
    }

});