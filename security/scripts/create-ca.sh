mkdir -p $CERT_DIR
cd $CERT_DIR

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
  -days 3652 \
  -subj "/CN=$COMMON_NAME/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
  -key ca.key \
  -out ca.crt \
  -passout "pass:$CA_PASS" \
  -passin "pass:$CA_PASS"

cd - > /dev/null 2>&1