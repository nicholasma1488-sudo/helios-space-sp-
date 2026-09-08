# Production deployment

The production server uses versioned releases under `/opt/helios-space/releases`,
a `current` symlink, and the `helios-space.service` systemd unit.

Persistent SQLite data lives in `/var/lib/helios-space`, outside every release.
The Node service binds to `127.0.0.1:8080`; nginx owns public HTTP/HTTPS for
`helioschat.space` (Let's Encrypt).

## Host notes (CentOS 7)

Current production host: `154.222.19.38`.

CentOS 7 ships glibc 2.17. Official Node 22 Linux builds need a newer glibc, so
this box uses an unofficial Node 22 `linux-x64-glibc-217` binary under
`/opt/node-unofficial`, with `/usr/local/bin/node` pointing at it. Always prefer
`PATH=/usr/local/bin:$PATH` on the VPS; nvm installs on this image may be broken.

Do not re-enable the old Docker Compose `helios` container on port 8080 — it
conflicts with the systemd unit. Keep its restart policy `no`.

## Push a release

From `helios-app/`, with the VPS root password in `SSHPASS` (never commit it):

```bash
chmod +x deploy/push-release.sh
SSHPASS='...' ./deploy/push-release.sh 154.222.19.38
```

That builds the frontend, rsyncs `dist/` and `server/` into
`/opt/helios-space/releases/<UTC timestamp>`, runs `npm ci --omit=dev` on the
server, flips `current`, and restarts `helios-space`.

`deploy/release.sh` packs a local tarball if you need an offline artifact.
`deploy/install-release.sh` activates an already-copied release directory on
the VPS.

Application admin access is disabled unless `HELIOS_ADMIN_EMAIL` and
`HELIOS_ADMIN_PASSWORD` are added through a root-readable systemd environment
file or drop-in. Never commit those values.

Billing keys are optional. Helios Space is completely free in product copy;
without Stripe keys, checkout stays unavailable and the free path remains open.
Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`
on the server only if you intentionally re-enable paid checkout — never in git.
