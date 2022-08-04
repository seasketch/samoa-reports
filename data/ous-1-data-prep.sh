#!/bin/bash
# Run in workspace

DATA_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$DATA_DIR/ous_config.sh"

for CLASS in "${CLASSES[@]}"
do
   echo "Converting "$CLASS" to COG, recalc min/max"
   gdalwarp -t_srs "EPSG:4326" "${SRC_PATH}/${CLASS}.tif" "${DST_PATH}/${CLASS}_4326.tif"
   gdal_translate -r nearest -of COG -stats "${DST_PATH}/${CLASS}_4326.tif" "${DST_PATH}/${CLASS}_cog.tif"
   echo ""
done
