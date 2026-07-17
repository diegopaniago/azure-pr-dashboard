# Frontend

O frontend fica em `public/` e deve continuar simples, sem build step e sem framework. A tela foi pensada para um desenvolvedor identificar rapidamente quais Pull Requests exigem atenção.

## Arquivos

- `public/index.html`: estrutura semântica da tela.
- `public/styles.css`: layout, cards, filtros, tabela e responsividade.
- `public/app.js`: estado local, busca de dados, filtros, notificações e renderização.

## Estado Local

`public/app.js` mantém:

- `prs`: lista atual de PRs;
- `changedIds`: PRs destacadas após mudança;
- `firstLoad`: evita notificação em massa na primeira carga;
- `notificationEnabled`: reflete permissão da Browser Notification API.

## Snapshot

O snapshot fica no `localStorage`:

```txt
azure-pr-dashboard:lastSnapshot
```

Campos comparados:

- `status`
- `lastActivityDate`
- `commentCount`
- `commentCountByUser`
- `reviewerVote`
- `involvement`

## Notificações

O navegador só pede permissão após clique em `Ativar notificações`. Notificações não são disparadas na primeira carga.

Ao clicar na notificação, a PR é aberta em nova aba.

## Cuidados de UI

- Mantenha estados de loading, erro e lista vazia.
- Não use texto muito longo dentro de botões.
- Escape dados vindos da API antes de renderizar HTML.
- Preserve tabela responsiva com rolagem horizontal para telas pequenas.

