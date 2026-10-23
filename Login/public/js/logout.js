//pega o "valor" presente no botaoLogout
const botaoSair = document.getElementById('botaoLogout')
//quando clicado ele aciona o mecanismo de logout
botaoSair.addEventListener('click', async()=>{
    try{
        const resposta = await fetch('/api/logout', {
            credentials: 'include'
        });
        if(resposta.ok){
            await abrirModal("Sessão encerrada com sucesso");
            window.location.href ='/';
        }else{
        //logout é cancelado
        }

    }catch(erro){
        abrirModal(`Erro ao comunicar com o servidor. Falha no encerramento da sessão: ${erro.message || erro}`);
    }

});
