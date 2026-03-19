#!/bin/bash
# docker/init-db.sh
# Creates multiple databases from POSTGRES_MULTIPLE_DATABASES env var
# Format: "db1:user1:pass1,db2:user2:pass2"

set -e

if [ -z "$POSTGRES_MULTIPLE_DATABASES" ]; then
  echo "No POSTGRES_MULTIPLE_DATABASES set"
  exit 0
fi

IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"

for DB_SPEC in "${DBS[@]}"; do
  IFS=':' read -r DB_NAME DB_USER DB_PASS <<< "$DB_SPEC"
  echo "Creating database: $DB_NAME, user: $DB_USER"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASS';
    CREATE DATABASE "$DB_NAME" OWNER "$DB_USER";
    GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
EOSQL

done
