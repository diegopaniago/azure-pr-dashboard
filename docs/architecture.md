# Arquitetura

O Azure PR Dashboard é uma aplicação local composta por um backend Express e um frontend estático em JavaScript puro. O backend concentra toda comunicação com Azure DevOps para proteger o PAT, enquanto o frontend consome apenas endpoints locais, renderiza a experiência do usuário e mantém o snapshot usado para detectar mudanças.

## Visão Geral

```txt
Browser
  |
  | GET /api/prs
  v
Express local
  |
  | Azure DevOps REST API
  v
Azure DevOps
```

## Backend

O backend fica em `src/` e expõe:

- `GET /api/health`: indica se as variáveis principais estão configuradas.
- `GET /api/prs`: retorna PRs envolvidas, usando cache quando disponível.
- `GET /api/prs?refresh=true`: ignora o cache e força nova coleta.

Responsabilidades:

- Autenticar no Azure DevOps via Basic Auth com PAT.
- Resolver usuário por e-mail.
- Resolver grupos do usuário.
- Buscar repositórios do projeto.
- Buscar PRs dos últimos `DAYS_BACK` dias por status e janela de tempo.
- Consultar threads para descobrir comentários do usuário.
- Deduplicar PRs.
- Classificar envolvimento.

## Frontend

O frontend fica em `public/` e não usa framework. Ele busca `/api/prs`, renderiza resumo e tabela, aplica filtros locais e gerencia notificações.

Responsabilidades:

- Mostrar loading, erro e estado vazio.
- Renderizar cards de resumo.
- Filtrar por status, repositório, envolvimento e texto livre.
- Atualizar automaticamente a cada 5 minutos.
- Manter snapshot em `localStorage`.
- Notificar mudanças relevantes após permissão explícita.

## Fluxo de Coleta

1. `server.js` recebe `GET /api/prs`.
2. Se cache válido existir e `refresh=true` não foi informado, retorna cache.
3. `identityResolver.js` busca usuário e grupos.
4. `prAggregator.js` lista repositórios.
5. Para cada repositório, busca PRs `active`, `completed` e `abandoned`.
6. Para PRs fechadas, considera também janela `closed`.
7. Deduplica por `repositoryId:pullRequestId`.
8. Para cada PR, consulta threads.
9. Mantém apenas PRs com envolvimento direto, por grupo, por comentário ou autoria.
10. Retorna lista ordenada por `lastActivityDate`.

## Pontos de Atenção

- A consulta de threads é a parte mais cara da coleta.
- O cache atual é em memória e reinicia junto com o processo.
- A comparação de grupos depende dos formatos retornados pelas APIs Graph e Git.
- O snapshot de mudanças fica no navegador, portanto é por usuário/browser.

