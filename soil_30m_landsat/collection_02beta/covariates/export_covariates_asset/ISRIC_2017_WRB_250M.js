/*
 * Dataset: WRB All Soils SoilGrids 250m
 * 
 * Authors:
 * - Taciara Horst
 * 
 * Changes:
 * - Filling empty pixels with interpolation
 *  
 * Contact: contato@mapbiomas.org
 * Last modified on May 01, 2025
 * 
 * MapBiomas Soil
 */

// Carregando os dados: 
// Carregando o raster dos biomas brasileiros do mapbiomas workspace 
var brasil = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-raster-41');

// Carregando coleção de imagens contendo a classificação de solos WRB do SoilGrids
var soils = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/REFERENCIAS/SOILGRIDS/WRB_ALL-SOILS_SOILGRIDS_250M')
// Convertendo a coleção em uma única imagem  
  .toBands()
// Máscara que delimita apenas os pixels presentes em território brasileiro
  .updateMask(brasil);
 
// Organiza lista de classificação:
// Obtendo a classificação (nomes das bandas em uma lista) e armazenando na variável oldBands
var oldBands = soils.bandNames();
// Aplica uma função a cada elemento da lista (classificação wrb)
var newBands = oldBands.map(function(str){
// Converte o nome da banda (classificação) em uma string (removendo a palavra _probably e tudo que vem depois)
  return ee.String(str).split('_probably').get(0);
});

// Define raio como 1000 unidades (metros) 
var params = {
  radius:1000,
  // kernelType:,
  units:'meters',
  // iterations:,
  // kernel:
};
 
// Operações de interpolação:
var interpolation = soils
//Calcula a média ponderada dos valores dos pixels em uma área definida pelo raio especificado. Usado para suavizar imagem ou reduzir ruído.
  .focalMean(params)
  .focalMean(params)
  .focalMean(params)
//Operação para garantir que não haja pixels com valores ausentes após a interpolação
  .unmask(0);
  
// O resultado será uma nova imagem que contém uma combinação das informações das duas imagens originais (soil e interpolação).
// O método blend() é usado para misturar duas imagens juntas, determinando como as duas imagens são combinadas pixel a pixel
soils = interpolation.blend(soils);

// Adiciona uma camada ao mapa exibindo a primeira banda da imagem soils, com valores de pixel entre 0 e 37, rotulando como 'image' no painel de camadas.
Map.addLayer(soils.select(0),{min:0,max:37},'image');

// Remomeia as bandas da variável soil pelas modificações feitas anteriormente (removendo _probably)
soils = soils.select(oldBands,newBands)
// Sistema de coordenadas (EPSG 4326 - WGS 84) e escala (30m)
  .resample({mode:'bilinear'})
  .reproject({
    crs:'EPSG:4326',
    // crsTransform:,
    scale:30
  })
//Arrendonda valores de pixels, garante que sejam inteiros
  .round()
//Converte os valores de pixel para o tipo de dado inteiro de 8 bits (int8). Reduz o tamanho do arquivo 
  .int8()
//Adiciona descrição
  .set({
    description:'https://code.earthengine.google.com/?scriptPath=users%2Fwallacesilva%2Fmapbiomas-solos%3ACOLECAO_01%2Fexport-datasets%2Fwrb_all_soils_resample_30m_gapfill'
  });
 
//Visualizar informações
print(soils);
//Vizualiza mapa
Map.addLayer(soils);


//Define o caminho de saída dos dados
var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/';
var description = 'WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL';

//Exporta 
Export.image.toAsset({
  image:soils,
  description:description,
  assetId:output + description,
  pyramidingPolicy:'median',
  // dimensions:,
  region:bounds,
  scale:30,
  // crs:,
  // crsTransform:,
  maxPixels:1e13,
  // shardSize:
});