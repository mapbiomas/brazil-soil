/*
  * Dataset: MapBiomas Collection 9.0 Water Recurrence
  * 
  * Authors:
  * - 
  * 
  * Changes:
  * - 
  * 
  * Contact: contato@mapbiomas.org
  * Last modified on May 01, 2025
  *
  * MapBiomas Soil
  * 
  */

// Função para obter parâmetros de visualização
function getVisualizationParams() {
  return {
    landcover: {
      'min': 0,
      'max': 69,
      'palette': require('users/mapbiomas/modules:Palettes.js').get('classification9'),
      'bands': 'classification_2023'
    },
    waterRecurrence: {
      'min': 0,
      'max': 39,
      'palette': ['red', 'yellow', 'green', 'cyan', 'blue'],
      'bands': 'water_recurrence_1985_2023'
    },
    waterAccumulated: {
      'min': 0,
      'max': 1,
      'palette': ['000080'],
      'bands': 'water_accumulated_1985_2023'
    },
    annualWater: {
      'min': 0,
      'max': 1,
      'palette': ['0000ff'],
      'bands': 'classification_2023'
    }
  };
}

// Carrega a imagem de cobertura do solo MapBiomas Coleção 9
var landcoverImage = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');
print('Cobertura do Solo:', landcoverImage);

// Obtém parâmetros de visualização
var visParams = getVisualizationParams();

// Cria uma máscara para superfícies de água (Classe 33)
// var waterSurfaceMask = landcoverImage.eq(33).selfMask();
var waterSurfaceMask = landcoverImage.eq(33).unmask(0);
print('Superfície de Água (Máscara)', waterSurfaceMask);

// Calcula a recorrência da superfície de água entre 1985 e 2023
var staticWaterRecurrence = waterSurfaceMask.reduce('sum').rename('water_recurrence_1985_2023');
print('Recorrência de Água (1985-2023)', staticWaterRecurrence);

// Calcula a recorrência dinâmica da água ao longo do tempo
function calculateDynamicWaterRecurrence(waterSurface) {
  return ee.Image(waterSurface.bandNames().iterate(function (currentBand, previousImage) {
    var previous = ee.Image(previousImage);
    var current = waterSurface.select(ee.String(currentBand));
    var dynamicWaterRecurrence = previous.slice(-1).unmask().add(current.unmask()).selfMask();
    return previous.addBands(dynamicWaterRecurrence.rename(ee.String(currentBand).replace('classification_', 'water_recurrence_1985_')));
  }, ee.Image())).slice(1);
}

// Calcula a recorrência dinâmica da superfície de água
var dynamicWaterRecurrence = calculateDynamicWaterRecurrence(waterSurfaceMask);
print('Recorrência Dinâmica de Água', dynamicWaterRecurrence);

// Calcula a água acumulada (áreas com presença de água em qualquer momento)
var staticWaterAccumulated = staticWaterRecurrence.gte(1).rename('water_accumulated_1985_2023');
print('Água Acumulada Estática', staticWaterAccumulated);

// Calcula a água acumulada dinâmica
var dynamicWaterAccumulated = dynamicWaterRecurrence.gte(1).rename(dynamicWaterRecurrence.bandNames().map(function(bandName) {
  return ee.String(bandName).replace('recurrence', 'accumulated');
}));
print('Água Acumulada Dinâmica', dynamicWaterAccumulated);
 
// Lista de objetos com camadas a serem visualizadas e exportadas
var layersToProcess = [
  {
    image: landcoverImage,
    visParams: visParams.landcover,
    description: 'Cobertura do Solo',
    fileName: 'landcover_2023'
  },
  {
    image: waterSurfaceMask,
    visParams: visParams.annualWater,
    description: 'Superfície de Água Anual',
    fileName: 'water_surface_mask_2023'
  },
  {
    image: staticWaterRecurrence,
    visParams: visParams.waterRecurrence,
    description: 'Recorrência Estática de Água (1985-2023)',
    fileName: 'static_water_recurrence_1985_2023'
  },
  {
    image: dynamicWaterRecurrence,
    visParams: visParams.waterRecurrence,
    description: 'Recorrência Dinâmica de Água',
    fileName: 'dynamic_water_recurrence'
  },
  {
    image: staticWaterAccumulated,
    visParams: visParams.waterAccumulated,
    description: 'Água Acumulada Estática (1985-2023)',
    fileName: 'static_water_accumulated_1985_2023'
  },
  {
    image: dynamicWaterAccumulated,
    visParams: visParams.waterAccumulated,
    description: 'Água Acumulada Dinâmica',
    fileName: 'dynamic_water_accumulated'
  }
];

// Pasta de destino no Google Earth Engine
var exportPath = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/';

// Loop para adicionar camadas, imprimir e exportar
layersToProcess.forEach(function(layer) {
  // Adiciona camada ao mapa
  print(layer.description,layer.image);
  
  Map.addLayer(layer.image, layer.visParams, layer.description, false);
 
  // Exibe a camada no console
  print(layer.description, layer.image);

  // Exporta a camada para o Google Earth Engine
  Export.image.toAsset({
    image: layer.image,
    description: layer.fileName,
    assetId: exportPath + layer.fileName,
    scale: 30,
    region: landcoverImage.geometry(),
    maxPixels: 1e13
  });
});

// Centraliza o mapa no objeto
Map.centerObject(landcoverImage, 5);
