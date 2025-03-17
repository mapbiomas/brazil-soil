var geometry = 
    /* color: #d63000 */
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
// construindo areas estaveis
 
var classification = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1';
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
    
  var stable_areas = ee.ImageCollection(test_stable_areas)
    .sum()
    .eq(0);
    // .selfMask();
  
  Map.addLayer(stable_areas.randomVisualizer(),{},'stable_areas');

  var description = 'LULC_STABLE_AREAS_30M_DUMMY';
  
  stable_areas = stable_areas.set({
    'index':description,
    'date_create':ee.Date(Date.now()).format('y-M-d'),
    'theme':'GT-Solos',
    'decription':'https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLAECAO_01%2Fexport-datasets%2Fdummies-stable-areas'
  }).updateMask(mask.gte(1))
  .rename('Area_Estavel');

  print(stable_areas);

  Export.image.toAsset({
    image:stable_areas,
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