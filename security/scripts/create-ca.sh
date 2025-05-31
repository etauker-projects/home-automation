mkdir -p ./data/certificate-manager/certs
cd ./data/certificate-manager/certs

echo "Generating a private key for $COMMON_NAME"
openssl genrsa \
  -aes256 \
  -out ca.key \
  -passout "pass:$CA_PASS" \
  4096

echo "Creating a CA for $COMMON_NAME"
openssl req \
  -new \
  -x509 \
  -sha256 \
  -days 3650 \
  -subj "/CN=$COMMON_NAME/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
  -key ca.key \
  -out ca.crt \
  -passout "pass:$CA_PASS" \
  -passin "pass:$CA_PASS"

cd -