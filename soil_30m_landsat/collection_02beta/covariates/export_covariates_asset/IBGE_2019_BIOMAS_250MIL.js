/*
 * Dataset: IBGE 2019 Biomes 250k
 * 
 * Authors:
 * - Taciara Horst
 * 
 * Changes:
 * - Generating dummy variables for Brazilian biomes
 * 
 * Contact: contato@mapbiomas.org
 * Last modified on May 01, 2025
 * 
 * MapBiomas Soil
 */

var geometry = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');

var region = geometry.geometry().bounds();

var legend = ee.Dictionary({
"Amazônia":"Amazonia",
"Caatinga":"Caatinga",
"Cerrado":"Cerrado",
"Mata Atlântica": "Mata_Atlantica",
"Pampa": "Pampa",
"Pantanal":"Pantanal"
})

var featureCollection = geometry
  .map(function(feature){
    var legenda_1 = legend.get(feature.getString('Bioma'))

    return feature.set('legenda_1',legenda_1)
  });

var image = featureCollection.aggregate_array('legenda_1').distinct().sort()
  .aside(print)
  .iterate(function(current,previous){
    
    var legenda_1 = ee.String(current);

    var img = featureCollection.filter(ee.Filter.eq('legenda_1',legenda_1));

    img = ee.Image().paint(img).eq(0).unmask(0).rename(legenda_1).byte()
    .clip(geometry);
    
    img = img.focalMode({
      radius:1,
      units:'meters',
    })
    

    return ee.Image(previous)
      .addBands(img);
    
  },ee.Image().select());

// print(image)

image = ee.Image(image);

print(image)

Map.addLayer(image)

var description = 'IBGE_2019_BIOMAS_250MIL';
var assetId = 'projects/mapbiomas-workspace/SOLOS/' + description;


Export.image.toAsset({
  image:image, 
  description:description,
  assetId:assetId, 
  pyramidingPolicy:'mode',
  region:region, 
  scale:30,
  maxPixels:1e11,
});
