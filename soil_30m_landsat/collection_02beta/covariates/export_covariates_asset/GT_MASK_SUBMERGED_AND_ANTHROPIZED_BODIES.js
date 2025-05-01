// Definindo o intervalo de anos
var year = [
  1985,1986,1987,1988,1989,
  1990,1991,1992,1993,1994,
  1995,1996,1997,1998,1999,
  2000,2001,2002,2003,2004,
  2005,2006,2007,2008,2009,
  2010,2011,2012,2013,2014,
  2015,2016,2017,2018,2019,
  2020,2021,2022,2023
];

// Carregando dados de biomas e definindo a área de interesse
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var aoi = biomes;
var aoiImg = ee.Image().paint(aoi).eq(0); // Cria uma máscara com a área de interesse
var aoiBounds = aoi.geometry().bounds();  // Define os limites da área de interesse

// Carregando a coleção LULC e selecionando os anos desejados
var lulc = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');

// Cria uma imagem composta com os anos selecionados
var lulcYear = lulc.select(year.map(function(y) { return "classification_" + y; }));

// Aplica remapeamento para certos valores específicos e atualiza a máscara com aoiImg
var blend = ee
          .Image()
          .blend(lulcYear.eq(29).selfMask())
          .blend(lulcYear.eq(23).selfMask())
          .blend(lulcYear.eq(24).selfMask())
          .blend(lulcYear.eq(30).selfMask())
          .blend(lulcYear.eq(32).selfMask())
          .multiply(0)
          .updateMask(aoiImg);

// --- Máscara de Áreas Submersas (Corpos d'água naturais e antropizados)
var waterBodies = ee.ImageCollection("projects/mapbiomas-workspace/AMOSTRAS/GTAGUA/OBJETOS/CLASSIFICADOS/TESTE_1_raster")
  .filter(ee.Filter.eq("version", "3"))
  .filter(ee.Filter.eq("year", 2023))
  .mosaic();
  
    Map.addLayer(waterBodies.randomVisualizer(),{},'waterBodies', false);


var anthropizedBodies = waterBodies.neq(1); // Corpos d'água antropizados

  Map.addLayer(anthropizedBodies.randomVisualizer(),{},'anthropizedBodies', false);

var submergedAreas = lulc.eq(33).or(lulc.eq(31)).reduce("sum").selfMask();
submergedAreas = submergedAreas
  .gte(37)
  .where(anthropizedBodies.eq(1), 0)
  .multiply(-1)
  .int16();

  Map.addLayer(submergedAreas.randomVisualizer(),{},'submergedAreas', false);

var maskAnthropizedBodies = lulc
  .eq(33)
  .or(lulc.eq(31))
  .where(anthropizedBodies.unmask().eq(0), 0)
  .eq(1);

  Map.addLayer(maskAnthropizedBodies.randomVisualizer(),{},'maskAnthropizedBodies', false);
  
// Criando a imagem final aplicando a máscara de áreas submersas e antropizadas
var image = lulcYear
  .where(submergedAreas.eq(-1), -1)
  .where(maskAnthropizedBodies, -1)

  Map.addLayer(image.randomVisualizer(),{},'image-where', false);


image = image
      .where(image.eq(0), 1)   // Onde era 0, colocar 1
      .where(image.eq(-1), 1)  // Onde era -1, colocar 1
      .where(image.eq(-2), 1)  // Onde era -2, colocar 1
      .where(image.eq(1), 0);  // Onde era 1, colocar 0

// Aplicando a máscara final: Onde os valores são 1, mantenha, e masque o restante
image = image
  .where(image.neq(1), 0)   // Qualquer valor que não seja 1 é transformado em 0
  .selfMask();               // Remove todos os pixels que têm valor 0

// Visualizando a imagem final
Map.addLayer(image.randomVisualizer(), {}, 'ÁREAS SUBMERSAS E CORPOS ANTROPIZADOS', false);

// Exportando a máscara como um asset
Export.image.toAsset({
  image: image,
  description: "GTSOLO_MC_MASK_SUBMERGED_AND_ANTHROPIZED_BODIES", // Nome do asset
  assetId: "projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/GT_MASK_SUBMERGED_AND_ANTHROPIZED_BODIES", // Caminho completo do asset, substitua "your_project" pelo nome do seu projeto
  pyramidingPolicy: "median",
  region: aoiBounds,  // Região da área de interesse
  scale: 30, // Defina a escala de exportação, 30 metros é padrão para Landsat
  maxPixels: 1e13 // Defina o número máximo de pixels, se necessário
});
