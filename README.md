# Gerenciamento de Autos

Aplicacao web para gerenciamento de autos de infracao, com autenticacao, painel, cadastro de fiscais e cadastro de infracoes. O backend principal e um servidor Express unico, localizado em `Login/src/server.js`. Ele fornece as APIs e serve as paginas dos modulos `Login`, `cadastro-fiscal` e `cadastro-infracao`.

## Estrutura

```text
Login/
  src/server.js       Servidor Express principal e ponto de entrada
  src/supabase.js     Cliente Supabase usado pelo servidor
  public/             Paginas, estilos e scripts de login e painel
cadastro-fiscal/
  Index.js            Router Express legado do modulo
  public/             Paginas, estilos e scripts de fiscais
cadastro-infracao/
  Index.js            Scripts do navegador para o modulo de infracoes
  public/             Paginas, estilos e scripts de infracoes
```

`cadastro-fiscal/Index.js` exporta um router e nao inicia um servidor. O servidor em `Login/src/server.js` e o processo que deve ser iniciado para usar a aplicacao completa. Os diretorios dos modulos contem os arquivos do frontend servidos por esse processo.

## Requisitos

- Node.js 18 ou superior.
- npm.
- Um projeto Supabase configurado com as tabelas e permissoes usadas pela aplicacao.

## Configuracao

O servidor carrega o arquivo `Login/.env`. Crie-o a partir do modelo, se ainda nao existir:

```powershell
Copy-Item Login/.env.example Login/.env
```

Edite `Login/.env` e preencha os valores reais:

| Variavel | Obrigatoria | Uso |
| --- | --- | --- |
| `SUPABASE_URL` | Sim | URL do projeto Supabase. |
| `SUPABASE_KEY` | Sim | Chave usada pelo backend para acessar o Supabase. Mantenha-a somente no servidor. |
| `PORT` | Nao | Porta HTTP; usa `3000` quando omitida. |

Nao compartilhe nem envie `Login/.env` ao Git. O `.gitignore` ignora arquivos de ambiente e dependencias instaladas.

## Instalar e executar

No PowerShell, a partir da raiz do repositorio:

```powershell
cd Login
npm ci
npm start
```

Abra `http://localhost:3000` (ou a porta definida em `PORT`). Para encerrar o servidor, use `Ctrl+C` no terminal.

Execute os comandos npm dentro de `Login`, onde estao o `package.json` e o lockfile do servidor. Os diretorios `cadastro-fiscal` e `cadastro-infracao` nao sao processos de servidor independentes na configuracao atual.

## Rotas principais

- `/` — pagina de login.
- `/home` — painel apos autenticacao.
- `/cadastro-fiscal/...` — paginas do modulo de fiscais.
- `/cadastro-infracao/...` — paginas do modulo de infracoes.
- `/api/...` — endpoints de autenticacao, painel e dados.

As paginas e APIs podem ter exigencias de autenticacao e perfil. Consulte os middlewares e rotas em `Login/src/server.js` para os detalhes vigentes.

## Desenvolvimento

O comando `npm start` inicia o servidor sem reinicio automatico. Reinicie o processo depois de alterar arquivos do backend. Os arquivos HTML, CSS e JavaScript dos modulos ficam em seus respectivos diretorios `public/`.
