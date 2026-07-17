# Contrato da API Local

A API local é consumida pelo frontend em `public/app.js`. Alterações neste contrato devem ser acompanhadas de ajuste na UI e testes unitários quando afetarem regra de negócio.

## GET /api/health

Retorna estado básico do serviço e se as variáveis principais foram configuradas.

Exemplo:

```json
{
  "ok": true,
  "service": "azure-pr-dashboard",
  "configured": {
    "organization": true,
    "project": true,
    "pat": true,
    "userEmail": true
  }
}
```

## GET /api/config

Retorna configurações públicas usadas pelo frontend.

Exemplo:

```json
{
  "autoRefreshSeconds": 300
}
```

## GET /api/prs

Retorna PRs envolvidas. Usa cache em memória quando disponível.

## GET /api/prs?refresh=true

Força nova coleta e atualiza o cache.

## GET /api/prs/stream

Retorna PRs envolvidas via Server-Sent Events. Usa cache em memória quando disponível e envia cada PR em um evento separado.

## GET /api/prs/stream?refresh=true

Força nova coleta via Server-Sent Events e atualiza o cache ao final.

## Resposta de Sucesso

```json
{
  "generatedAt": "2026-07-17T12:00:00.000Z",
  "daysBack": 60,
  "organization": "minha-org",
  "project": "meu-projeto",
  "user": {
    "displayName": "Nome do Usuario",
    "uniqueName": "usuario@empresa.com"
  },
  "prs": [
    {
      "id": "minha-org:meu-projeto:repo-id:123",
      "pullRequestId": 123,
      "title": "Ajuste de validacao",
      "status": "active",
      "repository": "api",
      "repositoryId": "repo-id",
      "project": "meu-projeto",
      "createdBy": "Pessoa Autora",
      "creationDate": "2026-07-10T10:00:00.000Z",
      "closedDate": null,
      "sourceBranch": "feature/validacao",
      "targetBranch": "main",
      "url": "https://dev.azure.com/minha-org/meu-projeto/_git/api/pullrequest/123",
      "involvement": {
        "directReviewer": true,
        "groupReviewer": false,
        "commented": true,
        "authored": false
      },
      "reviewers": [],
      "commentCount": 4,
      "commentCountByUser": 1,
      "commentsLoaded": true,
      "reviewerVote": 0,
      "lastActivityDate": "2026-07-12T09:00:00.000Z"
    }
  ],
  "cached": false
}
```

Para PRs com repositório identificado, o backend consulta threads a cada coleta para manter `commentCount`, `commentCountByUser` e notificações de comentários atualizados.

## Resposta de Erro

```json
{
  "error": "Não foi possível carregar as Pull Requests.",
  "details": "Mensagem técnica resumida"
}
```

Não inclua segredos em `details`.

## Eventos do Stream

Eventos enviados por `/api/prs/stream`:

- `start`: metadados da coleta.
- `pr`: uma PR relevante.
- `done`: fim da coleta, com `generatedAt`, `count` e `cached`.
- `failure`: erro resumido, com `error` e `details`.
