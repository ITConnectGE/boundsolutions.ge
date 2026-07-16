# Email setup (Mailgun)

Two independent things share one Mailgun (EU) account:

- **Sending** — CV/contact notifications, OTP codes, and inbox replies go out over Mailgun SMTP.
- **Receiving** — email sent to the domain is captured into the admin **Email** tab (laravel-mailbox).

Everything below is done **once on the server** (`/srv/bound/backend/.env`) + in the Mailgun dashboard. `.env` is gitignored, so it survives deploys.

---

## A. Sending (SMTP)

1. Mailgun → **Send → Domains** → verify your sending domain (e.g. `boundsolutions.ge`).
   Add the **SPF (TXT)** and **DKIM (TXT)** records it lists into Cloudflare.
2. Open the domain → **SMTP credentials** → copy the login (`postmaster@…`) and set/copy its password.
3. In `/srv/bound/backend/.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.eu.mailgun.org          # EU host — account is app.eu.mailgun.com
MAIL_PORT=587
MAIL_SCHEME=null
MAIL_USERNAME=postmaster@boundsolutions.ge
MAIL_PASSWORD=<smtp password>
MAIL_FROM_ADDRESS=careers@boundsolutions.ge
MAIL_FROM_NAME="Bound Solutions"
MAIL_TO_ADDRESS=careers@boundsolutions.ge   # where CV/contact notifications land
```

> If you verified a subdomain (`mg.boundsolutions.ge`) instead of the root, use
> `postmaster@mg.boundsolutions.ge` and `MAIL_FROM_ADDRESS=careers@mg.boundsolutions.ge`.

---

## B. Receiving into the admin inbox

Receiving needs the domain's **MX** records to point at Mailgun. (A domain can only send
its incoming mail to one place — after this, mail to that domain goes to the app, not a
regular mailbox.)

1. Mailgun → **Send → Domains → your domain → DNS records** → add the **MX** records into Cloudflare:

   ```
   MX   boundsolutions.ge   10   mxa.eu.mailgun.org
   MX   boundsolutions.ge   10   mxb.eu.mailgun.org
   ```

   (Set Cloudflare proxy to **DNS only / grey cloud** for MX — MX is never proxied.)

2. Mailgun → **Send → Receiving → Routes → Create/Edit route**:
   - **Expression type:** Match recipient → `.*@boundsolutions.ge` (or a specific address like `careers@boundsolutions.ge`).
   - **Store and notify:** ON → `https://portal.boundsolutions.ge/laravel-mailbox/mailgun/mime`
   - **Forward:** you can leave this OFF (Store-and-notify is what delivers the full message).

3. Mailgun → **Send → Webhooks** → copy the **HTTP webhook signing key**. In `.env`:

```env
MAILBOX_DRIVER=mailgun
MAILBOX_MAILGUN_KEY=<HTTP webhook signing key>   # NOT the SMTP password / API key
```

---

## C. Apply on the server

```bash
cd /srv/bound
bash deploy/update.sh          # installs laravel-mailbox, migrates, rebuilds config cache

# nginx now needs the /laravel-mailbox route (added to the repo config):
sudo cp deploy/nginx-boundsolutions.conf /etc/nginx/sites-available/boundsolutions
sudo certbot --nginx -d boundsolutions.ge -d www.boundsolutions.ge -d portal.boundsolutions.ge
sudo nginx -t && sudo systemctl reload nginx
```

> If you edit `.env` again **after** a deploy, re-cache config so it takes effect:
> `cd /srv/bound/backend && php artisan config:cache`

---

## D. Test

- **Sending:** `cd /srv/bound/backend && php artisan tinker --execute="Mail::raw('ok', fn(\$m)=>\$m->to('you@gmail.com')->subject('test'));"`
- **Receiving:** email `careers@boundsolutions.ge` from any account → it appears in the admin **Email** tab within a few seconds. Open it and hit **Send** to reply.

### If received mail doesn't show up
- Mailgun → **Send → Logs**: is the route firing? Any `4xx` from the webhook?
- `401 Invalid Mailgun signature` → `MAILBOX_MAILGUN_KEY` is wrong (must be the *HTTP webhook signing key*).
- Nothing in logs → MX records not live yet, or the route recipient doesn't match.
- `curl -I https://portal.boundsolutions.ge/laravel-mailbox/mailgun/mime` should hit Laravel (405/419/422), **not** the static site — otherwise the nginx `/laravel-mailbox` block isn't applied.
