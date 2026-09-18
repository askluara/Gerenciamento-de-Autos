//antes de carregar, le o conteudo inserido e valida a sessao criada
document.addEventListener('DOMContentLoaded',async() =>{
   try {
    const resposta = await fetch('/api/verificar-sessao', {
      credentials: 'include' // ISTO É ESSENCIAL PARA A VERIFICAÇÃO DA SESSAO
    });
    //responsavel por "pegar" algum erro http
    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }
    //espera a resposta do arquivo.json
    const dados = await resposta.json();

    if (!dados.logado) {
      window.location.href = '/';
    } else {
      //sessão valida
    }
  } catch (erro) {
    console.error(erro.message);
    window.location.href = '/';
  }
});
//funcoes para o botao de logout
//confirmar o logout
document.getElementById('botaoLogout').addEventListener('click', async () => {
  const confirmar = confirm('Deseja realmente sair?');
  
  if (confirmar) {
    await fetch('/api/logout', {
      credentials: 'include'
    });
    window.location.href = '/';
  }
});
//alerta ao fechar a pagina
window.addEventListener('beforeunload', (event) => {
  const confirmar = confirm('Deseja realmente sair? Sua sessão será encerrada.');
  
  if (!confirmar) {
    event.preventDefault();
    event.returnValue = '';
  }
});

