# Technical Backlog

This list records useful but non-required improvements for the current MVP. Before implementing, validate whether the gain is worth the complexity.

## High Priority

- Add tests for real group reviewer cases returned by the organization.
- Improve error messages by type: missing configuration, invalid authentication, insufficient permission, and rate limit.

## Medium Priority

- Add an optional endpoint for PR details.
- Persist cache to a local file so it survives container restarts.
- Add table sorting by date, status, and repository.
- Create a "Needs my review" filter based on `reviewerVote`.
- Create a diagnostic mode that lists how many API calls were made.

## Low Priority

- Export the filtered list as CSV.
- Add a dark theme.
- Show local history of detected changes.

## Do Not Do For Now

- Do not migrate to a frontend framework.
- Do not add a database.
- Do not create local authentication.
- Do not expose the PAT or direct Azure DevOps calls in the browser.
