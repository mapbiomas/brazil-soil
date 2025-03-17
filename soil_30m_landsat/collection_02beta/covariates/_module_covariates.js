/* MODULO DE COVARIÁVEIS GERAIS
  O módulo permite adicionar novas covariáveis ou alterar as covariáveis existentes para utilização no STOCKCOS e GRANULOMETRY.

  MAPBIOMAS SOLO @contato: contato@mapbiomas.org
  08 de Abril de 2024

TODAS AS COVARIÁVEIS ESTARÃO NESSE SCRIPT, APENAS INCLUIR, NÃO APAGAR (MESMO SENDO ATUALIZAÇÃO DE COVAR)

ATUALIZAÇÕES:
2024-01-X  - Atualização da covariável de LULC col.8;
           - Reprocessamento das covariáveis usadas na col. beta.
2024-02-26 - Adição da covariável de probabilidade individual WRB;
           - Adição da covariável de províncias geológicas IBGE;
           - Atualização da covariável de fitofisionomia IBGE para versão 2023.
2024-03-11 - Adição das covariáveis de mapbiomas_granulometria_v001.
2024-04-08 - Adição das covariáveis de coordenadas obliquas.
2024-04-30 - Atualização das covariáveis de mapbiomas_granulometria_v002.
2024-05-10 - Atualização das covariáveis de mapbiomas_granulometria_v003.
2024-06-24 - Adição das covariável mapa do mapbiomas_1984_SOC_30cm.
2024-07-29 - Adição do processamento dos indices (NDVI/EVI/SAVI) de vegetação do Mapbiomas.
2024-08-26 - Atualização das covariáveis com interpolação (Ex: XX_v1).
             Adição da covariável de LULC col.9 (Stable Areas e Age).
2024-08-27 - Adição do processamento de gapfill nos indices de vegetação.
2024-11-17 - Adição das predições de areia, silte e argila 0-10 como covariáveis
2024-11-27 - adição de covariavel (fake) IFN_index, para balanceamento das amostras do IFN
*/

// --- --- --- --- --- COVARIÁVEIS AMBIENTAIS EXPLÍCITAS

// --- COVARIÁVEIS ESTÁTICAS
exports.static_covariates = function(){
  
  // Target values of depth (constant)
    var depth_list = [
    [ee.Image.constant(5).rename('depth_5')],
    [ee.Image.constant(15).rename('depth_15')],
    [ee.Image.constant(25).rename('depth_25')],
    ];
    
    var target = ee.Image.constant(1).rename('target'); // Inventário florestal nacional target
  
    
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
  
  // Propriedades do solo:
  // conteúdo de argila, conteúdo de silte, conteúdo de areia, capacidade de troca de cátions, pH em água, densidade do solo,
  // conteúdo de carbono, nitrogênio total, fragmentos grossos.
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
      .addBands(target)
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v001_CLAY_PERCENT").rename('mapbiomas_clay_v001')) // Utilizado na StockCos v001 
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v001_SAND_PERCENT").rename('mapbiomas_sand_v001')) //Utilizado na StockCos v001
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v001_SILT_PERCENT").rename('mapbiomas_silt_v001')) // Utilizado na StockCos v001
      // //
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v002_CLAY_PERCENT").rename('mapbiomas_clay_v002')) // Utilizado na StockCos v002 
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v002_SAND_PERCENT").rename('mapbiomas_sand_v002')) // Utilizado na StockCos v002
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v002_SILT_PERCENT").rename('mapbiomas_silt_v002')) // Utilizado na StockCos v002
      // //
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v003_CLAY_PERCENT").rename('mapbiomas_clay_v003')) // Utilizado na StockCos v003 
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v003_SAND_PERCENT").rename('mapbiomas_sand_v003')) //Utilizado na StockCos v003
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v003_SILT_PERCENT").rename('mapbiomas_silt_v003')) // Utilizado na StockCos v003
      // //
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_0_10cm_prediction_clay_0_10cm").rename('v010_prediction_clay_0_10cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_0_10cm_prediction_sand_0_10cm").rename('v010_prediction_sand_0_10cm'))
       // // // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_0_10cm_prediction_silt_0_10cm").rename('v010_prediction_silt_0_10cm'))
      // //
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_10_20cm_prediction_clay_10_20cm").rename('v010_prediction_clay_10_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_10_20cm_prediction_sand_10_20cm").rename('v010_prediction_sand_10_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_10_20cm_prediction_silt_10_20cm").rename('v010_prediction_silt_10_20cm'))
      //
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_20_30cm_prediction_clay_20_30cm").rename('v010_prediction_clay_20_30cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_20_30cm_prediction_sand_20_30cm").rename('v010_prediction_sand_20_30cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/v010_20_30cm_prediction_silt_20_30cm").rename('v010_prediction_silt_20_30cm'))
      //
      // // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent").select('clay_0_10cm').rename('beta_clay_0_10cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent").select('clay_10_20cm').rename('beta_clay_10_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent").select('clay_20_30cm').rename('beta_clay_20_30cm'))
      // // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent").select('clay_0_20cm').rename('beta_clay_0_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent").select('clay_0_30cm').rename('beta_clay_0_30cm'))
      //
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent").select('sand_0_10cm').rename('beta_sand_0_10cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent").select('sand_10_20cm').rename('beta_sand_10_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent").select('sand_20_30cm').rename('beta_sand_20_30cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent").select('sand_0_20cm').rename('beta_sand_0_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent").select('sand_0_30cm').rename('beta_sand_0_30cm'))
      //
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent").select('silt_0_10cm').rename('beta_silt_0_10cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent").select('silt_10_20cm').rename('beta_silt_10_20cm'))
      // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent").select('silt_20_30cm').rename('beta_silt_20_30cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent").select('silt_0_20cm').rename('beta_silt_0_20cm'))
       // //.addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent").select('silt_0_30cm').rename('beta_silt_0_30cm'))
     
      //
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent").select('clay_000_010cm').rename('clay_000_010cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent").select('clay_010_020cm').rename('clay_010_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent").select('clay_020_030cm').rename('clay_020_030cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent").select('clay_000_020cm').rename('clay_000_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent").select('clay_000_030cm').rename('clay_000_030cm'))
      //
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent").select('sand_000_010cm').rename('sand_000_010cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent").select('sand_010_020cm').rename('sand_010_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent").select('sand_020_030cm').rename('sand_020_030cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent").select('sand_000_020cm').rename('sand_000_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent").select('sand_000_030cm').rename('sand_000_030cm'))
      //
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent").select('silt_000_010cm').rename('silt_000_010cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent").select('silt_010_020cm').rename('silt_010_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent").select('silt_020_030cm').rename('silt_020_030cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent").select('silt_000_020cm').rename('silt_000_020cm'))
      .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent").select('silt_000_030cm').rename('silt_000_030cm'))
      //
      // .addBands(ee.Image("projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/CARBONO_ORGANICO_DO_SOLO_BASELINE/v001_1984_SOC_tC_ha-000_030cm").rename('mapbiomas_v001_1984')) //Utilizado na StockCos v004
      //
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
      // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY_v1/lv1'))//Com interpolação nos dados vazios
      // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY_v1/lv2'))//Com interpolação nos dados vazios
      // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY_v1/lv3'))//Com interpolação nos dados vazios
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_BIOMAS_30M_DUMMY'))
      // .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_FITOFISIONOMIA_250MIL_2023_DUMMY')) ///Atualizado para dados 2023 //Adicionado na module-v001
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_FITOFISIONOMIA_250MIL_2023_DUMMY_v1')) //Com interpolação nos dados vazios
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IBGE_PROVINCIAS_250MIL_DUMMY')) ///Adicionado na module-v001
      .addBands(oxides)
      .addBands(clayminerals)
      .addBands(qcn.select(["cagb","cbgb","cdw","clitter","total"],["cagb","cbgb","cdw","clitter","ctotal"]).float())
      .addBands(ogcs)
      // GT ÁGUA
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_STATIC_WATER_ACCUMULATED_1985_2023').rename('mb_water_39y_accumulated'))
      .addBands(ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_STATIC_WATER_RECURRENCE_1985_2023').rename('mb_water_39y_recurrence'))
      // para o balanceamento das amostras do inventario florestal nacional
      .addBands(ee.Image(0).rename('IFN_index'));
      
  return static_covariates;
};

// --- COVARIÁVEIS DINÂMICAS
// auxiliar para filtrar por satelite o mosaico do MapBiomas
var year_sat = {
  1985:	'l5',
  1986:	'l5',
  1987:	'l5',
  1988:	'l5',
  1989:	'l5',
  1990:	'l5',
  1991:	'l5',
  1992:	'l5',
  1993:	'l5',
  1994:	'l5',
  1995:	'l5',
  1996:	'l5',
  1997:	'l5',
  1998:	'l5',
  1999:	'l5',
  2000:	'l5',
  
  2001:	'l7',
  2002:	'l7',
  
  2003:	'l5',
  2004:	'l5',
  2005:	'l5',
  2006:	'l5',
  2007:	'l5',
  2008:	'l5',
  2009:	'l5',
  2010:	'l5',
  
  2011:	'l7',
  2012:	'l7',
  
  2013:	'l8',
  2014:	'l8',
  2015:	'l8',
  2016:	'l8',
  2017:	'l8',
  2018:	'l8',
  2019:	'l8',
  2020:	'l8',
  2021:	'l8',
  2022:	'l8',
  2023:	'l8',
};

exports.dynamic_covariates = function (){
  //------ Classificação de cobertura e uso da terra
  // var ageLulc = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/AGE_LULC_COL8_DUMMY_v1'); // Idades das Classes Coleção 8.0 (1985-2021)
  var ageLulc = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LULC_C90_AGE_30M_DUMMY_v1'); // Idades das Classes Coleção 9.0 (1985-2023)
  
  var ageLulc_list = ageLulc.aggregate_array('index').distinct();
  
  // indices espectrais gerados direto da coleção landsat
  var index_col = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_INDEX_BY_BYTE');

  // indices espectrais do mosaico do mapbiomas
  var mb_col = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/BRAZIL/mosaics-2');
  var indices_decay = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_MB_INDICES_DECAY');
  
  // Mapbiomas Degradação - Área de Borda - Soma das faixas
  var mb_summedEdges = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_DEGRADATION_BETA_SUMMED_EDGES_DUMMY');
  
  // Mapbiomas Água Col 3. (Baseada na LULC Col. 9)
  var mb_waterAccumulate = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_DYNAMIC_WATER_ACCUMULATE');
  var mb_waterRecurrence = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_DYNAMIC_WATER_RECURRENCE');
  
  //Mapbiomas Fogo Col 3.
  var mb_fireAccumulate = ee.Image('projects/mapbiomas-workspace/FOGO_COL3/2-Subprodutos/mapbiomas-fire-collection31-accumulated-burned-v1');
  var mb_fireRecurrence = ee.Image('projects/mapbiomas-workspace/FOGO_COL3/2-Subprodutos/mapbiomas-fire-collection31-fire-recurrence-v1');
  var mb_fireTimeAfterFire = ee.Image('projects/mapbiomas-workspace/FOGO_COL3/2-Subprodutos/mapbiomas-fire-collection31-time-after-fire-v1');

  var IFN = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/GT_TARGET_IFN');
 
 //------ União das covariáveis dinâmicas
  var years = [
    1948,1949,1950,1951,1952, 
    1953,1954,1955,1956,1957,1958,1959,
    1960,1961,1962,1963,1964,
    1965,1966,1967,1968,1969,
    1970,1971,1972,1973,1974,
    1975,1976,1977,1978,1979,
    1980,1981,1982,1983,1984,
    1985,1986,1987,1988,1989,
    1990,1991,1992,1993,1994,
    1995,1996,1997,1998,1999,
    2000,2001,2002,2003,2004,
    2005,2006,2007,2008,2009,
    2010,2011,2012,2013,2014,
    2015,2016,2017,2018,2019,
    2020,2021,2022,2023,2024
  ];
  
  var dynamic_covariates = years.map(function(year){
  
    var year_alternative = year;
    if (year_alternative < 1985) {
      year_alternative = 1985;
    } else if (year_alternative === 2024) {
      year_alternative = 2023;
    }

    //------ Índices de vegetação (NDVI, EVI e SAVI) 
    // var evi_year = index_col.filter(ee.Filter.eq('year',year_alternative)).select('evi_mean').first();
    // var savi_year = index_col.filter(ee.Filter.eq('year',year_alternative)).select('savi_mean').first();
    // var ndvi_year = index_col.filter(ee.Filter.eq('year',year_alternative)).select('ndvi_mean').first();
    
    //------ Índices de vegetação MapBiomas (NDVI, EVI e SAVI) 
    var ageLulc_year = ageLulc_list.iterate(function(current,previous){
      
      var index = ee.String(current);
      
      var image = ageLulc.filter(ee.Filter.eq('index',index)).mosaic();
      
      var image_year = image.select([index.cat('_'+year_alternative)],[index]);
      
      return ee.Image(previous)
        .addBands(image_year);
    },ee.Image().select());
  
    ageLulc_year = ee.Image(ageLulc_year);
  
    // var dynamic_covariates_year = ee.Image().select().addBands(ageLulc_year)
    // var dynamic_covariates_year = dynamic_covariates_year;

  // // Inventário Florestal Nacional
      
  // //  INDICES MOSAICO MAPBIOMAS COM DECAIMENTO  
      var mb_ndvi_median = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_ndvi_median_decay').first();
      var mb_ndvi_median_wet = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_ndvi_median_wet_decay').first();
      var mb_ndvi_median_dry = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_ndvi_median_dry_decay').first();
      var mb_evi2_median = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_evi2_median_decay').first();
      var mb_evi2_median_wet = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_evi2_median_wet_decay').first();
      var mb_evi2_median_dry = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_evi2_median_dry_decay').first();
      var mb_savi_median = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_savi_median_decay').first();
      var mb_savi_median_wet = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_savi_median_wet_decay').first();
      var mb_savi_median_dry = indices_decay.filter(ee.Filter.eq('year',year_alternative)).select('mb_savi_median_dry_decay').first();


       var dynamic_covariates_year = ee.Image().select()
          .addBands(ageLulc_year)
          .addBands(mb_ndvi_median)
          .addBands(mb_ndvi_median_wet)
          .addBands(mb_ndvi_median_dry)
          .addBands(mb_evi2_median)
          .addBands(mb_evi2_median_wet)
          .addBands(mb_evi2_median_dry)
          .addBands(mb_savi_median)
          .addBands(mb_savi_median_wet)
          .addBands(mb_savi_median_dry);
   // 
    dynamic_covariates_year = dynamic_covariates_year
      .addBands(mb_summedEdges.select('edge_sum_' + year_alternative).rename('mb_summed_edges'))
      .addBands(mb_waterRecurrence.select('water_recurrence_1985_' + year_alternative).rename('mb_water_recurrence_dynamic'))
      .addBands(mb_waterAccumulate.select('water_accumulated_1985_' + year_alternative).rename('mb_water_accumulate_dynamic'))
      .addBands(mb_fireAccumulate.select('fire_accumulated_1985_' + year_alternative).rename('mb_fire_accumulate_dynamic'))
      .addBands(mb_fireRecurrence.select('fire_recurrence_1985_' + year_alternative).rename('mb_fire_recurrence_dynamic'))
      .addBands(mb_fireTimeAfterFire.select('classification_' + (year_alternative === 1985 ? 1986 : year_alternative)).rename('mb_fire_time_after_fire'))
            
            // dynamic_covariates_year = dynamic_covariates_year;
      var mb_indices_year = [
        'ndvi_median',
        'ndvi_median_wet','ndvi_median_dry',
        'evi2_median',
        'evi2_median_wet','evi2_median_dry',
        'savi_median',
        'savi_median_wet','savi_median_dry',
      ];
      // // print('mb_indices_year',mb_indices_year);
      mb_indices_year.forEach(function(band){
        var index_band = mb_col
          .filter(ee.Filter.eq('year',year_alternative)).select([band],['mb_'+band])
          .filter(ee.Filter.eq('satellite',year_sat[year_alternative]))
          .median()
          .int16();

      dynamic_covariates_year = dynamic_covariates_year.addBands(index_band);
       });  
    
    
        // Aplicando Gapfill após todas as bandas dos Indices MapBiomas
        var bandNames = dynamic_covariates_year.bandNames();
        var applyGapFill = function(image) { 
        
        // aplicar o gapfill do t0 (ano zero) até tn
        var imageFilledt0tn = bandNames.iterate(function(bandName, previousImage) {
          var currentImage = image.select(ee.String(bandName));
          previousImage = ee.Image(previousImage);
          currentImage = currentImage.unmask(previousImage.select([0]));
          return currentImage.addBands(previousImage);
        }, ee.Image(image.select([bandNames.get(0)])));
        
        imageFilledt0tn = ee.Image(imageFilledt0tn);
        
        // Inverter a ordem das bandas para preencher de tn até t0
        var bandNamesReversed = bandNames.reverse();
        
        // aplicar o gapfill do tn até t0 (ano zero)
        var imageFilledtnt0 = bandNamesReversed.slice(1).iterate(function(bandName, previousImage) {
          var currentImage = imageFilledt0tn.select(ee.String(bandName));
          previousImage = ee.Image(previousImage);
          currentImage = currentImage.unmask(previousImage.select(previousImage.bandNames().length().subtract(1)));
          return previousImage.addBands(currentImage);
        }, ee.Image(imageFilledt0tn.select([bandNamesReversed.get(0)])));
        
        imageFilledtnt0 = ee.Image(imageFilledtnt0).select(bandNames);
        return imageFilledtnt0;
      };
      
      dynamic_covariates_year = applyGapFill(dynamic_covariates_year);
      
    return dynamic_covariates_year.set({year: year});
  });
  
  // print('dynamic_covariates', dynamic_covariates);
  return ee.ImageCollection(dynamic_covariates);
}

// print('dynamic_covariates',dynamic_covariates());
// O acesso às covariáveis é feito por meio de uma requisão (função: "require"). Para uso desses dados, acesse ao repositório de scripts. 
// require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').static_covariates();
// print(require('users/wallacesilva/mapbiomas-solos:COLECAO_01/nova_estrutura/_modulo/covariaveis').dynamic_covariates());
