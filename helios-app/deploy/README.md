# Production deployment

Production for `helioschat.space` runs on `154.222.19.38` (CentOS 7 + nginx +
Docker Compose). The previous VPS `149.88.73.252` is retired and unreachable —
do not deploy there.

Nginx terminates TLS and proxies `helioschat.space` to
`127.0.0.1:8080`, where the `helios` container listens. SQLite data lives in
the Docker volume `helios-app_helios-data`.

## Push a Docker release (current production path)

From `helios-app/`, with the VPS root password in `SSHPASS` (never commit it):

```bash
chmod +x deploy/push-docker.sh
SSHPASS='...' ./deploy/push-docker.sh 154.222.19.38
```

That rsyncs the app tree to `/root/helios-space-sp-/helios-app`, rebuilds the
`helios` image, recreates the container, and keeps the existing data volume.

Create `/root/helios-space-sp-/helios-app/.env` on the server once (mode 600)
with:

```bash
HELIOS_ADMIN_EMAIL=...
HELIOS_ADMIN_PASSWORD=...
```

Never commit `.env` or passwords.

## Legacy systemd release scripts

`deploy/push-release.sh`, `deploy/release.sh`, and `deploy/install-release.sh`
target a native Node + systemd layout under `/opt/helios-space`. The current
production host does not use that path.

Helios is completely free. There is no paid plan and no Stripe checkout.
Do not set payment keys on the server. Billing routes return 410 for signed-in
sessions (anonymous callers get 401).
