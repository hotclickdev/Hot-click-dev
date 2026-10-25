#!/usr/bin/env bash
# C1 (auditoría pagos): quita la ACL public-read de los comprobantes SINPE ya subidos.
# Los comprobantes viejos se subieron a s3://$AWS_S3_BUCKET/comprobantes-sinpe/ con ACL pública.
# La app ahora los sirve solo por URL firmada (misma clave), así que dejarlos privados no rompe nada.
#
# NO SE CORRE AUTOMÁTICAMENTE. Por defecto es dry-run: solo lista lo que cambiaría.
#   AWS_S3_BUCKET=hotclick-media scripts/c1-comprobantes-sinpe-privados.sh            # dry-run
#   AWS_S3_BUCKET=hotclick-media APLICAR=si scripts/c1-comprobantes-sinpe-privados.sh # aplica
# Requiere aws CLI con permisos s3:ListBucket, s3:GetObjectAcl y s3:PutObjectAcl.
# Si el bucket tiene "Object Ownership = Bucket owner enforced" las ACL no aplican: revisar la
# bucket policy (debe no dar s3:GetObject público sobre comprobantes-sinpe/*) y no usar este script.
set -euo pipefail

: "${AWS_S3_BUCKET:?Definí AWS_S3_BUCKET}"
PREFIJO="${PREFIJO:-comprobantes-sinpe/}"
APLICAR="${APLICAR:-no}"

echo "Bucket=$AWS_S3_BUCKET prefijo=$PREFIJO aplicar=$APLICAR"
total=0; cambiados=0
while read -r clave; do
  [ -z "$clave" ] && continue
  total=$((total+1))
  publico=$(aws s3api get-object-acl --bucket "$AWS_S3_BUCKET" --key "$clave" \
    --query "Grants[?Grantee.URI=='http://acs.amazonaws.com/groups/global/AllUsers'] | length(@)" --output text)
  if [ "$publico" != "0" ]; then
    if [ "$APLICAR" = "si" ]; then
      aws s3api put-object-acl --bucket "$AWS_S3_BUCKET" --key "$clave" --acl private
      echo "privado: $clave"
    else
      echo "[dry-run] haría privado: $clave"
    fi
    cambiados=$((cambiados+1))
  fi
done < <(aws s3api list-objects-v2 --bucket "$AWS_S3_BUCKET" --prefix "$PREFIJO" --query 'Contents[].Key' --output text | tr '\t' '\n' | grep -v '^None$' || true)

echo "Objetos revisados=$total públicos=$cambiados"
echo "Revisá también la bucket policy:"
echo "  aws s3api get-bucket-policy --bucket $AWS_S3_BUCKET"
