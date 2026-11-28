# Gerenciamento de Autos

Aplicacao web para gerenciamento de autos de infracao, com autenticacao, painel, cadastro de fiscais e cadastro de infracoes. O backend principal e um servidor Express unico, localizado em `Login/src/server.js`. Ele fornece as APIs e serve as paginas dos modulos `Login`, `cadastro-fiscal` e `cadastro-infracao`.

O `package.json` e o `package-lock.json` da raiz sao os manifests npm unicos do projeto. As dependencias compartilhadas ficam instaladas em `node_modules/` na raiz.

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
package.json          Dependencias e comando npm start
package-lock.json     Versoes travadas das dependencias
```

`cadastro-fiscal/Index.js` exporta um router e nao inicia um servidor. O servidor em `Login/src/server.js` e o processo que deve ser iniciado para usar a aplicacao completa. Os diretorios dos modulos contem os arquivos do frontend servidos por esse processo. Os endpoints de fiscais atualmente estao implementados no servidor principal; o router legado nao e montado por ele.

## Requisitos

- Node.js 22 ou superior (exigido pela versao atual do Supabase JS travada no lockfile).
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
npm ci
npm start
```

O script inicia o servidor principal a partir de `Login`, para que ele encontre `Login/.env`. Abra `http://localhost:3000` (ou a porta definida em `PORT`). Para encerrar o servidor, use `Ctrl+C` no terminal. Os diretorios `cadastro-fiscal` e `cadastro-infracao` nao sao processos de servidor independentes na configuracao atual.

## Rotas principais

- `/` — pagina de login.
- `/home` — painel apos autenticacao.
- `/cadastro-fiscal/...` — paginas do modulo de fiscais.
- `/cadastro-infracao/...` — paginas do modulo de infracoes.
- `/api/...` — endpoints de autenticacao, painel e dados.

As paginas e APIs podem ter exigencias de autenticacao e perfil. Consulte os middlewares e rotas em `Login/src/server.js` para os detalhes vigentes.

## Desenvolvimento

O comando `npm start` inicia o servidor sem reinicio automatico. Reinicie o processo depois de alterar arquivos do backend. Os arquivos HTML, CSS e JavaScript dos modulos ficam em seus respectivos diretorios `public/`.

## API de defesas (RF017–RF020)

Aplique `cadastro-defesa/sql/001_gerenciar_defesas.sql` em uma base que ainda não tenha o módulo.
Na sequência, aplique `cadastro-defesa/sql/002_situacao_defesa.sql` para habilitar a alteração de situação.
As telas são servidas pelo Express em `/cadastro-defesa/registrar` e `/cadastro-defesa/gerenciar`.
A migração pressupõe `auto_infracao.id_auto`, `defesa.data_envio` e a coluna
`fk_auto_infracao_id_auto` em `defesa` e `parecer`. A função de cadastro gera
um UUID de 36 caracteres para `defesa.id_defesa`. Os vínculos com o auto
devem usar chaves estrangeiras, inclusive em `parecer`, para que a gravação de um
parecer concorra com o bloqueio do auto na transação. O backend deve usar a chave
`service_role` em `SUPABASE_KEY`, acessível apenas ao servidor. Cadastre os analistas
com perfil `ANALISTA` ou com `matricula_analista` em `credencial`.

| Método e rota | Operação |
| --- | --- |
| `GET /api/defesas/autos` | Busca o auto por `numero_auto` ou `cpf_cnpj`. Sem filtros, lista a fila de autos aguardando defesa, sem defesa registrada e sem parecer. |
| `GET /api/defesas` | Lista defesas. Aceita `numero_auto`, `cpf_cnpj`, `nome_contribuinte`, `data_inicio`, `data_fim` e `pagina`. Cada página retorna até 50 registros. |
| `GET /api/defesas/:id` | Consulta os dados de uma defesa. |
| `GET /api/defesas/:id/documento` | Baixa o anexo. |
| `POST /api/defesas` | Registra a defesa. |
| `PATCH /api/defesas/:id` | Atualiza `data_envio`, `observacoes` e/ou `documento`. |
| `PATCH /api/defesas/:id/situacao` | Recebe `{"ativa": false}` para inativar ou `{"ativa": true}` para reativar. Disponível apenas para administradores e em processos sem parecer. |

As rotas exigem sessão de analista ou administrador. Envie o cadastro como JSON com
`id_auto`, `data_envio` (AAAA-MM-DD), `documento` (objeto com `nome` e
`conteudo_base64`, até 10 MiB de arquivo) e `observacoes` opcional.
Para confirmar um protocolo fora do prazo após receber HTTP 409 com o código
`DEFESA_FORA_PRAZO`, reenvie a operação com `confirmar_fora_prazo: true`.

O prazo usa `auto_infracao.prazo_defesa_ate`. Se ele estiver vazio, o cálculo usa
dez dias corridos a partir de `data_auto`. O campo `prazo_cobranca_suspenso` registra
a suspensão. Uma rotina de cobrança deve consultar esse campo para interromper a
contagem. Os anexos legados com endereço em `url_defesa` podem ser mantidos ou substituídos na edição.

Para testar o cadastro fora do estado `Aguardando Defesa`, aplique
`cadastro-defesa/sql/003_cadastro_defesa_modo_teste.sql` e inicie com
`DEFESA_MODO_TESTE=true PORT=3017 npm start`. Para voltar à regra normal, reinicie
sem `DEFESA_MODO_TESTE`. Autos julgados, com parecer ou com defesa registrada
continuam bloqueados durante os testes.

Na base SIGAI, aplique também `cadastro-defesa/sql/004_status_reais_auto.sql` depois
da migração 003. O enum de autos usa `Em Aberto` e `Defesa Apresentada` para as
etapas exibidas no módulo como `Aguardando Defesa` e `Em Análise`.
