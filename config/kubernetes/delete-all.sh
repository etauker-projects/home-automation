# Note: committed as a WIP, never got it to work (swicthing do docker compose instead)

kubectl delete service home-automation
kubectl delete statefulset home-automation

kubectl delete pvc home-automation-persistent-volume-claim
kubectl delete pv home-automation-persistent-volume
kubectl delete storageclass home-automation-storage