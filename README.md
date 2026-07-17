# Azure PR Dashboard

Dashboard local em JavaScript puro, HTML e CSS para acompanhar Pull Requests do Azure DevOps em que você foi envolvido nos últimos 60 dias. A aplicação roda em Docker, mantém o PAT somente no backend e ajuda um desenvolvedor a identificar rapidamente PRs que precisam de atenção por reviewer direto, reviewer por grupo/time ou comentários feitos nas threads.

## Recursos

- Lista PRs `active`, `completed` e `abandoned`.
- Considera PRs criadas ou fechadas dentro da janela configurada.
- Identifica envolvimento por reviewer direto, grupo/time, comentários e autoria.
- Filtra por status, repositório, tipo de envolvimento e texto livre.
- Renderiza PRs progressivamente conforme o backend recebe resultados.
- Atualiza automaticamente conforme `AUTO_REFRESH_SECONDS`.
- Usa sino interno para guardar mudanças detectadas ainda não limpas.
- Mantém snapshot local em `localStorage` com a chave `azure-pr-dashboard:lastSnapshot`.
- Usa Node.js 24 no Docker.

## Configuração

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha:

```env
AZURE_DEVOPS_ORG=nome-da-organizacao
AZURE_DEVOPS_PROJECT=nome-do-projeto
AZURE_DEVOPS_PAT=seu_pat
AZURE_DEVOPS_USER_EMAIL=seu.email@empresa.com
DAYS_BACK=60
PORT=3000
AUTO_REFRESH_SECONDS=300
```

Opcionalmente limite os repositórios consultados:

```env
AZURE_DEVOPS_REPOSITORIES=repo1,repo2,repo3
```

## PAT do Azure DevOps

Crie um Personal Access Token em Azure DevOps acessando `User settings > Personal access tokens > New Token`. Trate esse token como senha: não publique, não coloque no frontend e não faça commit do `.env`.

Permissões mínimas esperadas:

- Code: Read, para consultar repositórios, Pull Requests, reviewers e threads.
- Graph ou permissões equivalentes de identidade, para resolver o usuário e os grupos/time dos quais ele faz parte.

Dependendo das políticas da organização, pode ser necessário ajustar escopos para leitura de identidade ou projeto.

## Execução

Com Docker Compose, rode:

```bash
docker compose up --build
```

Para desenvolvimento local com Node.js, rode:

```bash
npm run dev
```

Ao iniciar, o servidor carrega o arquivo `.env` quando ele existir e dá prioridade aos valores do arquivo local.

Abra:

```txt
http://localhost:3000
```

## Testes

Os testes unitários usam apenas o runner nativo do Node.js, sem bibliotecas adicionais:

```bash
npm test
```

## Documentação Técnica

- `AGENTS.md`: instruções para agentes de IA e manutenção assistida.
- `docs/architecture.md`: visão de arquitetura e fluxo de coleta.
- `docs/azure-devops-domain.md`: regras de domínio do Azure DevOps.
- `docs/api-contract.md`: contrato dos endpoints locais.
- `docs/configuration.md`: variáveis de ambiente e configuração.
- `docs/testing.md`: estratégia de testes.
- `docs/frontend.md`: comportamento do frontend.
- `docs/backlog.md`: backlog técnico sugerido.
- `docs/ai-handoff.md`: resumo para retomada por IA.

## Endpoints

```txt
GET /api/health
GET /api/prs
GET /api/prs?refresh=true
GET /api/prs/stream
GET /api/prs/stream?refresh=true
```

`refresh=true` ignora o cache em memória. `AUTO_REFRESH_SECONDS` define tanto a frequência de atualização automática do navegador quanto o tempo de vida do cache em memória; o padrão é `300` segundos.

## Limitações conhecidas

A detecção de comentários consulta threads das PRs candidatas a cada coleta para manter contagens e notificações atualizadas. Em projetos com muitos repositórios e muitas PRs recentes, isso pode deixar a primeira carga mais lenta e aumentar o consumo da API do Azure DevOps. Para reduzir custo, use `AZURE_DEVOPS_REPOSITORIES` quando possível.

A identificação de reviewer por grupo depende dos identificadores retornados pelas APIs Graph e Git do Azure DevOps. Em algumas organizações, times e grupos podem aparecer com formatos diferentes; nesses casos pode ser necessário ajustar a comparação de identidades.

As notificações do navegador dependem de permissão local e não são disparadas na primeira carga para evitar alertas antigos em massa.
