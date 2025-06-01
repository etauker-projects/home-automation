cd $CERT_DIR
DOMAIN=$1

echo "Verifying certificate for $DOMAIN"
openssl verify -CAfile ca.crt -verbose "$DOMAIN.crt"
if [ $? -eq 0 ]; then
    echo "Certificate for $DOMAIN is valid."
else
    echo "Certificate for $DOMAIN is invalid."
fi
cd - > /dev/null 2>&1