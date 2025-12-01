/******************************************************************************
 * MapBiomas Solo — Estoque de Carbono Orgânico do Solo — Matriz de Treinamento
 * ----------------------------------------------------------------------------
 * Objetivo
 *   - Consolidar matriz de treinamento anual com covariáveis estáticas, dinâmicas
 *     e atributos amostrais para modelagem de estoque de carbono orgânico.
 * Entradas (assets)
 *   - users/taciaraz/mapbiomas_solo:collection3/carbon/0_covariate_source (fonte de covariáveis)
 *   - projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil (limitação espacial)
 *   - projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/collection2/
 *       2025-06-21-organic-carbon-stock-gram-per-square-meter (amostras)
 * Saída (asset)
 *   - projects/mapbiomas-workspace/SOLOS/AMOSTRAS/MATRIZES/collection3/
 *       matriz-collection3_carbon_datac2v1
 * Bandas exportadas (ordem fixa ou derivada)
 *   - Covariáveis estáticas e dinâmicas selecionadas + year + estoque + dataset_id;
 *     tipo: numérico; domínio: compatível com variáveis originais.
 * Regras de inclusão
 *   - Seleção explícita de bandas estáticas e dinâmicas conforme listas definidas.
 *   - Associação ano–imagem para covariáveis dinâmicas.
 *   - Filtragem das amostras por ano.
 *   - Amostragem pontual em resolução de 30 m, preservando geometria e metadados.
 * Autoria
 *   - MapBiomas Solo — contato@mapbiomas.org
 *   - Versão: 2025-06-21 Taciara
 ******************************************************************************/

//--- VERSIONING
var version = 'c03_soc_v2025_11_24'

// --- --- --- PREPARING THE TRAINING MATRIX --- --- ---
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');

// 1) Preparar pontos (ajuste aqui se o campo original for 'ano')
var points = ee.FeatureCollection(
  'projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/collection3/2025_11_24_soildata_soc_trep'
).map(function(pt) {
  return pt
    // variável-alvo (estoque)
    .set('carbono_gm2', pt.get('carbono_gm2'))
    .set('carbono_gm2_qmap', pt.get('carbono_gm2_qmap')) 
    .set('profundidade', pt.get('profundidade'))
    // ano
    .set('year', pt.get('ano'))
    // ID original
    .set('id', pt.get('id'))
    // Manter os índices existentes
    .set('IFN_index',    pt.get('IFN_index'))
   // .set('PSEUDO_index', pt.get('PSEUDO_index'))
    .set('YEAR_index',   pt.get('YEAR_index'));
});

Map.addLayer(points, {color: 'ff0000'}, 'Filtered Points', false);
print('Original points properties:', points.limit(5));   

// --- --- ---
// --- LIST ENVIRONMENTAL COVARIATES FROM MODULE
var covariates = require('users/taciaraz/mapbiomas_solo:collection3/carbon/0_covariate_source');
var static_covariates = covariates.static_covariates();
var dynamic_covariates = covariates.dynamic_covariates();

// --- DEFINITION OF COVARIATES LIST
var selected_bandnames_static = [

  // predição da coleção anterior
  'areia_000_030cm',
  'silte_000_030cm',
  'argila_000_030cm',
  
  // classes de solo WRB (probabilidade)
  // probabilidades unicas
  'Ferralsols', 'Histosols', 'Nitisols', 'Vertisols', 'Plinthosols', 
  // probabilidades agregadas
  'Humisols', 'Sandysols', 'Thinsols', 'Wetsols',

  // Pedologia IBGE
    'PLANOSSOLO', 'CHERNOSSOLO', 'LATOSSOLO', 'PLINTOSSOLO',
    'GLEISSOLO', 'LUVISSOLO', 'NITOSSOLO',
    'ESPODOSSOLO', 'ARGISSOLO', 'ORGANOSSOLO', 'CAMBISSOLO',
    'NEOSSOLO_FLUVICO', 'NEOSSOLO_QUARTZARENICO', 'NEOSSOLO_LITOLICO',
    
    'sibcs_rasos',
    'sibcs_btextural', 
    'sibcs_esqueleto', 
    'sibcs_homogeneo',
    'sibcs_argiloso',

  // black soils
  'black_soil_prob',

  // morfometria / relevo
  'slope',
  'convergence',
  'cti',
  'eastness',
  'northness',
  'spi',
  'dev_magnitude',
  'dev_scale',
  'cross_sectional',
  'longitudinal_curvature',

  // altitude
  'elevation',

  // clima Köppen
  'koppen_l1_A',
  'koppen_l2_Af',
  'koppen_l2_Am',
  'koppen_l2_As',
  'koppen_l2_Aw',

  'koppen_l3_Bsh',

  'koppen_l1_C',
  'koppen_l2_Cf',
  'koppen_l3_Cfa',
  'koppen_l3_Cfb',

  'koppen_l2_Cw',
  'koppen_l3_Cwa',
  'koppen_l3_Cwb',

  // biomas IBGE
  'Amazonia',
  'Caatinga',
  'Cerrado',
  'Mata_Atlantica',
  'Pampa',
  'Pantanal',
  'Zona_Costeira',

  // fitofisionomias IBGE
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

  // províncias estruturais (IBGE)
  'Amazonas_Solimoes_Provincia',
  'Amazonia_Provincia',
  'Borborema_Provincia',
  'Cobertura_Cenozoica_Provincia',
  'Costeira_Margem_Continental_Provincia',
  'Mantiqueira_Provincia',
  'Parecis_Provincia',
  'Parnaiba_Provincia',
  'Reconcavo_Tucano_Jatoba_Provincia',
  'Sao_Francisco_Provincia',
  'Tocantis_Provincia',

  // subprovíncias
  'sedimentos',
  'sedimentares',
  'vulcanicas',
  'metamorficas',
  
  // ocorrencia conjunta de bioma e solo
  'pantanal_plintossolo',
  'pantanal_neossolo_quartzarenico',
  'pantanal_gleissolo',
  'pantanal_planossolo',
  
  'caatinga_latossolo',

  // ocorrencia conjunta de solo e subprovincia 
  'latossolo_vulcanicas',
  'latossolo_sedimentares',
  'latossolo_sedimentos',
  
  'argissolo_metamorficas',
  'argissolo_sedimentares',
  'argissolo_sedimentos',
  
  'raso_vulcanica',
  'raso_sedimentares',

  // ocorrencia conjunta de bioma e subprovincia   
  'pantanal_sedimentos',
  'amazonia_sedimentos',
  'cerrado_sedimentos',
  'caatinga_sedimentos',
  'mata_atlantica_sedimentos',
  
// Distance
  'Distance_to_sand_v33',
  'Distance_to_rock_v33', // decisão final
  
  'Area_Estavel'
];

var selected_bandnames_dynamic = [
    // List of covariates for available dynamic covariates
    
    //GT vegetation indices
     'mb_ndvi_median_decay',
     'mb_evi2_median_decay',

    // //MapBiomas - Col.10
    
'formacaoFlorestal',
'outrasFormacoesFlorestais',
'formacaoCampestre',
'formacaoSavanica',
'campoAlagadoAreaPantanosa',
'restingas',
'vegNatural',
'lavouras',
'pastagem',
'silvicultura',
'mosaicoDeUsos',
'agropecuaria',
'afloramento',
'areia',
];


// --- --- STATIC
var static_image = ee.Image.cat(static_covariates.select(selected_bandnames_static));
print(static_image, "static_image");
Map.addLayer(static_image, {}, 'Static Covariates', false);

// --- --- DYNAMIC 
var dynamic_images = dynamic_covariates.map(function(img) {
    return img
        .select(selected_bandnames_dynamic)
        .copyProperties(img, img.propertyNames());
});

print(dynamic_images, "dynamic_images");
Map.addLayer(dynamic_images, {}, 'Dynamic Covariates', false);

/////////////////////////////////// 
// --- --- ---
// Sampling covariates

var static_covariates  = static_image;   // ee.Image
var dynamic_covariates = dynamic_images; // ee.ImageCollection

// 3) Lista de anos (server-side)
var years = ee.List(points.aggregate_array('year').distinct().sort());
print('years', years);

// 4) Função para montar a matriz de um ano
var perYearCollections = years.map(function(year) {
  year = ee.Number(year);

  // 4.1. Covariáveis dinâmicas daquele ano
  var dynamic_covariates_year = dynamic_covariates
    .filter(ee.Filter.eq('year', year))
    .first();

  // 4.2. Empilha covariáveis + banda year
  var covariates = ee.Image().select()
    .addBands(static_covariates).round()
    .addBands(dynamic_covariates_year).round()
    .addBands(
      ee.Image.constant(year).int16().rename('year')
    );

  // 4.3. Filtra pontos daquele ano
  var points_year = points.filter(ee.Filter.eq('year', year));

  // 4.4. Amostragem
  var datatraining = covariates.sampleRegions({
    collection: points_year,
    properties: ['carbono_gm2', 'carbono_gm2_qmap', 'year', 'id', 'IFN_index', 'YEAR_index', 'profundidade'],
    scale: 30,
    geometries: true
  });


  // Retorna uma FeatureCollection (será uma entrada da lista)
  return datatraining;
});

// 5) Junta tudo em uma única matriz
var matrix = ee.FeatureCollection(perYearCollections).flatten();

// 6) Inspeção
print('matrix (sample)', matrix.limit(10));
print('matrix size', matrix.size());

    
    var assetId = 'projects/mapbiomas-workspace/SOLOS/AMOSTRAS/MATRIZES/collection3/' + version;
    
    Export.table.toAsset({
        collection: matrix,
        description:version,
        assetId:assetId,
    });
