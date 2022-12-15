# Note: committed as a WIP, never got it to work (swicthing do docker compose instead)

kubectl apply -f storage-class.yml
kubectl apply -f persistent-volume.yml
kubectl apply -f persistent-volume-claim.yml

kubectl apply -f service.yml
kubectl apply -f stateful-set.yml
