/* EXPORT TRAINING MATRIX AND LIST OF COVARIATES - STOCK COS
    This script manages the selection of environmental covariates used in subsequent analyses 
    and generates the data matrix by merging the COS stock data from SoilData with the covariates module.

    MAPBIOMAS SOIL @contact: contato@mapbiomas.org
    October 17, 2024
*/

//--- VERSIONING
var version = 'brasil-filter-rep' //Change as needed

// --- CALLING ENVIRONMENTAL COVARIATES FROM MODULE
var covariates = require('users/wallacesilva/mapbiomas-solos:COLECAO_01/development/_module_covariates/module_covariates');
var static_covariates_carbon = covariates.static_covariates();
var dynamic_covariates_carbon = covariates.dynamic_covariates();

// --- DEFINITION OF COVARIATES LIST
var selected_bandnames_static = [
    // List of covariates for available static covariates
    
    //Base Map Mapbiomas 1984
    
    // 'mapbiomas_v001_1984', 
    
    //WRB probability classes
    'Ferralsols',
    'Histosols',
    'Sandysols',
    'Humisols',
    'Thinsols',
    'Wetsols',
    
    //Soilgrids Soil Properties
    'bdod',
    'cec',
    'cfvo',
    'nitrogen',
    'phh2o',
    'soc',
    // 'sand', //(Used in STOCKCOS v000)
    // 'clay', //(Used in STOCKCOS v000)
    // 'silt', // (Used in STOCKCOS v000)
    
    'oxides',
    'clayminerals',

    //Granulometry MapBiomas
    // 'mapbiomas_sand_v003', 
    // 'mapbiomas_silt_v003', 
    // 'mapbiomas_clay_v003',
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
    
    //Oblique Coordinates (Used FROM STOCKCOS v002)
    // 'OGC_0', 
    // 'OGC_0_53',
    // 'OGC_1_03', 
    // 'OGC_1_57', 
    // 'OGC_2_10', 
    // 'OGC_2_60',
    
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
    
    //Fourth National Communication
    // "cagb",
    // "cbgb",
    // "cdw",
    // "clitter",
    // "ctotal",
    
    'Area_Estavel',
    
    'IFN_index'
];

var selected_bandnames_dynamic = [
    // List of covariates for available dynamic covariates
    
    //GT vegetation indices
    // 'evi_mean',
    // 'savi_mean',
    // 'ndvi_mean',
    
    // Mapbiomas vegetation indices 
    // 'mb_ndvi_median',
    // 'mb_evi2_median',
    // 'mb_savi_median',    
    
    'mb_ndvi_median_decay',
    'mb_evi2_median_decay',
    'mb_savi_median_decay',
    
    // 'mb_ndvi_median_wet',
    // 'mb_ndvi_median_dry',    
    
    // 'mb_ndvi_median_wet_decay',
    // 'mb_ndvi_median_dry_decay',
    
    // 'mb_evi2_median_wet',
    // 'mb_evi2_median_dry',    
    
    // 'mb_evi2_median_wet_decay',
    // 'mb_evi2_median_dry_decay',
 
    // 'mb_savi_median_wet',
    // 'mb_savi_median_dry',    
    
    // 'mb_savi_median_wet_decay',
    // 'mb_savi_median_dry_decay',
    
    // Mapbiomas Degradation Beta (SUM(30, 60, 90, 150, 300m))
    'mb_summed_edges',
    
    // Mapbiomas Water Col. 3
    // 'mb_water_accumulate_dynamic',
    // 'mb_water_recurrence_dynamic',
    
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

// --- --- STATIC
var static_image = ee.Image.cat(static_covariates_carbon.select(selected_bandnames_static));
print(static_image, "static_image");
Map.addLayer(static_image, {}, 'Static Covariates', false);

// --- --- DYNAMIC 
var dynamic_images = dynamic_covariates_carbon.map(function(image) {
        return image.select(selected_bandnames_dynamic);
});
print(dynamic_images, "dynamic_images");
Map.addLayer(dynamic_images, {}, 'Dynamic Covariates', false);

// --- --- --- PREPARING THE TRAINING MATRIX --- --- ---
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');

// Filtrar os biomas para excluir o bioma 'Amazônia'
var filtro_biomas = biomas.filter(ee.Filter.inList('Bioma', ['Amazônia','Caatinga', 'Cerrado', 'Mata Atlântica', 'Pantanal', 'Pampa'])).union();
// var filtro_biomas = biomas.filter(ee.Filter.eq('Bioma', 'Amazônia'));
// var filtro_biomas = biomas.filter(ee.Filter.eq('Bioma', 'Cerrado'));
var points = ee.FeatureCollection('projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/2024-12-01-organic-carbon-stock-gram-per-square-meter-filter-rep')
    .filterBounds(filtro_biomas) 
    .map(function(point){
        return point
            .select(['estoque', 'year', 'id', 'IFN_index'], ['estoque', 'year', 'id', 'IFN_index']);
            //.select(['soc_stock_g_m2', 'year', 'id'], ['estoque', 'year', 'dataset_id']);
            // .select(['soc_stock_t_ha', 'sampling_year', 'id'], ['estoque', 'year', 'dataset_id']);
            // .select(['carbono_estoque_gm2','data_coleta_ano','id'],['estoque','year','dataset_id']);
    })

Map.addLayer(points, {color: 'ff0000'}, 'Filtered Points', false);

var static_covariates = static_image; 
var dynamic_covariates = dynamic_images;

var matrix = ee.List([]);
points.aggregate_array('year').distinct().sort().evaluate(function(years){
    print('years',years);
    years.forEach(function(year){
        var dynamic_covariates_year = dynamic_covariates
            .filter(ee.Filter.eq('year',year))
            .first();
    
        var covariates = ee.Image().select()
            .addBands(static_covariates).round()
            .addBands(dynamic_covariates_year).round()
            .addBands(ee.Image(year).int16().rename('year'));
    
        var points_year = points
            .filter(ee.Filter.eq('year',year));
    
        var datatraining = covariates
            .sampleRegions({
                collection: points_year,
                properties: ['estoque','year','dataset_id'],
                scale: 30,
                geometries:true
            });
    
        matrix = matrix.add(datatraining);
    });
    
    matrix = ee.FeatureCollection(matrix).flatten();
    print('matrix', matrix.limit(10), matrix.size());
    
    var assetId = 'projects/mapbiomas-workspace/SOLOS/AMOSTRAS/MATRIZES/soil_organic_carbon/matriz-' + version;
    
    Export.table.toAsset({
        collection: matrix,
        description:version,
        assetId:assetId,
    });
});
