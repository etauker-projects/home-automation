DOMAIN=$1

# TODO: add IP of the server
IP=$2
EXTFILE="subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1,IP:$IP"
# EXTFILE="subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,IP:127.0.0.1"

mkdir -p $CERT_DIR
cd $CERT_DIR

echo "Generating a public key for $DOMAIN"
openssl genrsa -out "$DOMAIN.key" 4096
  
echo "Creating a signing request for $DOMAIN"
openssl req \
    -new \
    -nodes \
    -sha256 \
    -key "$DOMAIN.key" \
    -out "$DOMAIN.csr" \
    -subj "/CN=$COMMON_NAME/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
    -addext $EXTFILE

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
  -extensions SAN \
  -extfile <(printf "[SAN]\n$EXTFILE") \
  -CAcreateserial

echo "Outputting certificate chain for $DOMAIN"
cat  ca.crt "$DOMAIN.crt" > "$DOMAIN.fullchain.crt"

cd - > /dev/null 2>&1