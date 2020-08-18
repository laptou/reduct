#!/bin/bash


cd `dirname $0`/../secret
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout root-ca.key -out root-ca.pem -subj "/C=US/CN=Reduct CA"
openssl x509 -outform pem -in root-ca.pem -out root-ca.crt

cat <<EOF > domains.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
DNS.2 = lvh.me
EOF

openssl req -new -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.csr -subj "/C=US/ST=New York/L=Ithaca/O=Reduct/CN=localhost.local"
openssl x509 -req -sha256 -days 1024 -in localhost.csr -CA root-ca.pem -CAkey root-ca.key -CAcreateserial -extfile domains.ext -out localhost.crt
openssl req -x509 -newkey rsa:4096 -keyout saml-key.pem -out saml-cert.pem -days 365
