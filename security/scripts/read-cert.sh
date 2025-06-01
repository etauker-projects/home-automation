cd $CERT_DIR
DOMAIN=$1

echo "Reading certificate for $DOMAIN"
openssl x509 -in "$DOMAIN.crt" -text
# openssl x509 -in "$DOMAIN.crt" -purpose -noout -text
cd - > /dev/null 2>&1