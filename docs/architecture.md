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
- `GET /api/config`: retorna configurações públicas do frontend.
- `GET /api/prs`: retorna PRs envolvidas, usando cache quando disponível.
- `GET /api/prs?refresh=true`: ignora o cache e força nova coleta.
- `GET /api/prs/stream`: envia PRs progressivamente via Server-Sent Events.
- `GET /api/prs/stream?refresh=true`: força nova coleta progressiva.

Responsabilidades:

- Autenticar no Azure DevOps via Basic Auth com PAT.
- Resolver usuário por e-mail.
- Resolver grupos do usuário.
- Buscar repositórios do projeto.
- Buscar PRs dos últimos `DAYS_BACK` dias por status e janela de tempo.
- Consultar threads das PRs candidatas para atualizar comentários.
- Deduplicar PRs.
- Classificar envolvimento.

## Frontend

O frontend fica em `public/` e não usa framework. Ele consome `/api/prs/stream` para renderizar resultados conforme chegam, mantém `/api/prs` como fallback, aplica filtros locais e gerencia notificações.

Responsabilidades:

- Mostrar loading, erro e estado vazio.
- Renderizar cards de resumo.
- Filtrar por status, repositório, envolvimento e texto livre.
- Atualizar automaticamente conforme `AUTO_REFRESH_SECONDS`.
- Manter snapshot em `localStorage`.
- Notificar mudanças relevantes após permissão explícita.

## Fluxo de Coleta

1. `server.js` recebe `GET /api/prs/stream` ou `GET /api/prs`.
2. Se cache válido existir e `refresh=true` não foi informado, retorna cache.
3. `identityResolver.js` busca usuário e grupos.
4. `prAggregator.js` lista repositórios.
5. Para cada repositório, busca PRs `active`, `completed` e `abandoned`.
6. Para PRs fechadas, considera também janela `closed`.
7. Deduplica por `repositoryId:pullRequestId`.
8. Consulta threads das PRs candidatas para contar comentários e descobrir comentários do usuário.
9. Mantém apenas PRs com envolvimento direto, por grupo, por comentário ou autoria.
10. No stream, envia cada PR assim que ela é classificada.
11. Ao final, atualiza cache e mantém a lista final ordenada por `lastActivityDate`.

## Pontos de Atenção

- A consulta de threads é a parte mais cara da coleta, mas mantém contagens e notificações de comentários atualizadas.
- O cache atual é em memória e reinicia junto com o processo.
- A comparação de grupos depende dos formatos retornados pelas APIs Graph e Git.
- O snapshot de mudanças fica no navegador, portanto é por usuário/browser.
