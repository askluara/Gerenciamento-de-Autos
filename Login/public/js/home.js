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
  } catch (error) {
    console.error(error.message);
    window.location.href = '/';
  }
});
document.addEventListener('DOMContentLoaded', () => {
  carregarEstatisticas();
  carregarAutosRecentes();
});
//função para tela de carregar estatisticas 
async function carregarEstatisticas() {
  try {
    const resposta = await fetch('/api/dashboard/estatisticas');
    const dados = await resposta.json();

    document.getElementById('cardTotalAutos').textContent = dados.totalAutos || 0;
    document.getElementById('cardDefesasPendentes').textContent = dados.defesasPendentes || 0;
    document.getElementById('cardPareceres').textContent = dados.pareceresAnalise || 0;
    document.getElementById('cardMultas').textContent = dados.multasEmitidas || 0;
  } catch (erro) {
    console.error('Erro ao carregar estatísticas:', erro);
  }
}
//criação de função para tabela com dados recentes dos autos de infração
async function carregarAutosRecentes() {
  try {
    const resposta = await fetch('/api/dashboard/recentes');
    const autos = await resposta.json();

    const tbody = document.getElementById('tabelaAutosBody');
    tbody.innerHTML = '';

    if (!autos || autos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Nenhum auto cadastrado.</td></tr>';
      return;
    }

    autos.forEach(auto => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><a href="#">${auto.protocolo}</a></td>
        <td>${auto.contribuinte}</td>
        <td>${auto.cpf_cnpj}</td>
        <td>${new Date(auto.data).toLocaleDateString('pt-BR')}</td>
        <td>${auto.tipo_infracao}</td>
        <td><span class="badge badge-${auto.status.toLowerCase().replace(/\s+/g, '-')}">${auto.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (erro) {
    console.error('Erro ao carregar tabela:', erro);
  }
}
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

