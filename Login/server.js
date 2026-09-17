//Imports necessarios

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Interpreta JSON vindo da chamada do fetch()
app.use(express.json());

// Serve os arquivos do front (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Rota pra tela de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota da Tela Inicial (onde o usuário vai após logar)
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
//inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});