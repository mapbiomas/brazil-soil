/* SPATIAL-TEMPORAL PREDICTION AND STOCKCOS UNCERTAINTY
     The prediction uses the RF model saved with the covariates and exports the predicted map/data.
    
     MAPBIOMAS SOIL @contact: contato@mapbiomas.org
     October 26, 2024
*/

// --- VERSIONING
var version = 'collection2-filter-rep-MODEL1'; // only line to be changed

// --- DEFINITION OF DATA FOR PREDICTION

 var selected_bandnames_static = [
    // List of covariates for available static covariates
    
    //WRB probability classes
    'Ferralsols',
    'Histosols',
    'Sandysols',
    'Humisols',
    'Thinsols',
    'Wetsols',
    
    //Soilgrids Soil Properties
    'nitrogen',
    'phh2o',
    
    'oxides',
    'clayminerals',

        //v009 0_10cm
    'clay_000_030cm',
    'sand_000_030cm',
    'silt_000_030cm',
    
    // Water MapBiomas 
    'mb_water_39y_accumulated', // accumulated water (areas with water present at any time)
    'mb_water_39y_recurrence', // recurrence (number of observations) of the water surface between 1985 and 2023
    
    //Black Soil
    'black_soil_prob',
    
    //Geomorphometry
    'convergence',
    'cti',
    'eastness',
    'northness',
    'pcurv',
    'roughness',
    'slope',
    'spi',
    'elevation',
    
    //Lat-Long (Used in versions below STOCKCOS v002)
    'latitude', 
    'longitude',
    
    //Koppen
    'lv1_Humid_subtropical_zone',
    'lv1_Tropical',
    'lv2_monsoon',
    'lv2_oceanic_climate_without_sry_season',
    'lv2_with_dry_summer',
    'lv2_with_dry_winter',
    'lv2_without_dry_season',
    'lv3_with_hot_summer',
    'lv3_with_temperate_summer',
    
    //Biomes 
    'Amazonia',
    'Caatinga',
    'Cerrado',
    'Mata_Atlantica',
    'Pampa',
    'Pantanal',
    
    //Phytophysiognomy
    'Floresta_Ombrofila_Aberta',
    'Floresta_Estacional_Decidual',
    'Floresta_Ombrofila_Densa',
    'Floresta_Estacional_Semidecidual',
    'Campinarana',
    'Floresta_Ombrofila_Mista',
    'Formacao_Pioneira',
    'Savana',
    'Savana_Estepica',
    'Contato_Ecotono_e_Encrave',
    'Floresta_Estacional_Sempre_Verde',
    'Estepe',
    
    //Geological Provinces
    'Amazonas_Solimoes_Provincia',
    'Amazonia_Provincia',
    'Borborema_Provincia',
    'Cobertura_Cenozoica_Provincia',
    'Costeira_Margem_Continental_Provincia',
    'Gurupi_Provincia',
    'Mantiqueira_Provincia',
    'Massa_d_agua_Provincia',
    'Parana_Provincia',
    'Parecis_Provincia',
    'Parnaiba_Provincia',
    'Reconcavo_Tucano_Jatoba_Provincia',
    'Sao_Francisco_Provincia',
    'Sao_Luis_Provincia',
    'Tocantis_Provincia',
    
    'Area_Estavel',
    
    'IFN_index'
];

var selected_bandnames_dynamic = [
    // List of covariates for available dynamic covariates
    
    'mb_ndvi_median_decay',
    'mb_evi2_median_decay',
    'mb_savi_median_decay',

    
    // Mapbiomas Degradation Beta (SUM(30, 60, 90, 150, 300m))
    'mb_summed_edges',
    // Mapbiomas Fire Col. 3 
    'mb_fire_accumulate_dynamic',
    'mb_fire_recurrence_dynamic',
    'mb_fire_time_after_fire',
    
    //MapBiomas - Col.8/9
    'campoAlagadoAreaPantanosa', 
    'formacaoCampestre',
    'formacaoFlorestal',
    'formacaoSavanica',
    'lavouras',
    'mosaicoDeUsos',
    'outrasFormacoesFlorestais',
    'pastagem',
    'restingas',
    'silvicultura',
    'antropico',
    'natural',
];


// --- --- --- PREPARING THE TRAINING MATRIX --- --- ---
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');

// --- IMPORTING COVARIATES MODULE
var covariates = require('users/wallacesilva/mapbiomas-solos:COLECAO_01/development/_module_covariates/module_covariates');
var staticCovariates = covariates.static_covariates();
var dynamicCovariates = covariates.dynamic_covariates();

var staticCovariatesModule = staticCovariates.bandNames();
var dynamicCovariatesModule = dynamicCovariates.first().bandNames();

var staticCovariatesNames = staticCovariatesModule.filter(ee.Filter.inList('item', selected_bandnames_static));
var dynamicCovariatesNames = dynamicCovariatesModule.filter(ee.Filter.inList('item', selected_bandnames_dynamic));

var covariatesNames = staticCovariatesNames.cat(dynamicCovariatesNames);
print('Set of covariate:', covariatesNames);

// -- LIBRARY FOR DECODE RANDOM FOREST ASSET TABLE
function decodeFeatureCollection(featureCollection) {
     return featureCollection
          .map(function (feature) {
                var dict = feature.toDictionary();
                var keys = dict.keys().map(function (key) {
                     return ee.Number.parse(ee.String(key));
                });
                var value = dict.values().sort(keys).join();
                return ee.Feature(null, { value: value });
          })
          .aggregate_array('value')
          .join()
          .decodeJSON();
}

// --- IMPORTING RANDOM FOREST MODEL
var assetModelRandomForest = 'projects/mapbiomas-workspace/SOLOS/MODELOS_RF/soil_organic_carbon/randomForestModel-collection2-filter-rep-MODEL1';
var featureCollectionModelRandomForest = ee.FeatureCollection(assetModelRandomForest);
var getModelForest = decodeFeatureCollection(featureCollectionModelRandomForest);
print('Model trees:', getModelForest)
var TreeEnsemble = ee.Classifier.decisionTreeEnsemble(getModelForest);

// --- LULC MASKS
// var mapbiomasLulc = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1'; // (1985-2022)
var mapbiomasLulc = 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1';    // (1985-2023)
var lulc = ee.Image(mapbiomasLulc);

// --- TEMPORAL PREDICTION AND INTERVAL CALCULATION
var dataTrainingOutput = ee.FeatureCollection([]);

var containerMean = ee.Image().select();
var containerMedian = ee.Image().select();
// var container = ee.Image().select();
// var containerUncertainty = ee.Image().select();

var years = [
     1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997,
     1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
     2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
];

var numberOfTreesRF = 399;

years.forEach(function (year) {
     var dynamicCovariatesYear = dynamicCovariates
          .select(dynamicCovariatesNames)
          .filter(ee.Filter.eq("year", year))
          .first();

     var covariates = ee
          .Image()
          .select()
          .addBands(staticCovariates.select(staticCovariatesNames))
          .addBands(dynamicCovariatesYear)
          .addBands(ee.Image(year).int16().rename("year"));

     var bandName = "prediction_" + year;

     var lulcYear = lulc.select("classification_" + year);

     var blend = ee
          .Image()
          .blend(lulcYear.eq(29).selfMask())
          .blend(lulcYear.eq(23).selfMask())
          .blend(lulcYear.eq(24).selfMask())
          .blend(lulcYear.eq(30).selfMask())
          .blend(lulcYear.eq(32).selfMask())
          .multiply(0);
          
     // Classifies the covariates image using a tree ensemble, renames the prediction band, blends with the blend image.
      var prediction = covariates
          .classify(TreeEnsemble)
          .rename(bandName)
          .blend(blend)
          .round()
          .int16();

     // Iterates in sequence, classifying the image with each tree and adding the resulting images as bands to the containerTrees image.
         var containerTrees = ee.Image(
          ee.List.sequence(0, numberOfTreesRF).iterate(function (current, previous) {
                var treesClassifier = ee.Classifier.decisionTree(ee.List(getModelForest).getString(ee.Number(current)));
                
                var img = covariates
                     .classify(treesClassifier)
                     .rename(bandName)
                     .divide(100)
                     .blend(blend)
                     .round()
                     .int16();
                return ee.Image(previous).addBands(img);
          }, ee.Image().select())
     );

        //prediction mean RF
     containerMean = containerMean.addBands(containerTrees.reduce("mean").round().rename(bandName.replace("_", "_mean_")));
     containerMedian = containerMedian.addBands(containerTrees.reduce("median").round().rename(bandName.replace("_", "_median_")));

    // container = container.addBands(prediction);
    //     //prediction interval (PI) = P95 - P05 
    // containerUncertainty = containerUncertainty.addBands(containerTrees.reduce(ee.Reducer.percentile([95]))
    //                                                               .subtract(containerTrees.reduce(ee.Reducer.percentile([5]))).round()
    //                                                                     .rename(bandName.replace("_", "_uncertainty_")));
});

// --- TEMPORAL GAPPING
var cloudSeriesFilter = function (image) {
     var filtered = ee.List(image.bandNames())
          .slice(1)
          .iterate(function (bandName, previousImage) {
                bandName = ee.String(bandName);
                var imageYear = ee.Image(image).select(bandName);
                previousImage = ee.Image(previousImage);

                var filtered = imageYear.where(
                     imageYear.eq(-2),
                     previousImage.slice(-1)
                );

                return previousImage.addBands(filtered);
          }, ee.Image(image.slice(0, 1)));

     image = ee.Image(filtered);

     var bandNames1 = ee.List(image.bandNames()).reverse();
     filtered = ee.List(bandNames1)
          .slice(1)
          .iterate(function (bandName, previousImage) {
                bandName = ee.String(bandName);
                var imageYear = ee.Image(image).select(bandName);
                previousImage = ee.Image(previousImage);

                var filtered = imageYear.where(
                     imageYear.eq(-2),
                     previousImage.slice(-1)
                );

                return previousImage.addBands(filtered);
          }, ee.Image(image.slice(-1)));

     image = ee.Image(filtered);

     return image.select(image.bandNames().sort());
};

// --- MASKING SUBMERGED AREAS (Natural and anthropized water bodies)
var waterBodies = ee.ImageCollection("projects/mapbiomas-workspace/AMOSTRAS/GTAGUA/OBJETOS/CLASSIFICADOS/TESTE_1_raster")
     .filter(ee.Filter.eq("version", "3"))
     .filter(ee.Filter.eq("year", 2023))
     .mosaic();

  Map.addLayer(waterBodies.randomVisualizer(),{},'waterBodies', false);

var anthropizedBodies = waterBodies.neq(1);

  Map.addLayer(anthropizedBodies.randomVisualizer(),{},'anthropizedBodies', false);

var submergedAreas = lulc.eq(33).or(lulc.eq(31)).reduce("sum").selfMask();

submergedAreas = submergedAreas
     .gte(37)
     .where(anthropizedBodies.eq(1), 0)
     .multiply(-1)
     .int16();
  

var maskAnthropizedBodies = lulc
     .eq(33)
     .or(lulc.eq(31))
     .where(anthropizedBodies.unmask().eq(0), 0)
     .eq(1);
     
  
var containerList = [
    ["mean_", containerMean],
    ["median_", containerMedian],
    // ["", container],
    // ["uncertainty_", containerUncertainty]
];
     
     print("Computed statistics of prediction and visualization year:")
     
containerList.forEach(function (list) {
    var cos = list[1];
    var string = list[0];
    print("prediction_" + string + "2023");

    var visualParams = {
        bands: ["prediction_" + string + "2023"],
        min: 0,
        max: 90,
        palette:  [
             "#f4f0f0",
             "#e9e1e1",
             "#ddd3d2",
             "#c7b8b6",
             "#bbaca8",
             "#b09f9b",
             "#a4948e",
             "#998882"
        ] 
    };
    
     cos = cos
          .where(submergedAreas.eq(-1), -1)
          .where(maskAnthropizedBodies, -1);

     // print("cos", cos);
     cos = cloudSeriesFilter(cos.unmask(-2));
     // print("cos cloudSeriesFilter", cos);
     var cos_t_ha = cos.updateMask(lulc.select(0));
     Map.addLayer(cos_t_ha, visualParams, "cos_t_ha_" + string);

     // --- EXPORTING RESULTS
     var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
     var aoi = biomes;
     var aoiImg = ee.Image().paint(aoi).eq(0);
     var aoiBounds = aoi.geometry().bounds();

     var output = "projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/CARBONO_ORGANICO_DO_SOLO/";
     var description = version + "_" + string + "_SOC_tC_ha-000_030cm";

     Export.image.toAsset({
          image: cos_t_ha.updateMask(aoiImg),
          description: description,
          assetId: output + description,
          pyramidingPolicy: "median",
          region: aoiBounds,
          scale: 30,
          maxPixels: 1e13,
     });
});
