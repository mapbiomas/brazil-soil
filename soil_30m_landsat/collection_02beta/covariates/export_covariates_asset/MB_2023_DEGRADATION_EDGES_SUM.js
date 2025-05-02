/*
  * Dataset: MapBiomas Collection 9.0 Summed Edges Dummy
  * 
  * Authors:
  * - Marcos Cardoso
  * 
  * Changes:
  * - 2024-10-27
  * 
  * Contact: contato@mapbiomas.org
  * Last modified on May 01, 2025
  *
  * MapBiomas Soil
  * 
  */

var edgeImages = [
  ['edge_300m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_300m_col9_v1')],
  ['edge_150m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_150m_col9_v1')],
  ['edge_120m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_120m_col9_v1')],
  ['edge_90m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_90m_col9_v1')],
  ['edge_60m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_60m_col9_v1')],
  ['edge_30m', ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_30m_col9_v1')],
];

var biomes = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var biomeMask = ee.Image().paint(biomes, 'CD_Bioma');
var biomeBounds = biomes.geometry().bounds();

var binaryImages = {};
var mb_summedEdges = ee.Image(0);

var palette = ['FFFFFF', '#0B5394', '#6FA8DC', '#19B06F', '#32CD32', '#FFAA5F', '#FF0001'];

edgeImages.forEach(function(edgeImage) {
  var edgeName = edgeImage[0];
  var image = edgeImage[1];

  // Make binary where there is a value and where it is masked making it 0
  var binaryImage = image.gt(0).unmask(0).updateMask(biomeMask);
  binaryImages[edgeName] = binaryImage;
  mb_summedEdges = mb_summedEdges.add(binaryImage);
  print("binaryImage", edgeName, binaryImage);
  Map.addLayer(binaryImage.select(0), {min: 0, max: 1, palette: palette}, edgeName);
});

// Rename the bands of the summed image
var bandNames = mb_summedEdges.bandNames().map(function(bandName) {
  var year = ee.String(bandName).split('_').get(2);
  return ee.String('edge_sum_').cat(year);
});
mb_summedEdges = mb_summedEdges.select(mb_summedEdges.bandNames(), bandNames);

print("mb_summedEdges", mb_summedEdges);
Map.addLayer(mb_summedEdges.select('edge_sum_1985'), {min: 0, max: 6, palette: palette}, 'mb_summedEdges');

  // Define uma descrição e um ID para a exportação da imagem como um asset no GEE.
  var description = 'MB_DEGRADATION_BETA_SUMMED_EDGES_DUMMY';
  description = description
  var assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/' + description;
  // Exporta a imagem resultante como um asset no GEE.
  Export.image.toAsset({
      image: mb_summedEdges.set({
          description: "https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLECAO_01%2Fdraft%2Fedges_dummys_sum"
      }),
      description: description,
      assetId: assetId,
      pyramidingPolicy: 'mode',
      region: biomeBounds,
      scale: 30,
      maxPixels: 1e11,
  });
