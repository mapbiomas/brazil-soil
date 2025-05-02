/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: March 19, 2025
*/

// version 2 - 2025-04-25 Taciara

/*
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
 * - covariate_sources (for environmental layers)
 * 
 * **Notes**:
 * - Spatial consistency is ensured by incorporating predictions for adjacent layers.
 * - Sequence adherence is critical for accurate and consistent mapping results.
 * 
 * **Contact**:
 * - For issues related to covariate access or integration, contact Wallace Silva at wallace.silva@ipam.org.br
 * - General questions: MapBiomas Soil Team: contato@mapbiomas.org
 */

// --- VERSIONING
// var version = 'psd_c02beta_00_10cm_v2';
// var version = 'psd_c02beta_010_020_v2'; 
var version = 'psd_c02beta_020_030_v2'; 

// // --- SOILDATA REPOSITORY DATA


var points = ee.FeatureCollection('projects/earthengine-legacy/assets/projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/2024-12-01-clay-silt-sand-log-ratio')
  .map(function(point, i) {
    return ee.Feature(point.geometry())
      .set({
        'log_clay_sand': point.get('log_clay_sand'),
        'log_silt_sand': point.get('log_silt_sand'),
        'id': point.get('id'),
        'depth': point.get('depth')
      });
  });

print('points', points.limit(10), points.size());
Map.addLayer(ee.Image(0), { palette: ['cccccc'] });
Map.addLayer(points, { color: 'ff0000' }, 'points');


// --- CALLING ENVIRONMENTAL COVARIATES FROM MODULE
var covariates = require('users/wallacesilva/mapbiomas-solos:PRODUCTION/2024_c02beta/covariates/covariate_source');
var static_covariates = covariates.static_covariates();

// --- DEFINITION OF COVARIATES LIST
var selected_bandnames_static = [
//////////////
//////////////
// CALL ---- SELECT TO MAP 10-20 cm

// // ////Particle Size Distribution (MapBiomas Soil previews prediction)
//   'clay_000_010',
//   'sand_000_010',
//   'silt_000_010',

// // //////////////
// // // CALL ---- SELECT TO MAP 20-30 cm

// // // Particle Size Distribution (MapBiomas Soil previews prediction)
//   'clay_010_020',
//   'sand_010_020',
//   'silt_010_020',
// // ///

    //Soil Classes WRB probabilities (Hengl et al., 2017)
    'Ferralsols',
    'Histosols',
    'Nitisols',
    'Vertisols',
    'Argisols',
    'Humisols',
    'Sandysols',
    'Thinsols',
    'Wetsols',

    //Black Soils probability (FAO, 2022b)
    'black_soil_prob',
    

    //Mineral indeces (Landsat 5, 7, and 8)
    'clayminerals', 
    'oxides',
    'ndvi',

   
    //Land Surface Variables (Amatulli et al., 2020, 2018)
    'slope',
    'convergence',
    'cti',
    'eastness',
    'northness',
    'pcurv',
    'roughness',
    'spi',
    
    // Elevation (MERIT)
    'elevation',
    
    //Köppen climate classification (Alvares et al., 2013)
    
    'koppen_l1_A',
    'koppen_l2_Af', // Af
    'koppen_l2_Am', // Am
    'koppen_l2_As', // As
    'koppen_l2_Aw', // Aw

    'koppen_l3_Bsh', //BSh
    
    'koppen_l1_C', // C
    'koppen_l2_Cf', // Cf
    'koppen_l3_Cfa', // Cfa
    'koppen_l3_Cfb', //Cfb
        
    'koppen_l2_Cw', // Cw
    'koppen_l3_Cwa', // Cwa
    'koppen_l3_Cwb', // Cwb
    'koppen_l3_Cwc', // Cwc
        
    'koppen_l2_Cs', // Cs 
    'koppen_l3_Csa',// Csa    
    'koppen_l3_Csb', // Csb

        
    //Biome (IBGE, 2019b)
    'Amazonia',
    'Caatinga',
    'Cerrado',
    'Mata_Atlantica',
    'Pampa',
    'Pantanal',

    //Phytophysiognomy (IBGE)
    'Campinarana',
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


    //Spatial coordinates (test the inclusion)
    'latitude', 
    'longitude',
    
    //Geological classification (structural provinces) (IBGE, 2019)
    'Amazonia_Provincia',
    'Borborema_Provincia',
    'Sao_Francisco_Provincia',  
    'Tocantis_Provincia',   
    'Mantiqueira_Provincia',
    'Amazonas_Solimoes_Provincia',
//    'Parana_Provincia',
    'Parecis_Provincia',
    'Parnaiba_Provincia',   
    'Sao_Luis_Provincia',
    'Gurupi_Provincia',    
    'Reconcavo_Tucano_Jatoba_Provincia',
    'Costeira_Margem_Continental_Provincia',    
    'Cobertura_Cenozoica_Provincia',

    // MapBiomas Water (Collection 3) - static
    'mb_water_39y_recurrence', // recurrence (number of observations) of the water surface between 1985 and 2023
    
];


// --- STATIC
var static_image = ee.Image.cat(static_covariates.select(selected_bandnames_static));
print(static_image, "static_image");

// --- PREPARING THE DATA MATRIX

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
    