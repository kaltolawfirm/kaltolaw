# Kalto Law database (Firestore)

Firebase project `kalto-law`. Every collection the website, client portal and admin
dashboard use, the fields stored in each, and where they are written. Access rules
are in `firestore.rules`.

Records are created by the website as people use it (contact form, bookings,
uploads, payments). Nothing needs to be pre-loaded for the site to work. To see the
dashboard with sample data without touching the database, open `admin.html?demo`
(`js/admin-demo.js`).

## Website content

### `site_content`: editable website text
One document per page (id = page slug, e.g. `about`, `index`) plus `global` for the
header, menu, footer and firm details. Written by the dashboard's Website Editor
(`js/kh-editor.js`), read on every page by `js/cms.js`.

Documents hold only what has been edited. Anything not in the document shows the
text in the page's HTML, so a page with no document shows its original content.

| Field | Type | Notes |
|---|---|---|
| `fields` | map | Edited single fields, keyed by the element's `data-cms` key without its `p:`/`g:` prefix. Value is a string, `{text, href}` for links, or `{src, alt}` for images |
| `lists` | map | Edited repeatable lists (menu, cards, FAQ…), keyed the same way; each value is an array of items |
| `meta` | map | Page documents only: `title`, `description` for the browser tab and search engines |
| `settings` | map | `global` only: `phone`, `email`, `whatsapp`, `youtube`, `social.X`, `social.LinkedIn` |
| `updatedAt`, `updatedBy` | timestamp, string | Last save |

The list of editable fields and their default values is `js/cms-registry.json`,
generated from the pages by `node tools/cms-tag.js` (run it again after changing
page HTML).

### `website_content`: older text edits
Legacy single-field edits from the previous editor: `content` (HTML), `updatedAt`.
Still read by `js/cms.js` for elements that have no newer `site_content` edit.

### `insights`: Legal Insights blog posts
Written by the dashboard (Legal Insights). Shown on `blog.html`, `blog-post.html`
and the homepage.

| Field | Type | Notes |
|---|---|---|
| `title`, `category`, `description` | string | `description` is the card summary |
| `content` | string (HTML) | Full article |
| `coverImage` | string | Image URL |
| `createdAt`, `updatedAt` | timestamp | |
| `views`, `likes`, `comments` | number | Counters updated by visitors (`js/kh-post.js`) |

Sub-collection `insights/{id}/comments`: `name`, `text`, `createdAt`.

## Clients and cases

### `enquiries`: contact form messages
Written by `contact.html`; managed in the dashboard's Client Messages.

`name`, `email`, `phone`, `service`, `message`, `docNumber`, `createdAt`,
`status` (`unread` → `read` / `replied` / `approved`), and after a reply
`adminReply`, `repliedAt`.

### `appointments`: consultation bookings
Written by `contact.html`, `js/bookings.js` and the client portal; the document id
is the booking number (`docNumber`).

`name`, `email`, `phone`, `service`, `date` (YYYY-MM-DD), `time`, `message` or
`notes`, `docNumber`, `uid` (portal bookings), `createdAt`,
`status` (`Pending`, `Confirmed`, `Completed`, `Cancelled`).

### `cases`: case files
Created in the dashboard (New Case, or Convert from a message); looked up on
`track-case.html` by tracking code.

| Field | Type | Notes |
|---|---|---|
| `clientName`, `clientPhone` | string | |
| `trackingCode` | string | `KL-XXXX-0000`, shared with the client |
| `description` | string | The matter |
| `status` | string | `Initiated`, `Review`, `Approved`, `Rejected`, `Closed` |
| `documents` | array | `{name, url, requiresSignature?, signed?}` |
| `uid` | string | Linked client portal account |
| `enquiryId` | string | Set when converted from a message |
| `createdAt`, `lastUpdated` | timestamp | |

### `client_uploads`: files sent by clients
Written by `track-case.html` and the client portal.

`caseCode`, `fileName`, `fileSize`, `url`, `uid` (portal), `uploadedAt`,
`approvalStatus` (`pending` / `approved`, set in the dashboard).

### `users`: client portal accounts
Document id = Firebase Auth uid. Written by `js/portal-auth.js`.

`name`, `email`, `phone`, `photoURL`, `role` (`client`), `createdAt`.

### `messages`: client portal questions
Written by the client portal (`js/portal-dashboard.js`).

`uid`, `clientName`, `email`, `question`, `status` (`open` / `answered`),
`adminReply`, `repliedAt`, `createdAt`.

### `ratings`: client feedback
`uid`, `clientName`, `caseId`, `caseCode`, `stars` (1–5), `comment`, `createdAt`.

### `signature_requests`: documents sent for e-signature
Created in the dashboard; signed in the client portal.

`clientUid`, `clientName`, `documentName`, `documentUrl`, `status`
(`pending` / `signed`), `createdBy`, `createdAt`, and when signed
`signatureData`, `signedAt`, `signedBy`.

### `tasks`: internal task board
Dashboard only. `title`, `description`, `caseCode`, `deadline` (YYYY-MM-DD),
`status` (`todo`, `progress`, `done`), `createdAt`.

### `documents`
Older document vault; only referenced by the rules and the dashboard backup.

## Billing

### `invoices`
Created in the dashboard (Billing). Portal clients can read their own (`uid`).
`pay.html` never reads or writes this collection directly: it calls the Cloud
Functions `lookupInvoice` (find by number) and `verifyInvoicePayment`, which
confirms the transaction with Flutterwave before marking the invoice paid.

`invoiceId` (`INV-000000`), `clientName`, `amount` (RWF), `caseCode`, `service`,
`status` (`pending` / `paid`), `createdAt`, and when paid `paidAt`,
`paymentMethod`, `flwTransactionId`, `flwTxRef`.

### `payment_records`
Written only by `verifyInvoicePayment` after Flutterwave confirms a payment.
Document id `flw-<transaction id>`, so a transaction can settle one invoice once.

`invoiceId`, `invoiceDocId`, `clientName`, `amount`, `currency`, `method`,
`flwTransactionId`, `flwTxRef`, `customerEmail`, `status` (`successful`), `paidAt`.

## Marketing

| Collection | Fields | Written by |
|---|---|---|
| `newsletter_subscribers` | `name`, `email`, `subscribedAt`, `source` | `js/newsletter.js` (newsletter forms) |
| `template_requests` | `name`, `email`, `template`, `requestedAt` | `legal-templates.html` |
| `subscribers` | `email`, `subscribedAt` | Read by the dashboard's email campaigns |
| `campaigns` | `subject`, `bodyHTML`, `audience`, `recipientCount`, `status`, `sentAt`, `sentBy` | Dashboard email campaigns |

Newsletter sign-ups are saved to `newsletter_subscribers`. The dashboard also
reads the older `subscribers` collection and merges both, one entry per email.

## Staff access

Staff are identified by email, not just by being signed in (client portal users
are signed in too). The staff list lives in three places; keep them the same:

| Where | What it controls |
|---|---|
| `isAdmin()` in `firestore.rules` | What the database allows. This is the real protection. |
| `KL_STAFF_EMAILS` in `admin.html` | Who can open the admin dashboard |
| `ADMIN_EMAILS` in `functions/.env` (comma-separated) | Who can send email campaigns |

Currently: `info.blaw223@yahoo.com`. To add a staff member, create their account in
Firebase Authentication, add their email to all three, then deploy
(`firebase deploy --only firestore:rules,functions,hosting`).

## Online payments (Flutterwave)

1. In `pay.html`, set `FLW_PUBLIC_KEY` to your Flutterwave public key.
2. In `functions/.env`, set `FLW_SECRET_KEY` to the matching secret key
   (Flutterwave dashboard > Settings > API keys). Use test keys first.
3. Deploy: `firebase deploy --only functions,firestore:rules,hosting`.

An invoice is marked paid only when Flutterwave reports the transaction as
successful, in RWF, for at least the invoice amount, with a reference made for
that invoice (`KALTO-<invoice number>-…`).

## Updating the live database (migrations)

Changes to the database's structure, rules and starting data ship in three parts.
Run them in this order after pulling a new version of the site.

**1. Rules and indexes.** `firestore.rules`, `storage.rules` and the composite
indexes in `firestore.indexes.json` (needed by the client portal's lists):

```bash
firebase deploy --only firestore,storage
```

Indexes take a few minutes to build; the Firebase console shows their progress.

**2. Data migrations.** Scripts in `tools/migrations/` that update existing data.
Each runs once and is recorded in the `_migrations` collection (staff tools only;
the website cannot read it).

```bash
cd functions && npm install && cd ..                                 # once
node tools/migrate.js ~/keys/kalto-law-firebase.json --dry-run       # preview
node tools/migrate.js ~/keys/kalto-law-firebase.json                 # apply
node tools/migrate.js ~/keys/kalto-law-firebase.json --status        # what has run
```

The key is a service-account key (Firebase console > Project settings > Service
accounts > Generate new private key). Keep it outside this folder, which is
deployed publicly; the script refuses to run with a key inside it.

| Migration | What it does |
|---|---|
| `001-starter-insights` | Publishes the starter Legal Insights articles (`js/admin-starter-posts.js`), skipping any already published |
| `002-insights-html` | Converts plain-text articles to HTML paragraphs |
| `003-merge-newsletter-subscribers` | Copies old `subscribers` into `newsletter_subscribers`, one per email |
| `004-template-requests-date` | Adds `requestedAt` to older template requests so the dashboard lists them |
| `005-default-statuses` | Fills in missing `status` / `approvalStatus` on enquiries, uploads and appointments |

To add a migration, create `tools/migrations/006-short-name.js` exporting
`{ description, async up({ db, admin, write, log }) }`, make writes through
`write.set` / `write.update` (so `--dry-run` works), and keep it safe to run twice.

**3. Functions and website.**

```bash
firebase deploy --only functions,hosting
```
