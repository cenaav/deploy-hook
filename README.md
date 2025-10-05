# deploy-hook
This project is a lightweight webhook server designed to automate deployments of multiple projects on a server whenever changes are pushed to GitHub (or other Git-based repositories). It provides a secure and configurable way to trigger project-specific deployment scripts without exposing personal files or the server’s sensitive directories.

# example
curl -X POST https://deployhook.amonproject.com/project/exar-ui-streamlet -H "X-Deploy-Secret: 5cjQJ11PfrDGFyR7XG3Xs375oGVWemz0"

# env
PORT=37025
WEBHOOK_SECRET=5cjQJ11PfrDGFyR7XG3Xs375oGVWemz0