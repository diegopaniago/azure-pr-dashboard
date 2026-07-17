# Frontend

The frontend lives in `public/` and must stay simple, with no build step and no framework. The screen is designed for a developer to quickly identify which Pull Requests need attention.

## Files

- `public/index.html`: semantic screen structure.
- `public/styles.css`: layout, cards, filters, table, language/theme switches, and responsiveness.
- `public/app.js`: local state, data loading, filters, language translation, theme selection, notifications, and rendering.

## Local State

`public/app.js` keeps:

- `prs`: current PR list;
- `changedIds`: PRs highlighted after a change;
- `firstLoad`: avoids mass notifications on first load;
- `currentStream`: active Server-Sent Events connection;
- `language`: selected UI language persisted in `localStorage`;
- `theme`: selected UI theme persisted in `localStorage`.

## Language Switch

The language switch is shown in the top-right header actions. It supports English and Brazilian Portuguese, stores the selected value in:

```txt
azure-pr-dashboard:language
```

English is the default. Changing language re-renders static labels, dates, summary cards, filters, badges, status labels, notifications, and the table without reloading the page.

## Theme Switch

The theme switch is shown beside the language switch in the top-right header actions. It stores the selected value in:

```txt
azure-pr-dashboard:theme
```

Dark is the default. Dark mode uses a black page background with dark panels, controls, table headers, and notification surfaces.

## Notification Bell

The bell in the screen corner keeps changes that the user has not cleared. It uses `localStorage` with the key:

```txt
azure-pr-dashboard:notifications
```

Notifications are created after the collection `done` event, together with snapshot change detection. There is no native browser popup or sound; records stay only in the internal bell.

## Progressive Loading

The screen uses `/api/prs/stream` with `EventSource` to render PRs as the backend classifies each item. If `EventSource` is not available in the browser, it uses `/api/prs` as fallback.

The snapshot and notifications are updated only on the `done` event, when collection finishes.

## Automatic Refresh

Refresh frequency comes from `/api/config`, which reflects `AUTO_REFRESH_SECONDS`. If config cannot be loaded, the frontend uses `300` seconds. The monitoring bar shows a localized countdown.

## Snapshot

The snapshot lives in `localStorage`:

```txt
azure-pr-dashboard:lastSnapshot
```

Compared fields:

- `status`
- `lastActivityDate`
- `commentCount`
- `commentCountByUser`
- `commentsLoaded`
- `reviewerVote`
- `involvement`

When `commentsLoaded` is `false`, the table displays `-`. In normal collections for PRs with an identified repository, this field is `true`.

## UI Care

- Keep loading, error, empty-list, language switch, theme switch, and filter states working.
- Do not use long text inside buttons.
- Escape API data before rendering HTML.
- Preserve the responsive table with horizontal scrolling on small screens.
