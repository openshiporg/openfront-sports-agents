# Agent rules

NEVER build outbox, texting/email notification machinery, cron routes, worker services, or setInterval/setTimeout loops (e.g. in `instrumentation.ts`) into this app. Time-based state is computed on read, advanced idempotently on the request that touches it, or advanced by a staff button (the monthly forecast snapshot is the staff "Take snapshot" button). External events go only through Openfront Commerce webhooks. Reports are Export buttons; invites are copyable links. Password-reset mail is the only request-time email kept.
