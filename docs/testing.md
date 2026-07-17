# Testes

Os testes usam o runner nativo do Node.js 24, sem bibliotecas externas. O objetivo é cobrir regras de negócio e integrações internas sem depender do Azure DevOps real.

## Comando

```bash
npm test
```

## Organização

- `test/cache.test.js`: comportamento do cache em memória.
- `test/azureDevOpsClient.test.js`: montagem de URL, validação de configuração e paginação.
- `test/prAggregator.test.js`: filtros de repositório, deduplicação e critérios de envolvimento.

## Diretrizes

- Use fakes em memória para simular o client do Azure DevOps.
- Não faça chamadas de rede em testes unitários.
- Não use PAT real em testes.
- Prefira asserts explícitos com `node:assert/strict`.
- Ao corrigir bug de classificação, adicione um teste que falhe antes da correção.

## Casos Importantes para Cobrir em Evoluções

- Reviewer direto identificado por `id`.
- Reviewer direto identificado por `uniqueName`.
- Grupo identificado por `id`.
- Grupo identificado por `displayName` ou `descriptor`.
- Comentários deletados ignorados.
- PR fechada dentro da janela, mas criada antes dela.
- Repositórios filtrados por nome e por id.

