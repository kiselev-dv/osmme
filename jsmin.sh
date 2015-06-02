#!/bin/bash

java -jar /opt/compiler.jar \
--js '/opt/osm/osmme/js/misc.js' \
--js '/opt/osm/osmme/js/main.js' \
--js '/opt/osm/osmme/js/meRouter.js' \
--js '/opt/osm/osmme/js/meMap.js' \
--js '/opt/osm/osmme/js/meI18n.js' \
--js '/opt/osm/osmme/js/meIGeocoder.js' \
--js '/opt/osm/osmme/js/meSearch.js' \
--js '/opt/osm/osmme/js/meOSMDoc.js' \
--js '/opt/osm/osmme/js/meDetails.js' \
--js_output_file='/opt/osm/osmme/js/osmme.min.js'

