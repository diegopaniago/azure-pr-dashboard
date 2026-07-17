# Configuração

O projeto é configurado por variáveis de ambiente. Em desenvolvimento local, use `.env`, criado a partir de `.env.example`. O arquivo `.env` não deve ser versionado.

## Variáveis

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `AZURE_DEVOPS_ORG` | Sim | - | Nome da organização no Azure DevOps. |
| `AZURE_DEVOPS_PROJECT` | Sim | - | Nome do projeto no Azure DevOps. |
| `AZURE_DEVOPS_PAT` | Sim | - | Personal Access Token usado somente no backend. |
| `AZURE_DEVOPS_USER_EMAIL` | Sim | - | E-mail do usuário monitorado. |
| `DAYS_BACK` | Não | `60` | Janela de dias para buscar PRs. |
| `PORT` | Não | `3000` | Porta local do dashboard. |
| `CACHE_TTL_SECONDS` | Não | `300` | Tempo de vida do cache em memória. |
| `AZURE_DEVOPS_REPOSITORIES` | Não | vazio | Lista opcional de repositórios separados por vírgula. |

## PAT

O PAT deve ter permissão suficiente para:

- ler repositórios e Pull Requests;
- ler reviewers;
- ler threads e comentários;
- consultar identidade e grupos do usuário.

Se a organização bloquear leitura de Graph API, a identificação por grupo pode falhar mesmo que reviewer direto e comentários funcionem.

## Docker Compose

O `docker-compose.yml` lê `.env` quando ele existe:

```bash
docker compose up --build
```

Sem `.env`, o serviço sobe, mas `/api/prs` falhará por falta de configuração.

