DOMAIN=$1

mkdir -p ./data/certificate-manager/certs
cd ./data/certificate-manager/certs

echo "Generating a public key for $DOMAIN"
openssl genrsa -out "$DOMAIN.pem" 4096
  
echo "Creating a signing request for $DOMAIN"
openssl req \
    -new \
    -nodes \
    -sha256 \
    -key "$DOMAIN.pem" \
    -out "$DOMAIN.csr" \
    -subj "/CN=$COMMON_NAME/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:10.0.0.1"

echo "Creating a signed certificate for $DOMAIN"
openssl x509 \
  -req \
  -sha256 \
  -days 365 \
  -CA ca.crt \
  -CAkey ca.key \
  -in "$DOMAIN.csr" \
  -out "$DOMAIN.crt" \
  -passin "pass:$CA_PASS" \
  -CAcreateserial

cd -