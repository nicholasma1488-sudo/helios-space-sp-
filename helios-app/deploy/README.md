# Production deployment

The production server uses versioned releases under `/opt/helios-space/releases`,
a `current` symlink, and the `helios-space.service` systemd unit.

Persistent SQLite data lives in `/var/lib/helios-space`, outside every release.
The Node service binds to `127.0.0.1:8080`; Caddy owns public HTTP/HTTPS.

Application admin access is disabled unless `HELIOS_ADMIN_EMAIL` and
`HELIOS_ADMIN_PASSWORD` are added through a root-readable systemd environment
file or drop-in. Never commit those values.
