/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: November 19, 2024
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
 *   `users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis`.
 * - Google Earth Engine platform for data processing and execution.
 *
 * 
 * **Contact**:
 * - For issues related to covariate access or integration, contact Wallace Silva at wallace.silva@ipam.org.br
 * - For method related issues, contant coordination: Dra. Taciara Zborowski Horst (taciaraz@professores.utfpr.edu.br)
 * - General questions: MapBiomas Soil Team: contato@mapbiomas.org

 */


// --- --- --- --- --- COVARIÁVEIS AMBIENTAIS EXPLÍCITAS

// --- COVARIÁVEIS ESTÁTICAS
exports.static_covariates = function(){
  // NDVI decay
  var mb_ndvi_median_decay = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_MB_INDICES_DECAY/2023').select('mb_ndvi_median_decay');
  
  // Target values of depth (constant)
    var depth_5 = [ee.Image.constant(5).rename('depth_5')];
    var depth_15 = [ee.Image.constant(15).rename('depth_15')];
    var depth_25 = [ee.Image.constant(25).rename('depth_25')];
    
  //------ Propriedades morfométricas do terreno
  var slope = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('slope');
  var slopecalc = slope.expression(
      'tan(3.141593/180 * degrees)*100', {
        'tan': slope.tan(),
        'degrees': slope
      }).rename('slope');
  
  var geomorphometry_covariates = ee.Image().select()
    .addBands(slopecalc)
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('convergence'))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('cti').multiply(10))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('eastness').multiply(100))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('northness').multiply(100))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('pcurv').multiply(10000))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('roughness'))
    .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/OT_GEOMORPHOMETRY_90m').select('spi').add(1).log10().multiply(100))
    .int16();
  
  //------ Propriedades do solo: conteúdo de argila, conteúdo de silte, conteúdo de areia, capacidade de troca de cátions, pH em água, densidade do solo, conteúdo de carbono, nitrogênio total, fragmentos grossos.
  var soil_list = [
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/bdod_30m"), 'bdod'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/cec_30m"), 'cec'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/cfvo_30m"), 'cfvo'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/nitrogen_30m").divide(100), 'nitrogen'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/phh2o_30m"), 'phh2o'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/soc_30m"), 'soc'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/clay_30m"), 'clay'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/sand_30m"), 'sand'],
    [ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_SOILGRIDS_30M_GAPFILL/silt_30m"), 'silt'],
  ];

  var soil_covariates = ee.Image().select();
  
  soil_list = soil_list
    .forEach(function(list){
      var image = list[0];
      var name = list[1];
      
      var images= ee.Image().select()
        .addBands(image.select(0).multiply(1/6))  // 0-5
        .addBands(image.select(1).multiply(2/6))  // 5-15
        .addBands(image.select(2).multiply(3/6)); // 15-30
  
      image = images
        .reduce('sum')
        .rename(name)
        .int16();
    
      soil_covariates =  soil_covariates.addBands(image);
    });
  
  //------ Probabilidade de ocorrência de classes ou tipos de solo COS 
  var soil_classes = [
      'Ferralsols',
      'Histosols',
  ];
  
  var sandysols_classes = [
      'Arenosols',
      'Podzols'
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
    
    
  //Agrupamento de classes WRB levando em consideração a granulometria
  
    //------ Probabilidade de ocorrência de classes ou tipos de solo
  var sandy_classes = [
      'Arenosols',
      'Andosols',
      'Leptosols',
      'Regosols',
      'Podzols',
  ];
  
  var loam_classes = [
      'Albeluvisols',
      'Alisols',
      'Calcisols',
      'Cambisols',
      'Fluvisols',
      'Kastanozems',
      'Gypsisols',
      'Solonchaks',
      'Luvisols',
      'Plinthosols',
    ];
  
  var clayey_classes = [
      'Acrisols',
      'Gleysols',
      'Lixisols',
      'Phaeozems',
      'Solonetz',
      'Stagnosols',
      'Umbrisols',
      'Vertisols',
      'Chernozems',
    ];
    
  var very_clayey_classes = [
      'Ferralsols',
      'Nitisols',
      'Histosols',
    ];
    
  // var stable_areas_c80 = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LULC_C80_STABLE_AREAS_30M_DUMMY'); //Utilizado na Cbeta e até a C1_v0-1-5
  var stable_areas_c90 = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LULC_C90_STABLE_AREAS_30M_DUMMY_v4');  
  // var stable_areas = ee.Image('projects/mapbiomas-workspace/SOLOS/LULC_STABLE_AREAS_30M_DUMMY-v3-1');  
  
  //------ Índices espectrais minerais
  // var oxides = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_OXIDES_BY_BYTE').rename('oxides');
  var clayminerals = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_CLAYMINERALS_BY_BYTE').rename('clayminerals');
  var oxides = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_OXIDES_BY_BYTE_v1').rename('oxides'); //Com interpolação nos dados vazios
  // var clayminerals = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_CLAYMINERALS_BY_BYTE_v1').rename('clayminerals'); //Com interpolação nos dados vazios

  
  //------Carbono abaixo do solo, Carbono acima do solo, Madeira Morta, Serrapilheira, Carbono total. 
  var qcn = ee.ImageCollection('projects/mapbiomas-workspace/SEEG/2022/QCN/QCN_30m_BR_v2_0_1').mosaic();
  
  //------Coordenadas geograficas obliquas
  function get_ogcs (){
    // https://soil.copernicus.org/articles/6/269/2020/  
    /*print(ui.Label('COORDENADAS OBLIQUAS = OGCs = b2 = raiz(a^2 + b^2) * cos(angle - atan(a/b)'));
    print(ui.Label('b2 = raiz(a^2 + b^2) * cos(angle - atan(a/b)'));
    print(ui.Label('b2 = m * cos(angle - atan(n)'));
    print(ui.Label('b2 = m * cos(angle_atan_n'));
    print(ui.Label('b2 = m * cos_n'));
    print(ui.Label('b2 = b2'));
    */
    
    ////////////////////////////////////////////
    // for image
    var lonLat = ee.Image.pixelLonLat();
    
    var img = {
      a:lonLat.select('longitude'),//longitude,
      b:lonLat.select('latitude'),//latitude
    };
    
    img.m = ee.Image().expression('a**2 + b**2',img).sqrt();
    img.n = ee.Image().expression('a/b',img);
    img.atan_n =  img.n.atan();
    
    var angles = [0.0, 0.17, 0.33, 0.50, 0.67, 0.83];
    var ogcs = ee.Image().select();
    
    
    angles.forEach(function(angle){
      
      angle = angle * 3.1416;
      var angle_atan_n = ee.Image(angle).subtract(img.atan_n);
      
      img.cos_n = angle_atan_n.cos();
    
      img.b2 = img.m.multiply(img.cos_n);
    
      var newband = 'OGC_'+ ((''+angle).slice(0,4)).replace('.','_');
      var OGC = img.b2.rename(newband).float();
   
      ogcs = ogcs.addBands(OGC);
      
    });
   
   return ogcs; 
  }
  
  var ogcs = get_ogcs();
  
  //------ União das covariáveis estáticas
  var static_covariates = ee.Image().select()
      .addBands(soil_covariates)
      .addBands(depth_5)
      .addBands(depth_15)
      .addBands(depth_25)
      .addBands(mb_ndvi_median_decay)
      // granulometria
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','000_010cm')).filter(ee.Filter.eq('type','sand')).mosaic().rename('beta_sand_000_010'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','010_020cm')).filter(ee.Filter.eq('type','sand')).mosaic().rename('beta_sand_010_020'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','020_030cm')).filter(ee.Filter.eq('type','sand')).mosaic().rename('beta_sand_020_030'))

      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','000_010cm')).filter(ee.Filter.eq('type','silt')).mosaic().rename('beta_silt_000_010'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','010_020cm')).filter(ee.Filter.eq('type','silt')).mosaic().rename('beta_silt_010_020'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','020_030cm')).filter(ee.Filter.eq('type','silt')).mosaic().rename('beta_silt_020_030'))
        

      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','000_010cm')).filter(ee.Filter.eq('type','clay')).mosaic().rename('beta_clay_000_010'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','010_020cm')).filter(ee.Filter.eq('type','clay')).mosaic().rename('beta_clay_010_020'))
      .addBands(ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0')
        .filter(ee.Filter.eq('pepth','020_030cm')).filter(ee.Filter.eq('type','clay')).mosaic().rename('beta_clay_020_030'))
        

      // .addBands(stable_areas_c80) //LULC coleção 8.0
      .addBands(stable_areas_c90) //LULC coleção 9.0
      .addBands(geomorphometry_covariates)
      .addBands(ee.Image("MERIT/DEM/v1_0_3").select(['dem'],['elevation']).int16())
      .addBands(ee.Image.pixelLonLat().select('longitude').add(34.8).multiply(-1).multiply(1000).toInt16())
      .addBands(ee.Image.pixelLonLat().select('latitude').add(5).multiply(-1).multiply(1000).toInt16())
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL')) ////Adicionado na module-v001
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(soil_classes))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(sandysols_classes).reduce('sum').rename('Sandysols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(humisols_classes).reduce('sum').rename('Humisols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(thinsols_classes).reduce('sum').rename('Thinsols'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(wetsols_classes).reduce('sum').rename('Wetsols'))
      
      //Agrupamento WRB em relação a granulometria
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(sandy_classes).reduce('sum').rename('Sandy_soil'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(loam_classes).reduce('sum').rename('Loam_soil'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(clayey_classes).reduce('sum').rename('Clayey_soil'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/WRB_ALL_SOILS_SOILGRIDS_30M_GAPFILL').select(very_clayey_classes).reduce('sum').rename('Very_clay_soil'))
      
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/FAO_blackSoilProbability_30m_v1').rename('black_soil_prob'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY/lv1'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY/lv2'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY/lv3'))

      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_BIOMAS_30M_DUMMY'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_FITOFISIONOMIA_250MIL_2023_DUMMY_v1')) //Com interpolação nos dados vazios
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_PROVINCIAS_250MIL_DUMMY')) ///Adicionado na module-v001
      .addBands(oxides)
      .addBands(clayminerals)
      .addBands(qcn.select(["cagb","cbgb","cdw","clitter","total"],["cagb","cbgb","cdw","clitter","ctotal"]).float())
      .addBands(ogcs)
      // GT ÁGUA
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_STATIC_WATER_ACCUMULATED_1985_2023').rename('mb_water_39y_accumulated'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_STATIC_WATER_RECURRENCE_1985_2023').rename('mb_water_39y_recurrence'));

  return static_covariates;
};

// O acesso às covariáveis é feito por meio de uma requisão (função: "require"). Para uso desses dados, acesse ao repositório de scripts. 
// require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').static_covariates();
// print(require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').dynamic_covariates());
