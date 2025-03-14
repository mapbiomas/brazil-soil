/* RANDOM FOREST MACHINE LEARNING MODEL TRAINING
    This script handles the training of the Random Forest model using input data and covariates, 
    and exports the trained model
    
    MAPBIOMAS SOIL @contact: contato@mapbiomas.org
    October 7, 2024
*/

// --- VERSIONING
var version = 'collection2-filter-rep-MODEL2'; // only line to be changed

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
var static_covariates = covariates.static_covariates();
var dynamic_covariates = covariates.dynamic_covariates();

var static_covariates_module = static_covariates.bandNames();
var dynamic_covariates_module = dynamic_covariates.first().bandNames();

var static_covariates_names = static_covariates_module.filter(ee.Filter.inList('item', selected_bandnames_static));
var dynamic_covariates_names = dynamic_covariates_module.filter(ee.Filter.inList('item', selected_bandnames_dynamic));


var covariates_names = static_covariates_names.cat(dynamic_covariates_names);
print('Set of covariate:', covariates_names)

// --- LULC MASKS

var mapbiomas_lulc = 'projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1'; //cuts water Collection 9 (1985-2023)
var lulc = ee.Image(mapbiomas_lulc);

// --- TRAINING RANDOM FOREST MODEL

var rf_params = {
    ntree:400,
    mtry:16, 
    nodesize:2,
    sampsize:0.632,
    maxNodes: 20,
    seed: 2021,
};

 var randomForestModel = ee.Classifier
.smileRandomForest({
    numberOfTrees: rf_params.ntree,
    variablesPerSplit: rf_params.mtry,
    minLeafPopulation: rf_params.nodesize,
    bagFraction: rf_params.sampsize,
    maxNodes:rf_params.maxNodes,
    seed:rf_params.seed,
})
 .setOutputMode("REGRESSION")
.train({
     features: points_3,
     classProperty: "estoque",
     inputProperties: covariates_names
 });


// --- EXPORTING RF MODEL
var assetId = 'projects/mapbiomas-workspace/SOLOS/MODELOS_RF/soil_organic_carbon/randomForestModel-' + version;
var arvRF = ee.List(randomForestModel.explain().get('trees'));

print('Model trees:', arvRF)

// encodeFeatureCollection aims to split a string into smaller parts
function encodeFeatureCollection(value) {
    var string = ee.String.encodeJSON(value) // list as a JSON string
    var stringLength = string.length() 
    var maxLength = 100000 // max length of a property (GEE limit)
    var maxProperties = 1000 // max number of properties per feature
    var values = ee.List.sequence(0, stringLength, maxLength)
        .map(function (start) {
            start = ee.Number(start)
            var end = start.add(maxLength).min(stringLength)
            return string.slice(start, end)
        })
        .filter(ee.Filter.neq('item', ''))
    var numberOfProperties = values.size()
    return ee.FeatureCollection(ee.List.sequence(0, values.size(), maxProperties)
        .map(function (start) {
            start = ee.Number(start)
            var end = start.add(maxProperties).min(numberOfProperties)  // creates slices of the string to avoid exceeding the max size
            var propertyValues = values.slice(start, end)
            var propertyKeys = ee.List.sequence(1, propertyValues.size())
                .map(function (i) {
                    return ee.Number(i).format('%d')
                })
            var properties = ee.Dictionary.fromLists(propertyKeys, propertyValues)
            return ee.Feature(ee.Geometry.Point([0, 0]), properties)
        }).filter(ee.Filter.notNull(['1']))
    )
}

Export.table.toAsset({
    collection: encodeFeatureCollection(arvRF), // collection of trees to export
    description: 'arv-trees--'+ 'randomForestModel-' + version,
    assetId: assetId
});

print('Exported trees:',encodeFeatureCollection(arvRF))

// --- RF COVARIATES IMPORTANCE AND MODEL ERROR ESTIMATE
var dict = randomForestModel.explain();
print("Random Forest Explain", dict, 'Number of samples: ', points_1.size());

var error = ee.String(ee.Dictionary(dict).get('outOfBagErrorEstimate'));
dict = ee.Dictionary(ee.Dictionary(dict).get('importance'));
var keys = dict.keys().sort(dict.values()).reverse();
var values = dict.values(keys);
var rows = keys.zip(values);
var dict_b = {};

rows = rows.map(function(list) {
    return {c: ee.List(list).map(function(n) { return {v: n}; })};
});

var dataTable = {
    cols: [{id: 'band', label: 'Band', type: 'string'},
                 {id: 'importance', label: 'Importance', type: 'number'}],
    rows: rows
};

ee.Dictionary(dataTable).evaluate(function(result) {
    var chart = ui.Chart(result)
        .setChartType('BarChart')
        .setOptions({
            title: 'Random Forest Covariates Importance',
            legend: {position: 'none'},
            hAxis: {title: 'Covariates'},
            vAxis: {title: 'Importance'},
            viewWindow: {max: 100, min: 0}
        });

    chart.style().set('height', '256px').set('margin', '0px');

    var chart_panel = ui.Panel({
        widgets: [chart],
        layout: ui.Panel.Layout.Flow('vertical'),
    });

    print(chart_panel);
    
    var chart_table = ui.Chart(result).setChartType('Table');
    print(chart_table);

    error.evaluate(function(num){
        var error_label = ui.Label({
            value: 'Error estimate: ' + ('' + num).slice(0, 4),
            style: {},
        });

        chart_panel.add(error_label);
    });
});
