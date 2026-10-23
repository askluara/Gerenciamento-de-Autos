# Servidor principal

Este diretorio contem o servidor Express principal em `src/server.js`, o cliente Supabase em `src/supabase.js` e as paginas de login e painel em `public/`.

A configuracao npm e compartilhada com a raiz do repositorio. Consulte o [README principal](../README.md) para instalar dependencias, configurar `Login/.env` e iniciar a aplicacao com `npm start` na raiz.

## Perfis

| Perfil | Acesso previsto |
| --- | --- |
| Fiscal | Painel e modulo de infracoes. |
| Coordenador | Painel e modulo de fiscais. |
| Administrador | Painel e ambos os modulos. |

O servidor aplica os controles de acesso nas paginas e nas rotas de API. As regras atuais estao em `src/server.js`.
