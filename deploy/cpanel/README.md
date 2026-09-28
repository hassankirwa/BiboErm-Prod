# Production deployment

Production is deployed whenever `prod` is updated. The normal release path is a
pull request from `development` into `prod`; merging it produces the `prod` push
that starts deployment. The workflow can also be run manually from GitHub Actions.

## Required GitHub environment secrets

Create a GitHub environment named `production` and add:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Production server hostname or IP address |
| `DEPLOY_USER` | Restricted production deployment user |
| `DEPLOY_PORT` | SSH port, normally `22` |
| `DEPLOY_SSH_PRIVATE_KEY` | Private key matching the server deployment key |
| `DEPLOY_KNOWN_HOSTS` | Pinned SSH host-key line for the production server |

Do not commit private keys, `.env` files, database credentials, or mailbox
passwords. Runtime environment files remain on the server and are excluded from
the deployment synchronization.

## Flow

1. Open a pull request from `development` to `prod`.
2. The validation workflow runs the backend and frontend tests and builds the UI.
3. Merge the pull request after validation succeeds.
4. The deployment workflow checks out `prod`, synchronizes the source, installs
   locked dependencies, builds Next.js, runs pending Laravel migrations, refreshes
   caches, restarts the frontend and queue services, and checks `/up` over HTTPS.

Production deployments intentionally do not run database seeders.
