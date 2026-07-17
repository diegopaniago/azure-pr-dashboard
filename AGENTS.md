# Instruções para Agentes de IA

Este projeto é um dashboard local para acompanhar Pull Requests do Azure DevOps em que o usuário está envolvido. Ao atuar aqui, preserve a simplicidade do produto: backend Node.js com Express, frontend com JavaScript puro, HTML e CSS, execução via Docker e nenhum framework frontend.

## Regras Gerais

- Escreva sempre em português brasileiro.
- Use commits semânticos no padrão Conventional Commits.
- Evite descrições longas quando uma explicação direta resolver.
- Mantenha o PAT do Azure DevOps somente no backend e em variáveis de ambiente.
- Não exponha segredos no frontend, em logs, documentação ou exemplos preenchidos.
- Não adicione React, Vue, Angular, Vite, Next.js ou bibliotecas frontend.
- Não adicione bibliotecas de teste; use `node:test` e `node:assert/strict`.
- Prefira mudanças pequenas, testáveis e alinhadas aos módulos existentes.
- Antes de alterar comportamento de coleta de PRs, leia `docs/architecture.md` e `docs/azure-devops-domain.md`.

## Comandos Úteis

```bash
npm test
docker compose config
docker compose up --build
```

## Estrutura Principal

- `src/server.js`: servidor Express, endpoints e cache.
- `src/azureDevOpsClient.js`: cliente HTTP do Azure DevOps.
- `src/identityResolver.js`: resolução do usuário e grupos.
- `src/prAggregator.js`: regra de coleta, deduplicação e classificação das PRs.
- `src/cache.js`: cache simples em memória.
- `public/app.js`: estado, filtros, renderização, auto-refresh e notificações.
- `public/styles.css`: design visual do dashboard.
- `test/`: testes unitários com runner nativo do Node.js.
- `docs/`: documentação para manutenção e evolução.

## Critérios de Qualidade

- Toda mudança em regra de envolvimento deve ter teste em `test/prAggregator.test.js`.
- Toda mudança em URL, paginação ou autenticação deve ter teste em `test/azureDevOpsClient.test.js`.
- Toda mudança em cache deve ter teste em `test/cache.test.js`.
- Se alterar a UI, valide estados de loading, erro, lista vazia e filtros.
- Se alterar variáveis de ambiente, atualize `.env.example`, `README.md` e `docs/configuration.md`.

## Segurança

- Nunca faça commit de `.env`.
- Nunca coloque valor real de `AZURE_DEVOPS_PAT` em documentação.
- Evite registrar URLs com credenciais ou respostas completas de erro que possam conter dados sensíveis.
- O frontend deve consumir apenas endpoints locais e nunca falar direto com Azure DevOps.

## Estilo de Código

- Projeto em ESM, com `import` e `export`.
- Use APIs nativas do Node.js 24 sempre que possível.
- Mantenha funções puras quando viável, especialmente em regras de classificação.
- Use nomes explícitos para flags de envolvimento: `directReviewer`, `groupReviewer`, `commented`, `authored`.
- Evite abstrações prematuras. Extraia função apenas quando reduzir duplicação real ou isolar regra importante.

## Fluxo Recomendado para Mudanças

1. Entenda o requisito e identifique se é backend, frontend, documentação ou teste.
2. Leia os arquivos diretamente relacionados.
3. Altere o menor conjunto de arquivos necessário.
4. Rode `npm test`.
5. Atualize documentação quando comportamento, configuração ou contrato mudar.

