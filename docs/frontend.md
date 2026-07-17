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
- `currentStream`: conexão Server-Sent Events ativa.

## Sino de Notificações

O sino no canto da tela guarda mudanças ainda não limpas pelo usuário. Ele usa `localStorage` com a chave:

```txt
azure-pr-dashboard:notifications
```

As notificações são criadas após o evento `done` da coleta, junto com a detecção de mudanças do snapshot. Não há popup nativo do navegador nem som; o registro fica apenas no sino interno.

## Carregamento Progressivo

A tela usa `/api/prs/stream` com `EventSource` para renderizar PRs conforme o backend classifica cada item. Se `EventSource` não estiver disponível no navegador, usa `/api/prs` como fallback.

O snapshot e as notificações continuam sendo atualizados apenas no evento `done`, quando a coleta termina.

## Atualização Automática

A frequência de atualização vem de `/api/config`, que reflete `AUTO_REFRESH_SECONDS`. Se a config não puder ser carregada, o frontend usa `300` segundos. A barra de monitoramento mostra um countdown no formato `Atualiza em X segundos`.

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
- `commentsLoaded`
- `reviewerVote`
- `involvement`

Quando `commentsLoaded` é `false`, a tabela exibe `-`. Em coletas normais de PRs com repositório identificado, esse campo vem como `true`.

## Cuidados de UI

- Mantenha estados de loading, erro e lista vazia.
- Não use texto muito longo dentro de botões.
- Escape dados vindos da API antes de renderizar HTML.
- Preserve tabela responsiva com rolagem horizontal para telas pequenas.
