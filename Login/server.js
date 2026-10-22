//Imports necessarios

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

const app = express();
const PORT = 3000;

//cria sessão do usuario
//importante para segurança

app.use(session({
  secret:'abracadabra',//provisorio
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true em produção com HTTPS
    maxAge: 1000 * 60 * 60 * 24, // 24 horas (tempo maximo que voce pode "ficar" no servidor)
    httpOnly: true
  }
}));

// Interpreta JSON vindo da chamada do fetch()
app.use(express.json());

// Serve os arquivos do front (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

//funcao que não permite o usuario acessar a tela home sem login
function protegerRota(req, res, next) {
  if (req.session.usuarioLogado) {
    next();
  } else {
    return res.status(302).redirect('/'); // Adicione return e status
  }
}

// Rota pra tela de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota da Tela Inicial (onde o usuário vai após logar)
// adição do metodo de protecao
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Rota onde o login.js envia os dados
app.post('/api/login', (req, res) => {
const { email, senha } = req.body;

//Tenta ver se possui o usuario(email e senha) que foi digitado 

  try {
    const caminhoUsuarios = path.join(__dirname, 'usuarios.json');
    const dadosArquivo = fs.readFileSync(caminhoUsuarios, 'utf-8');
    const usuarios = JSON.parse(dadosArquivo);

    // Valida se existe usuário com este e-mail e senha
    // O arquivo usuarios.json é apenas para testes iniciais! ************
    const usuarioValido = usuarios.find(
      u => u.email === email && u.senha === senha
    );

    //Verifica se usuarioValido é valido e lança mensagem correspondente
    if (usuarioValido) {
    //criacao da sessao pelo usuario
    req.session.usuarioLogado = true;
    req.session.email = usuarioValido.email;

      return res.json({ sucesso: true, mensagem: 'Login realizado com sucesso!' });
    } else {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos!' });
    }
//Erro caso não conecte ao servidor
  } catch (error) {
    console.error(error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor ao validar o login.' });
  }
});
//verifica se há sessão válida
app.get('/api/verificar-sessao', (req, res) => {

  if (req.session.usuarioLogado) {
    return res.json({ logado: true, email: req.session.email });
  } else {
    return res.json({ logado: false });
  }
});
//sessão de logout
app.get('/api/logout',(req,res)=>{
req.session.destroy((err)=>{
  if(err){
    return res.status(500).json({sucesso:false})
  }
  res.json({sucesso:true});
});

// Rota para cadastrar fiscal
app.post('/api/fiscais', (req, res) => {

    const {
        nome,
        sobrenome,
        cpf,
        cargoFuncao,
        email,
        telefone,
        senha
    } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!nome || !sobrenome || !cpf || !cargoFuncao || !email || !telefone || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Todos os campos são obrigatórios.'
        });
    }

    // Por enquanto, apenas mostra os dados recebidos
    console.log('Novo fiscal recebido:');
    console.log({
        nome,
        sobrenome,
        cpf,
        cargoFuncao,
        email,
        telefone
    });

    return res.status(201).json({
        sucesso: true,
        mensagem: 'Dados do fiscal recebidos com sucesso!'
    });
});

// inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
}); 



});
//inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});