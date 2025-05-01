/*
 * Dataset: IBGE 2019 Provinces 250k
 * 
 * Authors:
 * - Taciara Horst
 * 
 * Changes:
 * - Generating dummy variables for Brazilian provinces
 * - Extrapolation of 3km beyond the country's border
 * 
 * Contact: contato@mapbiomas.org
 * Last modified on May 01, 2025
 * 
 * MapBiomas Soil
 */

// Import a coleção de províncias geológicas do IBGE.
var table = ee.FeatureCollection("projects/mapbiomas-solos-workspace/assets/covariates/geology/IBGE_provinciasEstruturais_250mil");

// Dicionário de Legendas: Mapeia nomes de classes para abreviações.
var legend = ee.Dictionary({
  "Amazonas-Solimões":"Amazonas_Solimoes_Provincia",
  "Amazônia":"Amazonia_Provincia",
  "Borborema": "Borborema_Provincia",
  "Cobertura Cenozoica": "Cobertura_Cenozoica_Provincia",
  "Costeira e Margem Continental": "Costeira_Margem_Continental_Provincia",
  "Gurupi": "Gurupi_Provincia",
  "Mantiqueira": "Mantiqueira_Provincia",
  "Massa d'água": "Massa_d_agua_Provincia",
  "Paraná": "Parana_Provincia",
  "Parecis": "Parecis_Provincia",
  "Parnaíba": "Parnaiba_Provincia",
  "Recôncavo-Tucano-Jatobá": "Reconcavo_Tucano_Jatoba_Provincia",
  "São Francisco": "Sao_Francisco_Provincia",
  "São Luís": "Sao_Luis_Provincia",
  "Tocantins": "Tocantis_Provincia",
});


// Carrega uma coleção contendo dados geoespaciais de vegetação e aplica uma função a cada recurso.
var featureCollection = ee.FeatureCollection('projects/mapbiomas-solos-workspace/assets/covariates/geology/IBGE_provinciasEstruturais_250mil')
// Define a propriedade 'legenda_1' do recurso com a abreviação correspondente.
  .map(function(feature){
    var legenda = legend.get(feature.getString('legenda'));
// Define a propriedade 'legenda_1' do recurso com a abreviação correspondente.
    return feature.set('legenda',legenda);
  });
// Carrega uma coleção contendo dados geoespaciais de biomas.
var biomas = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
// Calcula a região envolvente (bounds) dos biomas.
var region = biomas.geometry().bounds();
// Cria uma máscara (mask) com base nos biomas.
var mask = ee.Image().paint(biomas).eq(0);
// Inicializa uma variável 'image' para armazenar a imagem resultante.
var image = featureCollection.aggregate_array('legenda').distinct().sort()
  .aside(print)  // Imprime a lista de abreviações no console.
  .iterate(function(current,previous){
// Converte a abreviação atual em uma string.
    var legenda_1 = ee.String(current);
// Filtra os recursos com base na legenda.
    var feature = featureCollection.filter(ee.Filter.eq('legenda',legenda_1));
    var img = ee.Image()
    .paint(feature)
    .eq(0).unmask(0)
    .rename(legenda_1)
    .byte()
    .updateMask(mask);
    return ee.Image(previous)
      .addBands(img);
  },ee.Image().select());
image = ee.Image(image);


Map.addLayer(image,{min: 0, max:1, bands:'Costeira_Margem_Continental_Provincia'},'image');

var params = {
  radius:1000,
  units:'meters',
};

var interpolation = image
  .focalMax(params) 
  .focalMax(params)
  .focalMax(params)
  .unmask(0);
image = interpolation.blend(image);
print(image);


Map.addLayer(image,{min: 0, max:1, bands:'Costeira_Margem_Continental_Provincia'},'focalMax');
Map.addLayer(image);

var description = 'IBGE_2019_PROVINCIAS_250MIL';
var assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/' + description;

// Exporta a imagem resultante como um asset no GEE.
Export.image.toAsset({
  image:image.set({
    description:"https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLECAO_01%2Fexport-datasets%2FIBGE_2019_PROVINCIAS_250MIL"
  }), 
  description:description,
  assetId:assetId, 
  pyramidingPolicy:'mode',
  region:region, 
  scale:30,
  maxPixels:1e11,
});
