#!/bin/bash

DATA_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_PATH="$DATA_DIR/src/Data_Products/OUS/heatmaps"
DST_PATH="$DATA_DIR/dist"

## declare an array variable
declare -a CLASSES=(
  "Commercial_Fishing"
  "Subsistence_Fishing"
)