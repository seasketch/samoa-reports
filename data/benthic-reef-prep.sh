 #!/bin/bash

SRC_PATH="$DATA_DIR/src/Analytics/ous"
DST_PATH="$DATA_DIR/dist"
RESOLUTION=100

## declare an array variable
declare -a CLASSES=(
  "Algae"
  "Benthic Microalgae"
  "Coral/Algae"
  "Coral"
  "Rock"
  "Rubble"
  "Sand"
  "Seagrass"
  "Unknown"
)

declare -a FILES=(
  "Algae"
  "BenthicMicroalgae"
  "CoralAlgae"
  "Coral"
  "Rock"
  "Rubble"
  "Sand"
  "Seagrass"
  "Unknown"
)

for index in "${!CLASSES[@]}";
do
  echo "Rasterizing benthic class "${CLASSES[$index]}" "
  gdal_rasterize -l Geomorphology_Allen_Coral_Atlas_utm -burn 1.0 -at -tr ${RESOLUTION}.0 ${RESOLUTION}.0 -a_nodata 0.0 -te 196821.6256 8223841.2864 809272.6602 8514334.8225 -ot Byte -of GTiff -where "benthic='${CLASSES[$index]}'" "src/Analytics/Geomorphology_Allen_Coral_Atlas_utm.fgb" "src/Analytics/Geomorphology_Allen_Coral_Atlas_${FILES[$index]}.tif"
done