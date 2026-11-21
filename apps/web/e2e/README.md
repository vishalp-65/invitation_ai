# End-to-end tests

```
npx playwright test --project=unit          # parsers, no browser
E2E_BASE_URL=http://localhost:3100 npx playwright test --project=phone
```

Uses the locally installed Chrome (`channel: 'chrome'`), no browser download.

## Local test account (dev database only)

Used to check host flows against a local dev server. Sign-in is passwordless: enter the email,
then the 6-digit code from the API log (`Development signin OTP for …` while
`EMAIL_PROVIDER=console`):

- email: `host.e2e@noyta.test`

Save a signed-in session for the host specs:

```
npx playwright codegen http://localhost:3100/login --save-storage=e2e/.auth/host.json
E2E_STORAGE_STATE=e2e/.auth/host.json E2E_EVENT_ID=<invitation id> npx playwright test --project=phone
```
