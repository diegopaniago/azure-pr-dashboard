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

## GET /api/prs

Retorna PRs envolvidas. Usa cache em memória quando disponível.

## GET /api/prs?refresh=true

Força nova coleta e atualiza o cache.

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
      "reviewerVote": 0,
      "lastActivityDate": "2026-07-12T09:00:00.000Z"
    }
  ],
  "cached": false
}
```

## Resposta de Erro

```json
{
  "error": "Não foi possível carregar as Pull Requests.",
  "details": "Mensagem técnica resumida"
}
```

Não inclua segredos em `details`.

