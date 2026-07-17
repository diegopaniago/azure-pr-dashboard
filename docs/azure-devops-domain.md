# Domínio Azure DevOps

Esta documentação resume as regras de domínio usadas pelo projeto para decidir se uma Pull Request deve aparecer no dashboard. Use este arquivo como referência antes de alterar coleta, filtros ou classificação de envolvimento.

## Critérios de Envolvimento

Uma PR é considerada relevante quando pelo menos um critério é verdadeiro:

- `directReviewer`: o usuário aparece diretamente em `reviewers`.
- `groupReviewer`: algum grupo/time do usuário aparece em `reviewers`.
- `commented`: o usuário fez comentário em alguma thread da PR.
- `authored`: o usuário criou a PR.

`authored` não estava no requisito inicial como critério principal, mas é mantido porque é útil para o dashboard e já aparece como badge na UI.

## Janela de Tempo

O dashboard considera os últimos `DAYS_BACK` dias, com padrão de 60 dias.

Para reduzir risco de perder PRs relevantes:

- busca PRs criadas dentro da janela;
- busca PRs fechadas dentro da janela para status `completed` e `abandoned`;
- não busca `closed` para `active`, pois PR ativa não deve ter fechamento.

## Status Considerados

- `active`
- `completed`
- `abandoned`

Novos status devem ser adicionados com cuidado e teste unitário.

## Deduplicação

A mesma PR pode ser retornada em mais de uma consulta. A deduplicação usa:

```txt
repositoryId:pullRequestId
```

Na resposta final ao frontend, o `id` inclui também organização e projeto:

```txt
organization:project:repositoryId:pullRequestId
```

## Comentários

Comentários são descobertos lendo threads da PR. Comentários deletados são ignorados.

As threads são consultadas a cada coleta para manter contagens e notificações de comentários atualizadas.

Campos observados:

- `thread.comments`
- `comment.author.id`
- `comment.author.uniqueName`
- `comment.publishedDate`
- `comment.lastUpdatedDate`
- `comment.isDeleted`

## Reviewer por Grupo

A resolução de grupos usa memberships do usuário com direção `up`. Depois tenta comparar reviewers com:

- `group.id`
- `group.descriptor`
- `group.displayName`
- `group.principalName`

Do lado do reviewer, compara:

- `reviewer.id`
- `reviewer.uniqueName`
- `reviewer.displayName`
- `reviewer.descriptor`
- `reviewer.name`

Esse ponto pode variar conforme configuração da organização no Azure DevOps. Se houver falso negativo, priorize adicionar fixtures em teste antes de alterar a regra.
