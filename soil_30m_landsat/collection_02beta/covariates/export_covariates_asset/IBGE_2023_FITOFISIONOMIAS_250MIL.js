/*
 * Dataset: IBGE 2023 Fitofisionomias 250k
 * 
 * Authors:
 * - Taciara Horst
 * 
 * Processing:
 * - Generating dummy variables for Brazilian phytophysiognomies
 * - Extrapolation of 3km beyond the country's border
 * - Filling empty pixels with interpolation
 * 
 * Contact: contato@mapbiomas.org
 * Last modified on May 01, 2025
 * 
 * MapBiomas Soil
 */

// Dicionário de Legendas: Mapeia nomes de classes de vegetação para abreviações.
var legend = ee.Dictionary({
  "Floresta Ombrófila Aberta":"Floresta_Ombrofila_Aberta",
  "Floresta Estacional Decidual":"Floresta_Estacional_Decidual",
  "Floresta Ombrófila Densa":"Floresta_Ombrofila_Densa",
  "Floresta Estacional Semidecidual":"Floresta_Estacional_Semidecidual",
  "Campinarana":"Campinarana",
  "Floresta Ombrófila Mista":"Floresta_Ombrofila_Mista",
  "Formação Pioneira":"Formacao_Pioneira",
  "Savana":"Savana",
  "Savana-Estépica":"Savana_Estepica",
  "Contato (Ecótono e Encrave)":"Contato_Ecotono_e_Encrave",
  "Corpo d'água continental":"Corpo_dagua_continental",
  "Floresta Estacional Sempre-Verde":"Floresta_Estacional_Sempre_Verde",
  "Estepe":"Estepe",
  });
  
  // Carrega uma coleção contendo dados geoespaciais de vegetação e aplica uma função a cada recurso.
  var featureCollection = ee.FeatureCollection('projects/mapbiomas-solos-workspace/assets/covariates/vegetation/IBGE_fitofissionomia_250mil_2023')
  // Define a propriedade 'legenda_1' do recurso com a abreviação correspondente.
    .map(function(feature){
      var legenda_1 = legend.get(feature.getString('legenda_1'));
  // Define a propriedade 'legenda_1' do recurso com a abreviação correspondente.
      return feature.set('legenda_1',legenda_1);
    });
  // Carrega uma coleção contendo dados geoespaciais de biomas.
  var biomas = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
  // Calcula a região envolvente (bounds) dos biomas.
  var region = biomas.geometry().bounds();
  // Cria uma máscara (mask) com base nos biomas.
  var mask = ee.Image().paint(biomas).eq(0);
  // Inicializa uma variável 'image' para armazenar a imagem resultante.
  var image = featureCollection.aggregate_array('legenda_1').distinct().sort()
    .aside(print)  // Imprime a lista de abreviações no console.
    .iterate(function(current,previous){
  // Converte a abreviação atual em uma string.
      var legenda_1 = ee.String(current);
  // Filtra os recursos com base na legenda.
      var feature = featureCollection.filter(ee.Filter.eq('legenda_1',legenda_1));
      var img = ee.Image()
      .paint(feature)
      .eq(0).unmask(0)
      .rename(legenda_1)
      .byte()
      // .clip(featureCollection);
      .updateMask(mask);
      return ee.Image(previous)
        .addBands(img);
    },ee.Image().select());
  image = ee.Image(image);
  
  
  Map.addLayer(image,{min: 0, max:1, bands:'Floresta_Ombrofila_Aberta'},'image');
  
  var params = {
    radius:1000,
    units:'meters',
  };
  
  var interpolation = image
    .focalMax(params) 
    .focalMax(params)
    .focalMax(params)
    .unmask(0);
  
  // Map.addLayer(image.select(0),{min:160,max:655},'image');
  image = interpolation.blend(image);
  print(image);
  
  Map.addLayer(image,{min: 0, max:1, bands:'Floresta_Ombrofila_Aberta'},'focalMax');
  
  // Define uma descrição e um ID para a exportação da imagem como um asset no GEE.
  var description = 'IBGE_2023_FITOFISIONOMIA_250MIL';
  var assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/' + description;
  
  // Exporta a imagem resultante como um asset no GEE.
  Export.image.toAsset({
    image:image.set({
      description:"https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3APRODUCTION%2F2024_c02beta%2Fcovariates%2Fexport_covariates_asset%2FIBGE2023_FITOFISIONOMIAS_250MIL"
    }), 
    description:description,
    assetId:assetId, 
    pyramidingPolicy:'mode',
    region:region, 
    scale:30,
    maxPixels:1e11,
  });
