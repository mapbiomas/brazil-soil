/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset MB_DEGRADATION_BETA_EDGE_DUUMY_v1 - Duumy

Atualização: Convertendo dados de . 

Data: 2024-09-02
Autores: Wallace Silva, Barbara Silva, Taciara Horst, Marcos Cardoso e David Pontes

Contato: contato@mapbiomas.org

*/

var lists = [
  ['edge_1000m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_1000m_v3')],
  ['edge_600m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_600m_v3')],
  ['edge_300m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_300m_v3')],
  ['edge_150m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_150m_v3')],
  ['edge_120m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_120m_v3')],
  ['edge_90m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_90m_v3')],
  ['edge_60m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_60m_v3')],
  ['edge_30m',ee.Image('projects/mapbiomas-workspace/DEGRADACAO/COLECAO/BETA/PROCESS/edge_area/edge_30m_v3')],
];

var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var mask = ee.Image().paint(biomas,'CD_Bioma');
var bounds = biomas.geometry().bounds();

var landcover = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection8/mapbiomas_collection80_integration_v1');
var mb_landcover_values  = [3, 4, 5, 6, 9, 11, 12, 13, 15, 20, 21, 23, 24, 25, 29, 30, 31, 32, 33, 36, 39, 40, 41, 46, 47, 48, 49, 50, 62];
var mb_vegNat_values =     [3, 4, 5, 6, 0, 11, 12, 13,  0,  0,  0,  0,  0,  0, 0,  0,  0,  0, 33,  0,  0,  0,  0,  0,  0,  0, 49, 50,  0];

// Remap land cover classes to native vegetation classes
var landcover_remap = landcover.multiply(0);
mb_landcover_values.forEach(function(classe, i) {
  landcover_remap = landcover_remap.where(landcover.eq(classe), mb_vegNat_values[i]);
});
var landcover_base = landcover_remap.gte(1).eq(0);

lists.forEach(function(list){
  var name = list[0];

  var eeObject = landcover_base.blend(list[1].gte(1)).unmask().rename(list[1].bandNames()).updateMask(mask);
  print("eeObject",name,eeObject);
  Map.addLayer(eeObject.select(0),{min:0,max:1},name);
  
  // Define uma descrição e um ID para a exportação da imagem como um asset no GEE.
  var description = 'MB_DEGRADATION_BETA_{NAME}_DUMMY_v1';
  description = description.replace('{NAME}',name.toUpperCase());
  var assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/' + description;
  
  // Exporta a imagem resultante como um asset no GEE.
  Export.image.toAsset({
  // Define a imagem que será exportada e adiciona uma descrição a ela, incluindo um link para o script no GEE.  
    image:eeObject.set({
      description:"https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLECAO_01%2Fexport-datasets%2FIBGE_FITOFISIONOMIAS_2023_250MIL_DUUMY"
    }), 
    description:description,
    assetId:assetId, 
    pyramidingPolicy:'mode',
    // dimensions:,
    region:bounds, 
    scale:30,
    // crs, crsTransform, 
    maxPixels:1e11,
    // shardSize:
  });
  
});
