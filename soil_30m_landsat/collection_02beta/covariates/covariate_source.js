/* 
 * MAPBIOMAS SOIL
 * @contact: contato at mapbiomas.org
 * @date: May 01, 2025
 * 
 * SCRIPT 0: COVARIATE MODULE
 * 
 * **Purpose**:
 * This script serves as a module for accessing environmental covariates used in soil analysis and modeling. 
 * The covariates are categorized into static (time-invariant) and dynamic (time-dependent) datasets, 
 * and can be accessed through the `require()` function. This modular approach ensures consistent 
 * and reusable integration of covariates across multiple scripts in the MapBiomas Soil workflow.
 * 
 * **Covariate Categories**:
 * - **Static Covariates**: Time-invariant variables such as terrain morphometry, lithology, or other permanent features.
 * - **Dynamic Covariates**: Time-dependent variables, such as climate data or vegetation indices, which vary across seasons or years.
 * 
 * **Dependencies**:
 * - Ensure access to the MapBiomas Soil script repository: 
 *   `users/wallacesilva/mapbiomas-solos:PRODUCTION/2024_c02beta_covariates`.
 * - Google Earth Engine platform for data processing and execution.
 */

// --- --- --- --- --- COVARIÁVEIS AMBIENTAIS EXPLÍCITAS


// --- COVARIÁVEIS ESTÁTICAS
exports.static_covariates = function(){

  // Target values of depth (constant)
    var depth_5 = [ee.Image.constant(5).rename('depth_5')];
    var depth_15 = [ee.Image.constant(15).rename('depth_15')];
    var depth_25 = [ee.Image.constant(25).rename('depth_25')];

    // Particle Size Distribution
  var prev_predictions = ee.Image().select()
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_sand_000_010cm_v2'
    ).rename('sand_000_010'))
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_sand_010_020cm_v2'
    ).rename('sand_010_020'))
  // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_sand_020_030cm_v2'
  //   ).rename('sand_020_030'))
    
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_silt_000_010cm_v2'
    ).rename('silt_000_010'))
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_silt_010_020cm_v2'
    ).rename('silt_010_020'))
  // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_silt_020_030cm_v2'
  //   ).rename('silt_020_030'))
    
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_clay_000_010cm_v2'
    ).rename('clay_000_010'))
  .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_clay_010_020cm_v2'
    ).rename('clay_010_020'))
  // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/c02beta_clay_020_030cm_v2'
  //   ).rename('clay_020_030'))
    ;
      
  // Group based on carbon content
  var soil_classes = [
      'Ferralsols',
      'Histosols',
      'Nitisols',
      'Vertisols'
  ];
  
  var sandysols_classes = [
      'Arenosols',
      'Podzols',
    ];
  
  var humisols_classes = [
      'Chernozems',
      'Kastanozems',
      'Phaeozems',
      'Umbrisols',
    ];
  
  var thinsols_classes = [
      'Leptosols',
      'Regosols',
    ];
  
  var wetsols_classes = [
      'Gleysols',
      'Planosols',
      'Stagnosols'
    ];
    
  //Group based on top soil texture
  var argisols_classes = [
      'Alisols',
      'Luvisols',
      'Plinthosols',
      'Acrisols',
      'Lixisols',
      'Planosols'
  ];


  //Mineral indices (Landsat 5, 7, and 8)
  var clayminerals = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_CLAYMINERALS_BY_BYTE').rename('clayminerals');
  var oxides = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_OXIDES_BY_BYTE_v1').rename('oxides'); 
  var ndvi = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/BRAZIL/mosaics-2')
.select('ndvi_median')
.median()
.rename('ndvi');

  
  //Land Surface Variables (Amatulli et al., 2020, 2018)
  var slope = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('slope');
  var slopecalc = slope.expression(
      'tan(3.141593/180 * degrees)*100', {
        'tan': slope.tan(),
        'degrees': slope
      }).rename('slope');
  
  var geomorphometry_covariates = ee.Image().select()
    .addBands(slopecalc)
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('convergence').round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('cti').multiply(10).round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('eastness').multiply(100).round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('northness').multiply(100).round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('pcurv').multiply(10000).round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('roughness').round())
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('spi').add(1).log10().multiply(100).round());

  //Spatial coordinates (test the inclusion)
    var lonLat = ee.Image.pixelLonLat();
  
  //------ Covariate union
  
  var static_covariates = ee.Image().select()
      // Target values of depth (constant)
      .addBands(depth_5)
      .addBands(depth_15)
      .addBands(depth_25)
      
      // Prev predictions
      .addBands(prev_predictions)

      //Soil Classes WRB probabilities
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL')) ////Adicionado na module-v001
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(soil_classes))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(sandysols_classes).reduce('sum').rename('Sandysols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(humisols_classes).reduce('sum').rename('Humisols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(thinsols_classes).reduce('sum').rename('Thinsols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(wetsols_classes).reduce('sum').rename('Wetsols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(argisols_classes).reduce('sum').rename('Argisols'))
     //Black Soils probability
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/FAO_2022_BLACKSOIL_1KM').rename('black_soil_prob'))
      //Mineral indices        
      .addBands(ndvi)
      .addBands(oxides)
      .addBands(clayminerals)
      //Land Surface Variables
      .addBands(geomorphometry_covariates)
      //Elevation (MERIT)
      .addBands(ee.Image("MERIT/DEM/v1_0_3").select(['dem'],['elevation']).int16())
      //Köppen climate classification
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_2013_KOPPEN_100M/koppen_l1'))
      
      .addBands(
       ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_2013_KOPPEN_100M/koppen_l2')
      .rename(
      ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_2013_KOPPEN_100M/koppen_l2')
      .bandNames()
      .map(function(band) {
        return ee.String(band).replace('koppen_l2_koppen_Cf', 'koppen_l2_Cf');
      })
  )
)
      
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_2013_KOPPEN_100M/koppen_l3'))
      //Biome 
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_BIOMAS_30M'))
      //Phytophysiognomy
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_2023_FITOFISIONOMIA_250MIL'))
      //Spatial coordinates
      .addBands(ee.Image.pixelLonLat().select('longitude').add(34.8).multiply(-1000).toInt16())
      .addBands(ee.Image.pixelLonLat().select('latitude').subtract(5.4).multiply(-1000).toInt16())
      //Geological classification
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_PROVINCIAS_250MIL_DUMMY'))
      // MapBiomas Water (Collection 3) - static
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_STATIC_WATER_RECURRENCE_1985_2023').rename('mb_water_39y_recurrence'));
      
  return static_covariates;
};


// O acesso às covariáveis é feito por meio de uma requisão (função: "require"). Para uso desses dados, acesse ao repositório de scripts. 
// require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').static_covariates();
// print(require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').dynamic_covariates());
