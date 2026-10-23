# login
repositorio da tela de login do sistema de gerenciamento de autos de infração

## Perfis de acesso

O perfil da credencial controla os módulos exibidos na navegação e o acesso direto às páginas e APIs:

| Perfil | Acesso |
| --- | --- |
| Fiscal | Dashboard e CRUD de infrações |
| Coordenador | Dashboard e CRUD de fiscais |
| Administrador | Dashboard e ambos os CRUDs |

As credenciais devem usar `perfil` como `FISCAL`, `COORDENADOR` ou `ADMINISTRADOR`. A flag `is_admin` ou uma matrícula `matricula_admin` também identifica o administrador. A permissão de administrador não é inferida para perfis desconhecidos.
