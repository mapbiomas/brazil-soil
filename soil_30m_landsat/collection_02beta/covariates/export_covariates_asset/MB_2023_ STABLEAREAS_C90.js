/*
  * Dataset: MapBiomas Collection 9.0 Stable Areas
  * 
  * Authors:
  * - Wallace Silva
  * - Barbara Silva
  * - Taciara Horst
  * - Marcos Cardoso
  * 
  * Changes:
  * - 2024-08-26
  * 
  * Contact: contato@mapbiomas.org
  * Last modified on May 01, 2025
  * 
  * MapBiomas Soil
  */


var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-75.03585878741384, 6.656330390133171],
          [-75.03585878741384, -34.459089909580825],
          [-33.024140037413844, -34.459089909580825],
          [-33.024140037413844, 6.656330390133171]]], null, false);

// Construindo áreas estáveis
 
// construindo areas estaveis
 
var classification = 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1';
var lulc = ee.Image(classification);

Map.addLayer(lulc,{},'lulc');

var mask = lulc.select(0).gte(1);  

lulc.bandNames().evaluate(function(bandnames){
  var slice_bands = bandnames.slice(0,-1);
  var last_band = bandnames[bandnames.length - 1];
  var last_image = lulc.select(last_band);
  
  var test_stable_areas = slice_bands
    .map(function(band){
      var year_image = lulc.select(band);
      return year_image.subtract(last_image).rename('classification');
    });
    
  var stable_areas_eq = ee.ImageCollection(test_stable_areas)
    .sum()
    .eq(0)
    .rename('Area_Estavel');
    // .selfMask();
  
  Map.addLayer(stable_areas_eq,{},'stable_areas_eq');

  var description = 'LULC_C90_STABLE_AREAS_30M_DUMMY_v4';
  
  // var stable_areas = stable_areas_eq.set({
  //   'index':description,
  //   'date_create':ee.Date(Date.now()).format('y-M-d'),
  //   'theme':'GT-Solos',
  //   'decription':'https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLAECAO_01%2Fexport-datasets%2Fdummies-stable-areas'
  // }).updateMask(mask.gte(1))


  // print(stable_areas);
  // Map.addLayer(stable_areas,{},'stable_areas');
  
  Export.image.toAsset({
    image:stable_areas_eq,
    description:description,
    assetId:'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/'+description,
    pyramidingPolicy:'mode',
    // dimensions:,
    region:geometry,
    scale:30, 
    // crs:,
    // crsTransform:,
    maxPixels:1e13,
    // shardSize:
  });
});
