# Production deployment

The production server uses versioned releases under `/opt/helios-space/releases`,
a `current` symlink, and the `helios-space.service` systemd unit.

Persistent SQLite data lives in `/var/lib/helios-space`, outside every release.
The Node service binds to `127.0.0.1:8080`; Caddy owns public HTTP/HTTPS.

## Push a release

From `helios-app/`, with the VPS root password in `SSHPASS` (never commit it):

```bash
chmod +x deploy/push-release.sh
SSHPASS='...' ./deploy/push-release.sh 149.88.73.252
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

Helios is completely free. There is no paid plan and no Stripe checkout.
Do not set payment keys on the server. Billing routes return 410.
