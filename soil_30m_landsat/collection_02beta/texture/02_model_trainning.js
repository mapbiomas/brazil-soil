/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: November 19, 2024
 */

// version 2 - 2025/04/25 - Taciara Horst

// SCRIPT 2: PREDICTING AND MAPPING SOIL GRANULOMETRY (CLAY, SAND, SILT)

///////////////////// VERSIONING /////////////////////
var seed = 2021; // Seed for Random Forest reproducibility

var steps = [
  { matrix: 'psd_c02beta_000_010cm_v2', version: 'v2', profundidade_alvo: '000_010cm', target_depth: 'depth_5'}
];

// Select the processing step
var step = steps[0];

var matrixName = step.matrix;
var matrixPath = 'projects/mapbiomas-workspace/SOLOS/AMOSTRAS/MATRIZES/granulometry/' + matrixName;
var version = step.version;
var profundidade_alvo = step.profundidade_alvo;
var target_depth = step.target_depth;

// Export parameters
var assetId = 'projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-' + version;
var default_name = 'mapbiomas_soil_collection2_';
var initiave_and_you = 'GT_SOLO_TZH';

///////////////////// LOG /////////////////////
ee.ImageCollection(assetId).size().evaluate(function (collectionSize) {
  if (collectionSize === undefined) {
    print(ui.Label('⚠️ Please create an ImageCollection at:'), ui.Label(assetId));
  }
});

///////////////////// DATA FOR PREDICTION /////////////////////
var datatraining = ee.FeatureCollection(matrixPath)
  .filter(ee.Filter.notNull(['id', 'log_silt_sand', 'log_clay_sand', 'system:index']));
print('full training matrix', datatraining.limit(10));

var datatraining_columns = datatraining.first().propertyNames();

var remove = ee.List(['latitude', 'longitude', 'ndvi']);
var datatraining_columns = datatraining_columns.removeAll(remove);

print('covariates list', datatraining_columns);


///////////////////// IMPORT COVARIATES /////////////////////
var covariates = require('users/wallacesilva/mapbiomas-solos:PRODUCTION/2024_c02beta/covariates/covariate_source');
var static_covariates = covariates.static_covariates();

var renamed_static_covariates = static_covariates.rename(
  static_covariates.bandNames().map(function(bandName) {
    return ee.String(bandName).replace('depth_5', 'depth');
  })
);

// Retrieve the list of band names from static_covariates
var static_covariates_module = renamed_static_covariates.bandNames();

// Filter the band names to include only those present in datatraining_columns
var static_covariates_names = static_covariates_module.map(function(bandName) {
  return ee.Algorithms.If(ee.List(datatraining_columns).contains(bandName), bandName, null);
});

// Remove null values from the list
static_covariates_names = static_covariates_names.removeAll([null]);

// Select the filtered covariates from renamed_static_covariates
var selected_static_covariates = renamed_static_covariates.select(static_covariates_names);
print('Selected covariates:', selected_static_covariates.bandNames());


///////////////////// RANDOM FOREST PARAMETERS /////////////////////
var rf_params = {
  ntree: 100,
  mtry: 16,
  nodesize: 2,
  maxNodes: 30,
  sampsize: 0.632
};

///////////////////// TRAINING MODELS /////////////////////
var randomForestModel_log_clay_sand = ee.Classifier
  .smileRandomForest({
    numberOfTrees: rf_params.ntree,
    variablesPerSplit: rf_params.mtry,
    minLeafPopulation: rf_params.nodesize,
    bagFraction: rf_params.sampsize,
    seed: seed
  })
  .setOutputMode('REGRESSION')
  .train({
    features: datatraining,
    classProperty: 'log_clay_sand',
    inputProperties: static_covariates_names
  });

var randomForestModel_log_silt_sand = ee.Classifier
  .smileRandomForest({
    numberOfTrees: rf_params.ntree,
    variablesPerSplit: rf_params.mtry,
    minLeafPopulation: rf_params.nodesize,
    bagFraction: rf_params.sampsize,
    seed: seed
  })
  .setOutputMode('REGRESSION')
  .train({
    features: datatraining,
    classProperty: 'log_silt_sand',
    inputProperties: static_covariates_names
  });

///////////////////// SPATIAL PREDICTION /////////////////////
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var aoi = biomas;
var aoi_bounds = aoi.geometry().bounds();

var prediction_log_clay_sand = selected_static_covariates.classify(randomForestModel_log_clay_sand).rename('log_clay_sand').float();
var prediction_log_silt_sand = selected_static_covariates.classify(randomForestModel_log_silt_sand).rename('log_silt_sand').float();

var map_sand = ee.Image().expression(
  '(1/(exp(log_clay_sand)+exp(log_silt_sand)+1))*100',
  { log_clay_sand: prediction_log_clay_sand, log_silt_sand: prediction_log_silt_sand }
).round().rename('prediction_sand');

var map_clay = ee.Image().expression(
  '(exp(log_clay_sand)/(exp(log_clay_sand)+exp(log_silt_sand)+1))*100',
  { log_clay_sand: prediction_log_clay_sand, log_silt_sand: prediction_log_silt_sand }
).round().rename('prediction_clay');

var map_silt = ee.Image().expression(
  '(exp(log_silt_sand)/(exp(log_clay_sand)+exp(log_silt_sand)+1))*100',
  { log_clay_sand: prediction_log_clay_sand, log_silt_sand: prediction_log_silt_sand }
).round().rename('prediction_silt');

var final_images = [
  ['sand', map_sand],
  ['silt', map_silt],
  ['clay', map_clay]
];

///////////////////// EXPORT MAPS /////////////////////
final_images.forEach(function(image_info) {
  
  var name = image_info[0];
  var img = image_info[1];
  
  Export.image.toAsset({
    image: img.clip(aoi_bounds),  // Clip to your AOI bounds
    description: 'export_' + name + '_' + profundidade_alvo,  // Task name
    assetId: 'LdP/tz/' + name + '_' + profundidade_alvo,  // Change 'your_username' to your GEE user
    region: aoi_bounds,
    scale: 30,  // Adjust the resolution if necessary
    maxPixels: 1e13,  // Allow exporting large images
    crs: 'EPSG:4326'  // Optional: set coordinate reference system if needed
  });

});

/*
// Export maps by carta
final_images.forEach(function(list) {
  
  var description = default_name + list[0] +'_percent_'+ profundidade_alvo + '-' + version;
  var image = list[1];
  exportPerSupercarta(image.float()
    .set({
      'pepth': profundidade_alvo,
      'version': version,
      'initiative':'MAPBIOMAS SOLO',
      'source':'LABORATÓRIO DE PEDOMETRIA',
      'type': list[0],
      'matrix':matrix
    }), assetId, description,aoi_bounds);
});


function exportPerSupercarta(image, output, description,filter_bounds) {
  var cartas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/cartas')
    .filterBounds(filter_bounds)
    .map(function (feature) {
      return feature.set({
        supercarta: feature.getString('grid_name').slice(0,-4)
      });
    });

  var supercartas = cartas.aggregate_array('supercarta').distinct().sort();
  supercartas.evaluate(function (list) {
    list.forEach(function (supercarta) {

      var newDescription = description + '_' + supercarta;
      var supercartaFeature = cartas.filter(ee.Filter.eq('supercarta', supercarta));
      var imageToExport = image.clip(supercartaFeature.geometry()).set({
        carta: supercarta,
        name: newDescription,
        group: description
      });

      Export.image.toAsset({
        image: imageToExport,
        description: initiave_and_you + '-' +newDescription,
        assetId: output + '/' + newDescription,
        pyramidingPolicy: "median",
        region: supercartaFeature.geometry(),
        scale: 30,
        maxPixels: 1e13,
      });
    });
  });
}

*/



///////////////////// VISUALIZATION /////////////////////
var vis_params_granulometry = {
  min: 0,
  max: 100,
  palette: ['fff5eb', 'fee6ce', 'fdd0a2', 'fdae6b', 'fd8d3c', 'f16913', 'd94801', 'a63603', '7f2704']
};

Map.addLayer(map_sand, vis_params_granulometry, 'prediction_sand');
Map.addLayer(map_silt, vis_params_granulometry, 'prediction_silt');
Map.addLayer(map_clay, vis_params_granulometry, 'prediction_clay');

var legend = ui.Panel({ style: { position: 'bottom-left', padding: '8px' } });
legend.add(ui.Label('Soil particle size distribution (%)'));
legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: { bbox: [0, 0, 1, 0.1], dimensions: '100x10', palette: vis_params_granulometry.palette },
  style: { stretch: 'horizontal' }
}));
var labels = [];
for (var i = 0; i <= 100; i += 10) labels.push(ui.Label(i.toString(), {margin: '4px'}));
legend.add(ui.Panel(labels, ui.Panel.Layout.flow('horizontal')));
Map.add(legend);
