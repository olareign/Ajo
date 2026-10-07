# Àjọ admin console

The staff back office (plan E9). It is its own app (`apps/admin`), deployed as its own Vercel project on its own address, with its own sign-in. Nothing admin ships inside the customer app, and a customer's session opens nothing here.

## What it does

| Role | Can |
| --- | --- |
| **Owner** | Everything, including adding, resetting and turning off staff |
| **Support** | Look people up, suspend an account, read recovery cases |
| **Compliance** | Look people up, suspend and reinstate, review identity (decide steps, approve or hold by hand), read the audit log |
| **Finance** | Look people up, work recovery cases (notes, record an outcome) |

Every sensitive action (suspend, reinstate, an identity decision, closing a case, anything on the team) asks for a written reason and a **fresh authenticator code** on top of being signed in. Everything staff do, including every look at a person's details and every refusal, is written to the audit log, which the database refuses to change or empty.

Not built yet: reconciliation (E9.5, waits for E3.7) and reports (E9.6). Identity documents: none are stored yet (identity checks are not connected to a partner), so there is nothing to open; signed links come with that.

## Setting it up (once)

1. **Database.** Run `ajo-api/scripts/sql/bring-database-up-to-date.sql` in the Neon editor. The last result should say **25** migrations, the latest `AdminBackOffice1790900200000`.
2. **API.** Merge the API pull request. There is no new setting: the console uses the API's existing keys.
3. **Vercel project.** Create a new project from the same repository:
   - Root Directory: `apps/admin`; Framework: Next.js.
   - Environment variables: `API_BASE_URL` (the same API address as the customer app), `ADMIN_SESSION_SECRET` (a new random value of 32+ characters; make one with `openssl rand -base64 48`; **not** the customer app's `SESSION_SECRET`), and, if the API has one, `BFF_SHARED_SECRET` (the same value) so the audit log records each person's real address.
   - Give it its own domain (for example `console.yourdomain.com`), not a guessable `*.vercel.app` name.
   - Put a second lock in front if you can (Cloudflare Access, or Vercel Deployment Protection): it limits who can even reach the sign-in page.
4. **The first owner.** From your machine, in `ajo-api`:

   ```bash
   pnpm build
   DATABASE_URL='<the Neon connection string>' DATABASE_SSL=true pnpm admin:create you@example.com "Your Name" owner
   ```

   It prints a one-time **setup code** (good for 24 hours, shown only then). Open `https://<the console>/setup`, enter your email, the code and a password (14+ characters), scan the QR code with an authenticator app, and enter the code it shows. You are in.
5. **The rest of the team.** Team, then Add someone: choose their role, enter a code from your app, and pass the setup code to them yourself.

## When someone is locked out

Owner: Team, then Reset next to their name. That wipes their password and authenticator, signs them out, and gives a new setup code. If **you** are locked out (lost phone), run `pnpm admin:create` again with your own email: it resets you the same way. That needs the database connection string, which is the point: only someone with server access can do it, and it is recorded in the audit log as made from the command line.

## Safety notes

- Suspending an account stops sign-in and ends every session at once. It does not touch money, and **scheduled saving-plan and circle debits keep running**: they only move money between the person's own wallet, pot and circle, and keeping them going stops a suspension from making someone default on a circle.
- Sessions: 30 minutes idle, 8 hours at most, three at a time. Five wrong passwords or codes lock the account for 15 minutes.
- The session lives in an HttpOnly cookie that only the console's server can open; the API token never reaches the browser.
- Keep the owner role to as few people as possible. The system refuses to remove the last active owner, even when two owners try to remove each other at the same moment.
