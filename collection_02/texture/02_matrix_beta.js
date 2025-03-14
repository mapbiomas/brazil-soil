/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: November 19, 2024
 * 
 * SCRIPT 1: SELECTION OF COVARIATES FOR GRANULOMETRY MODELING
 * 
 * **Purpose**:
 * This script (Script 1 of 3) prepares environmental covariates for granulometric modeling 
 * and integrates them with soil data points for further analysis. Covariates include terrain 
 * morphometry, climate data, and other spatially relevant datasets. Soil data is sourced 
 * from the `SoilData` repository.
 * 
 * **Granulometry Dataset Description**:
 * - Total Observations: 19,885 from SoilData repository
 * - Variables: Clay, Silt, Sand (logarithmic format relative to sand fraction)
 * - Depth: Up to 40 cm, recorded in the 'depth' column
 * - Asset Path: 'mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/2024-11-17-clay-silt-sand-log-ratio'
 * 
 * **Prediction Depths**:
 * - Predictions will be generated for depths of 5 cm, 15 cm, and 25 cm:
 * - Depth as a primary covariate
 * - Predictions for upper layers incorporated as covariates for lower layers
 * 
 * **Steps**:
 * 1. Load environmental covariates from `_module_covariates`.
 * 2. Define selected covariates for the specified soil depth range.
 * 3. Combine covariates with soil data points from `SoilData`.
 * 
 * **Dependencies**:
 * - _module_covariates (for environmental layers)
 * 
 * **Notes**:
 * - Spatial consistency is ensured by incorporating predictions for adjacent layers.
 * - Sequence adherence is critical for accurate and consistent mapping results.
 * 
 * **Contact**:
 * - For issues related to covariate access or integration, contact Wallace Silva at wallace.silva@ipam.org.br
 * - Coordination: Dra. Taciara Zborowski Horst (taciaraz@professores.utfpr.edu.br)
 * - General questions: MapBiomas Soil Team: contato@mapbiomas.org
 */

// --- VERSIONING
//var version = 'v010_0_10cm';
var version = 'beta_010_020'; 
// var version = 'beta_020_030'; 

// --- CALLING ENVIRONMENTAL COVARIATES FROM MODULE
var covariates = require('users/wallacesilva/mapbiomas-solos:PRODUCTION/2024_beta_granulometria/1_covariate_source');
var static_covariates = covariates.static_covariates();

// --- DEFINITION OF COVARIATES LIST
var selected_bandnames_static = [

//////////////
// CALL ---- SELECT TO MAP 10-20 cm
//////////////

  'depth_25',
// Previews predictions
 
  'beta_clay_000_010',
  'beta_sand_000_010',
  'beta_silt_000_010',

//////////////
// CALL ---- SELECT TO MAP 20-30 cm
//////////////
// Previews predictions
  // 'beta_clay_010_020',
  // 'beta_sand_010_020',
  // 'beta_silt_010_020',

  // Terrain Morphometry
  'slope',
  'convergence',
  'cti',
  'eastness',
  'northness',
  'pcurv',
  'roughness',
  'spi',
  'elevation',

  // WRB Soil Classes (grouping in relation to texture)
  'Sandy_soil',
  'Loam_soil',
  'Clayey_soil',
  'Very_clay_soil',

  'black_soil_prob',

  // Climate Koeppen
  'lv1_Tropical',
  'lv1_Dry_season',
  'lv1_Humid_subtropical_zone',
  'lv2_without_dry_season',
  'lv2_monsoon',
  'lv2_with_dry_summer',
  'lv2_with_dry_winter',
  'lv2_semiarid',
  'lv2_oceanic_climate_without_sry_season', // corrected
  'lv2_with_dry_winter_1',
  'lv3_low_latitude_and_altitude',
  'lv3_with_hot_summer',
  'lv3_with_temperate_summer',
  'lv3_and_hot',
  'lv3_and_temperate',
  'lv3_and_hot_summer',
  'lv3_and_temperate_summer',
  'lv3_and_short_and_cool_summer',

  // Biome
  'Amazonia',
  'Caatinga',
  'Cerrado',
  'Mata_Atlantica',
  'Pampa',
  'Pantanal',

  // Phytophysiognomy
  'Campinarana',
  'Contato_Ecotono_e_Encrave',
  'Corpo_dagua_continental',
  'Estepe',
  'Floresta_Estacional_Decidual',
  'Floresta_Estacional_Semidecidual',
  'Floresta_Estacional_Sempre_Verde',
  'Floresta_Ombrofila_Aberta',
  'Floresta_Ombrofila_Densa',
  'Floresta_Ombrofila_Mista',
  'Formacao_Pioneira',
  'Savana',
  'Savana_Estepica',

  // Provinces
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

  // Mineral indices 
  'oxides',
  'clayminerals',
  
  // index
  'mb_ndvi_median_decay'
];


// --- STATIC
var static_image = ee.Image.cat(static_covariates.select(selected_bandnames_static));
print(static_image, "static_image");

// --- PREPARING THE DATA MATRIX

// // --- SOILDATA REPOSITORY DATA


var points = ee.FeatureCollection('projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/2024-11-17-clay-silt-sand-log-ratio')
  .map(function(point, i) {
    return ee.Feature(point.geometry())
      .set({
        'log_clay_sand': point.get('log_clay_sand'),
        'log_silt_sand': point.get('log_silt_sand'),
        'id': point.get('id'),
        'depth': point.get('depth')
      });
  });

if (points.size().getInfo() < 2185) {
  throw new Error("⚠️ Original sample size does not match the training sample size ⚠️");
} 

print('points', points.limit(10), points.size());
Map.addLayer(ee.Image(0), { palette: ['cccccc'] });
Map.addLayer(points, { color: 'ff0000' }, 'points');

// // --- CALLING SELECTED COVARIATES
var static_covariates = static_image;

// // --- BUILDING THE DATA MATRIX

// Creating a FeatureCollection for covariates
var covariates = static_image.select(selected_bandnames_static);

// Sampling the training data
var datatraining = covariates.sampleRegions({
  collection: points,
  properties: ['log_clay_sand', 'log_silt_sand', 'id', 'depth'],
  scale: 30,
  geometries: true
});

// Initialize the matrix as an empty FeatureCollection
var matrix = ee.FeatureCollection([]);

// Add samples to the matrix
matrix = matrix.merge(datatraining); // Merge the new data into the matrix

// Print the results
print('matrix', matrix.limit(10), matrix.size());

// --- EXPORT DATA MATRIX
var assetId = 'projects/mapbiomas-workspace/SOLOS/AMOSTRAS/MATRIZES/granulometry/' + version; 

Export.table.toAsset({
        collection: matrix,
        description:version,
        assetId:assetId,
});
    