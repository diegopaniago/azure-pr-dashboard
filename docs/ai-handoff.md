# Handoff para IA

Use este arquivo para retomar contexto rapidamente em futuras sessões de IA. O projeto já possui MVP funcional com backend local, frontend estático, Docker e testes unitários.

## Objetivo do Produto

Mostrar Pull Requests do Azure DevOps em que o usuário esteve envolvido nos últimos 60 dias, facilitando a decisão sobre quais PRs precisam de avaliação.

## Stack Atual

- Node.js 24
- Express
- JavaScript ESM
- HTML/CSS/JS puro
- Docker Compose
- Testes com `node:test`

## O Que Já Existe

- Cliente Azure DevOps com `fetch` nativo.
- Autenticação Basic Auth com PAT.
- Resolução de usuário por e-mail.
- Resolução de grupos por Graph API.
- Busca paginada de PRs.
- Deduplicação.
- Verificação de reviewer direto, grupo, comentários e autoria.
- Leitura de threads em cada PR candidata para manter comentários e notificações atualizados.
- Cache em memória.
- UI com cards, filtros, tabela, auto-refresh, notificações e carregamento progressivo via Server-Sent Events.
- Testes unitários principais.

## Como Validar

```bash
npm test
docker compose config
docker compose up --build
```

Depois acessar:

```txt
http://localhost:3000
```

## Próxima Melhor Evolução

A próxima melhoria de performance é adicionar diagnóstico de chamadas ou paralelismo controlado para consultas ao Azure DevOps. Faça isso com cuidado para evitar rate limit e sem remover a atualização recorrente de comentários.
