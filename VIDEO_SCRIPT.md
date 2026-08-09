# Video Outline (target 9–10 min, limit 8–12)

## 1. Live Demo — 3–4 min
- `kubectl get pods,svc -n devops-challenge` — everything running
- `curl` the app a couple times, show the visit counter incrementing (proves
  backend <-> DB works end to end)
- Trigger the GitHub Actions pipeline (push a trivial change, e.g. bump a
  comment) — show the Actions run: build job going green, deploy job doing
  `kubectl set image` + `rollout status`
- `kubectl rollout history deployment/backend -n devops-challenge` to show the
  new revision landed

## 2. Architecture Walkthrough — 2–3 min
- Draw/describe: GitHub Actions → GHCR → self-hosted runner → cluster
- Namespace, backend Deployment (2 replicas) + Service, Postgres Deployment +
  PVC + Service
- Why probes are split (readiness vs liveness) — the reliability decision
- Why self-hosted runner for the deploy job specifically

## 3. Failure Debugging Walkthrough — 2–3 min
- Follow `FAILURE_SIMULATION.md` steps 1–5 live
- Narrate the "0/1 ready but 0 restarts" observation and what it ruled out
- Show the fix and confirm recovery via `kubectl get endpoints`

## 4. Tradeoff Discussion — 1–2 min
- Pull directly from the "What I simplified" section of `README.md`:
  single DB replica, NodePort not Ingress, plaintext-ish Secrets, no
  autoscaling, no observability stack, broad CI access to the cluster
- One sentence each on what you'd change first in a real prod environment
  (likely: managed Postgres, then Ingress+TLS, then Prometheus/Grafana)
