# DevOps Challenge — Backend + Postgres on Kubernetes

A minimal stack: Node/Express backend + Postgres, deployed to Kubernetes,
built and shipped by a GitHub Actions pipeline, hardened with readiness/liveness
probes, with a scripted failure scenario to debug on camera.

## Architecture

```
GitHub push --> GitHub Actions (build image, push to GHCR)
                       |
                       v
             self-hosted runner --> kubectl apply / set image
                       |
                       v
        +-------------------------------+
        |     namespace: devops-challenge |
        |                                 |
        |  backend Deployment (2 replicas)|
        |     - readiness: GET /health    |
        |     - liveness:  GET /live      |
        |          |                      |
        |          v                      |
        |  backend Service (NodePort)     |
        |                                 |
        |  postgres Deployment (1 replica)|
        |     - PVC for data              |
        |  postgres Service (ClusterIP)   |
        +-------------------------------+
```

## Local setup (Minikube)

```bash
# 1. Start cluster
minikube start

# 2. Build the image INSIDE minikube's docker daemon so you don't need a registry
eval $(minikube docker-env)
docker build -t devops-challenge-backend:latest ./app

# 3. Deploy everything
kubectl apply -f k8s/

# 4. Watch it come up
kubectl get pods -n devops-challenge -w

# 5. Hit the app
minikube service backend -n devops-challenge --url
curl $(minikube service backend -n devops-challenge --url)
```

If you use **kind** instead of minikube, swap step 2 for
`kind load docker-image devops-challenge-backend:latest` after building normally.

## CI/CD pipeline

`.github/workflows/deploy.yml`:
1. **Build job** (hosted runner) — builds the Docker image from `app/`, pushes
   it to GHCR tagged with the commit SHA and `latest`.
2. **Deploy job** (self-hosted runner, same box as your cluster) — applies the
   manifests and does `kubectl set image` + `kubectl rollout status` so the
   pipeline only succeeds if the rollout actually completes.

Splitting build (hosted) from deploy (self-hosted) is what lets this reach a
local Minikube/Kind cluster without exposing its API server to the internet —
the self-hosted runner already sits inside your network. For a cloud cluster
(EKS/GKE/AKS) you'd drop the self-hosted requirement and authenticate with the
relevant cloud action instead.

**Setup**: register a self-hosted runner on your cluster machine (repo →
Settings → Actions → Runners), and add a `KUBE_CONFIG` repo secret containing
`cat ~/.kube/config | base64` output.

## Reliability improvement: readiness + liveness probes

**What I chose:** separate readiness (`/health`) and liveness (`/live`) probes
on the backend, rather than one generic health check.

**Why:** a single combined probe conflates two different problems. If the
database is briefly unreachable, a combined check makes Kubernetes conclude
the *process* is broken and restart the container — which does nothing to fix
a database problem and adds pointless restart churn. Splitting the checks lets
Kubernetes react correctly to each failure mode:
- **Readiness fails** (DB unreachable) → pod is pulled out of the Service's
  endpoints, traffic stops routing to it, but the container keeps running and
  can recover on its own once the DB comes back.
- **Liveness fails** (process genuinely wedged) → container is restarted.

**Problem it solves:** prevents a transient dependency failure from causing a
restart storm, and prevents user traffic from ever being routed to a pod that
can't actually serve a full request.

**Tradeoff it introduces:** more moving parts to get right — a badly tuned
liveness probe (too aggressive `failureThreshold`/`periodSeconds`) can itself
cause unnecessary restarts under load, and you now have two endpoints to keep
correct as the app evolves instead of one.

## What I simplified (for the tradeoff discussion)

- **Single Postgres replica, `ReadWriteOnce` PVC** — no HA, no automated
  backups, no read replicas. Fine for a demo; a real prod system needs a
  managed DB (RDS/Cloud SQL) or an operator (Zalando/CloudNativePG) with
  failover.
- **NodePort instead of Ingress + TLS** — simplest way to expose the app
  locally; a real deployment needs an Ingress controller, TLS termination, and
  probably a proper DNS name.
- **Secrets as plain Kubernetes Secrets** — base64, not encrypted at rest by
  default. Production should use Sealed Secrets, SOPS, or a vault
  (AWS Secrets Manager / Vault) with an external-secrets operator.
- **No autoscaling** — fixed at 2 replicas. Would add an HPA keyed on CPU or a
  custom metric under real load.
- **No centralized logging/metrics** — `kubectl logs` only. Real prod needs
  Prometheus + Grafana and a log aggregator (Loki/ELK).
- **Self-hosted runner has direct cluster access** — convenient for a demo,
  but it's a fairly wide blast radius; a real setup would scope its RBAC
  tightly or push through GitOps (ArgoCD) instead of `kubectl` from CI.

See `FAILURE_SIMULATION.md` for the scripted failure/debug walkthrough, and
`VIDEO_SCRIPT.md` for a timing outline mapped to the four required sections.
