# Failure Simulation: Failed Readiness Check

This is scripted so it's reproducible on camera, but walk through it as if you
were debugging it cold — that's what's being evaluated.

## The setup

The backend has an env var `SIMULATE_HEALTH_FAILURE`. When set to `true`,
`/health` always returns `503`, while `/live` keeps returning `200`. This
mimics a real scenario: the process is alive, but something downstream
(here: the DB) is broken and the app correctly reports "not ready."

## Step 1 — Trigger the failure

```bash
kubectl set env deployment/backend SIMULATE_HEALTH_FAILURE=true -n devops-challenge
```

## Step 2 — Show the symptom

```bash
kubectl get pods -n devops-challenge
```
Pods will show `READY 0/1` (or flapping) instead of `1/1` — this is the
visible symptom to point at first, before you know the cause.

```bash
kubectl get endpoints backend -n devops-challenge
```
Notice the pod's IP disappears from the Service's endpoint list — this is
*why* users would see errors or timeouts: traffic literally isn't being
routed there anymore, even though `kubectl get pods` might still show the
container as `Running`.

## Step 3 — Investigate (narrate wrong turns if you have them)

```bash
kubectl describe pod <pod-name> -n devops-challenge
```
Look at the **Events** section at the bottom — it will show repeated
`Readiness probe failed: HTTP probe failed with statuscode: 503`.

A natural wrong first assumption: "the container crashed." Check that it
didn't:
```bash
kubectl get pods -n devops-challenge -o wide
```
Restart count is still 0 — so this is **not** a liveness/crash problem, it's
specifically a readiness problem. That distinction is the whole point of
having split probes (see README's reliability section).

## Step 4 — Confirm root cause directly

```bash
kubectl exec -it <pod-name> -n devops-challenge -- wget -qO- http://localhost:3000/health
```
This returns the `503` with the `SIMULATE_HEALTH_FAILURE` message in the
body — confirms the app itself is reporting not-ready, it's not a network or
kubelet issue.

## Step 5 — Fix it

```bash
kubectl set env deployment/backend SIMULATE_HEALTH_FAILURE=false -n devops-challenge
kubectl rollout status deployment/backend -n devops-challenge
kubectl get endpoints backend -n devops-challenge   # pod IP is back
```

## Talking points for the video

- What you observed first (`0/1` ready) vs. what it actually meant (probe
  failing, not a crash).
- Why you checked restart count before assuming a crash — ruling out
  liveness vs. readiness is the actual debugging skill here.
- How you confirmed root cause directly against the container instead of
  guessing from the outside.
- How this maps to a real incident: a downstream dependency (DB, cache,
  upstream API) going down, and why you'd rather have Kubernetes drain
  traffic from affected pods than either serve errors or restart pods that
  aren't actually broken.

## Optional second scenario (liveness/crash instead)

If you'd rather demo a crash-restart instead of a readiness drain:
```bash
kubectl set env deployment/backend SIMULATE_CRASH=true -n devops-challenge
kubectl get pods -n devops-challenge -w   # watch RESTARTS climb
kubectl describe pod <pod-name> -n devops-challenge   # "Liveness probe failed"
kubectl set env deployment/backend SIMULATE_CRASH=false -n devops-challenge
```
