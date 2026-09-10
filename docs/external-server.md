# Run DECWAR on AWS Lightsail with Bitnami

This recipe runs the Austin playable TypeScript server as a systemd service on
an AWS Lightsail Bitnami Linux instance. It keeps the galaxy data outside the
Git checkout, starts after reboot, restarts after a process failure, and shuts
down through DECWAR's normal persistence path.

The server requires Node.js 24 or newer, npm, Git, a Lightsail static or public
IP address, and inbound TCP port 2423. Bitnami documents `bitnami` as the
[default SSH account](https://docs.bitnami.com/virtual-machine/infrastructure/nodejs/get-started/first-steps/).
Commands below run as that account unless prefixed with `sudo`.

## 1. Connect and check the runtime

```sh
ssh -i /path/to/lightsail-key.pem bitnami@SERVER_IP
node --version
npm --version
command -v node
```

Install Node.js 24 or newer if `node --version` reports an older release or the
command is absent. After Node is available, create a stable path for systemd.
This preserves the actual Node location supplied by the Bitnami image or your
Node installation:

```sh
mkdir -p /home/bitnami/bin
ln -sfn "$(command -v node)" /home/bitnami/bin/node
/home/bitnami/bin/node --version
```

## 2. Install and verify DECWAR

```sh
cd /home/bitnami
git clone https://github.com/erictfree/DECWAR.git
cd DECWAR
npm ci
npm run check
mkdir -p /home/bitnami/decwar-data/austin
mkdir -p /home/bitnami/decwar-logs
```

`npm run check` verifies the preserved archives, TypeScript, and the game test
suite. The service stores mutable state in `/home/bitnami/decwar-data/austin`,
so `git pull` cannot overwrite the active galaxy. Only one DECWAR host may use
that directory at a time; its lock rejects a second process.

## 3. Test the public listener on the VM

The normal default remains localhost. External service is an explicit choice:

```sh
npm start -- --variant austin --bind 0.0.0.0 --port 2423 \
  --data /home/bitnami/decwar-data/austin \
  --log /home/bitnami/decwar-logs/server.jsonl
```

From a second SSH session, verify the listener:

```sh
ss -ltn | grep 2423
```

Press Ctrl-C in the first session after this check. A normal SIGINT or SIGTERM
closes player sessions, releases the data-directory lock, and records the host
shutdown.

## 4. Install the Bitnami systemd service

The repository includes `deploy/decwar-bitnami.service` with the paths above:

```sh
cd /home/bitnami/DECWAR
sudo cp deploy/decwar-bitnami.service /etc/systemd/system/decwar.service
sudo systemctl daemon-reload
sudo systemctl enable --now decwar
sudo systemctl status decwar --no-pager
```

Useful operating commands are:

```sh
sudo systemctl restart decwar
sudo systemctl stop decwar
sudo journalctl -u decwar -n 100 --no-pager
tail -f /home/bitnami/decwar-logs/server.jsonl
```

The unit runs as `bitnami`, restarts only after failure, and leaves an intentional
stop stopped. Edit its `User`, paths, or Node symlink if the instance differs,
then run `sudo systemctl daemon-reload` and restart it.

## 5. Open Lightsail TCP port 2423

In the AWS Lightsail console, open the instance, choose **Networking**, and in
the IPv4 firewall add a **Custom / TCP / 2423** rule. Restrict the source IP
during initial testing if only one client needs access. Use all IPv4 addresses
only when the game is ready for public players. AWS documents these controls in
[Add firewall rules to Lightsail instances](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-editing-firewall-rules.html).

Lightsail maintains a separate IPv6 firewall. This service binds IPv4 through
`0.0.0.0`; do not add an IPv6 rule unless you also choose an IPv6 listener and
test it. If the VM's own firewall is active, allow the port there too:

```sh
sudo ufw status
sudo ufw allow 2423/tcp
```

From another machine, connect to the public or static IP:

```sh
telnet SERVER_IP 2423
```

If the local `ss` check succeeds but the remote connection fails, recheck the
Lightsail IPv4 rule and any active VM firewall. DNS is optional; an A record can
point a name at a Lightsail static IP after direct-IP testing succeeds.

DECWAR uses ordinary Telnet, so game traffic is unencrypted. Captain names,
commands, and radio messages should be treated as public game text.

## 6. Update and back up

Before updating:

```sh
cd /home/bitnami/DECWAR
git pull --ff-only
npm ci
npm run check
sudo systemctl restart decwar
```

Back up a consistent stopped galaxy:

```sh
sudo systemctl stop decwar
tar -C /home/bitnami/decwar-data -czf "/home/bitnami/decwar-austin-$(date +%Y%m%d-%H%M%S).tgz" austin
sudo systemctl start decwar
```

Retain the repository commit ID with each backup. The automated-player
handoff at `experimental/automated-player/HANDOFF.md` records the separate
five-per-side client command and strategy checkpoint.
