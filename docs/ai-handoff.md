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
- Cache em memória.
- UI com cards, filtros, tabela, auto-refresh e notificações.
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

A melhoria mais importante é reduzir chamadas de threads. Hoje cada PR candidata consulta threads para descobrir comentários. Uma otimização possível:

1. Classificar primeiro por reviewer direto, grupo ou autoria.
2. Consultar threads apenas para PRs ainda não classificadas.
3. Manter contagem de comentários total apenas quando threads forem consultadas.
4. Ajustar UI para lidar com `commentCount` desconhecido, se necessário.

Essa mudança precisa de testes porque altera dados exibidos.

