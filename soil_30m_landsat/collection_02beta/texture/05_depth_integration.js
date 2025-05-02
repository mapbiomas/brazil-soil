// plot simples dos dados https://code.earthengine.google.com/8ea3efa2d9cebc22531daf5f7273ab2a?noload=1 
/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: Mai 1, 2025
 * 
 * SCRIPT: COMBINING SOIL PREDICTIONS ACROSS DEPTHS
 * 
 * **Purpose**:
 * This script aggregates soil predictions from finer depth intervals (0-10 cm, 10-20 cm, and 20-30 cm) to produce 
 * averaged predictions for broader depth ranges (0-20 cm and 0-30 cm). The averaging process ensures consistency 
 * across layers and is essential for generating harmonized soil maps for use in broader-scale analyses.
 * 
 * **Inputs**:
 * - Predictions for finer depth intervals:
 *   - 0-10 cm
 *   - 10-20 cm
 *   - 20-30 cm
 * - Input data must include clay, sand, and silt fractions (% content) for each depth interval.
 *  
 * **Outputs**:
 * - Averaged soil predictions for:
 *   - 0-20 cm (combined from 0-10 cm and 10-20 cm predictions)
 *   - 0-30 cm (combined from 0-10 cm, 10-20 cm, and 20-30 cm predictions)
 * - Harmonized maps of clay, sand, and silt fractions for the broader depth ranges.
 * 
 * **Workflow**:
 * 1. Load input predictions for 0-10 cm, 10-20 cm, and 20-30 cm depths.
 * 2. Compute the weighted average for each granulometric fraction (clay, sand, silt) across depth intervals:
 *    - For 0-20 cm: Combine predictions from 0-10 cm and 10-20 cm with equal weights.
 *    - For 0-30 cm: Combine predictions from 0-10 cm, 10-20 cm, and 20-30 cm with equal weights.
 * 3. Generate maps of aggregated predictions for each granulometric fraction at 0-20 cm and 0-30 cm depths.
 * 4. Export the harmonized maps to the GEE console for visualization and to a designated asset path for storage.
 * 
 * 
 * **Dependencies**:
 * - Predictions for finer depth intervals (0-10, 10-20, 20-30 cm) must be available and stored in the MapBiomas Soil repository.
 * 
 * **Notes**:
 * - This script assumes uniform weights for averaging across depth intervals. For non-uniform weights, adjustments must be made to the averaging formulas.
 * - Ensure input predictions are in the same unit (e.g., % content) and resolution (e.g., 30m).
 * - Outputs are stored in the MapBiomas Soil workspace for further analysis or distribution.
 * 
 * **Contact**:
 * For inquiries or access to additional resources, contact:
 * - MapBiomas Soil Team: contato@mapbiomas.org
 * - Coordination: Dra. Taciara Zborowski Horst (taciaraz@professores.utfpr.edu.br)
 */

// Caminho base
var path = 'projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2/';

// Importa as bandas brutas
var clay_000_010cm = ee.Image(path + 'c02beta_clay_000_010cm_v2').rename('clay_000_010cm');
var clay_010_020cm = ee.Image(path + 'c02beta_clay_010_020cm_v2').rename('clay_010_020cm');
var clay_020_030cm = ee.Image(path + 'c02beta_clay_020_030cm_v2').rename('clay_020_030cm');

var sand_000_010cm = ee.Image(path + 'c02beta_sand_000_010cm_v2').rename('sand_000_010cm');
var sand_010_020cm = ee.Image(path + 'c02beta_sand_010_020cm_v2').rename('sand_010_020cm');
var sand_020_030cm = ee.Image(path + 'c02beta_sand_020_030cm_v2').rename('sand_020_030cm');

var silt_000_010cm = ee.Image(path + 'c02beta_silt_000_010cm_v2').rename('silt_000_010cm');
var silt_010_020cm = ee.Image(path + 'c02beta_silt_010_020cm_v2').rename('silt_010_020cm');
var silt_020_030cm = ee.Image(path + 'c02beta_silt_020_030cm_v2').rename('silt_020_030cm');

// Funções auxiliares
function avg2(a, b) { return a.add(b).divide(2); }
function avg3(a, b, c) { return a.add(b).add(c).divide(3); }

// Aredonda e corrige qualquer desvio de soma no silte
function roundAndFixSilt(clay, sand, silt) {
  var clay_r = clay.round().int();
  var sand_r = sand.round().int();
  var silt_r = silt.round().int();

  var sum = clay_r.add(sand_r).add(silt_r);
  var diff = sum.subtract(100);  // pode ser -2, +3, etc

  var silt_adj = silt_r.subtract(diff);  // corrige qualquer erro
  return {
    clay: clay_r.rename(clay.bandNames()),
    sand: sand_r.rename(sand.bandNames()),
    silt: silt_adj.rename(silt.bandNames())
  };
}

// Aplica correção por camada individual
var corr_010 = roundAndFixSilt(clay_000_010cm, sand_000_010cm, silt_000_010cm);
var corr_020 = roundAndFixSilt(clay_010_020cm, sand_010_020cm, silt_010_020cm);
var corr_030 = roundAndFixSilt(clay_020_030cm, sand_020_030cm, silt_020_030cm);

// Calcula médias compostas (antes da correção)
var clay_000_020 = avg2(clay_000_010cm, clay_010_020cm).rename('clay_000_020cm');
var sand_000_020 = avg2(sand_000_010cm, sand_010_020cm).rename('sand_000_020cm');
var silt_000_020 = avg2(silt_000_010cm, silt_010_020cm).rename('silt_000_020cm');

var clay_000_030 = avg3(clay_000_010cm, clay_010_020cm, clay_020_030cm).rename('clay_000_030cm');
var sand_000_030 = avg3(sand_000_010cm, sand_010_020cm, sand_020_030cm).rename('sand_000_030cm');
var silt_000_030 = avg3(silt_000_010cm, silt_010_020cm, silt_020_030cm).rename('silt_000_030cm');

// Aplica correção também às médias compostas
var corr_020_total = roundAndFixSilt(clay_000_020, sand_000_020, silt_000_020);
var corr_030_total = roundAndFixSilt(clay_000_030, sand_000_030, silt_000_030);

// Empilha mapas corrigidos finais
var clay_maps_corrected = ee.Image.cat([
  corr_010.clay,
  corr_020.clay,
  corr_030.clay,
  corr_020_total.clay.rename('clay_000_020cm'),
  corr_030_total.clay.rename('clay_000_030cm')
]).byte();

var sand_maps_corrected = ee.Image.cat([
  corr_010.sand,
  corr_020.sand,
  corr_030.sand,
  corr_020_total.sand.rename('sand_000_020cm'),
  corr_030_total.sand.rename('sand_000_030cm')
]).byte();

var silt_maps_corrected = ee.Image.cat([
  corr_010.silt,
  corr_020.silt,
  corr_030.silt,
  corr_020_total.silt.rename('silt_000_020cm'),
  corr_030_total.silt.rename('silt_000_030cm')
]).byte();

// Soma final para checagem (corrigido 0–30 cm)
var sum_final = corr_030_total.clay
  .add(corr_030_total.sand)
  .add(corr_030_total.silt)
  .rename('sum_final');

// Visualização
var palettes = require('users/wallacesilva/mapbiomas-solos:COLECAO_01/tools/module_palettes.js');

//Map.addLayer(sum_final, {min: 90, max: 110, palette: ['blue', 'white', 'green']}, 'Soma Final Corrigida (0–30 cm)');

// Validação visual dos erros remanescentes
//var error_map = sum_final.neq(100);
//Map.addLayer(error_map.updateMask(error_map), {palette: ['red']}, 'Pixels com soma ≠ 100 (deve ser vazio)');
///////


// Define a região de exportação
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var aoi = biomes;
var aoiBounds = aoi.geometry().bounds();
var lulc = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1')
  .select('classification_2023');
  
//////////
// Mascaras
// --- LULC 2023
var lulc = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1')
  .select('classification_2023');

// --- Máscara de superfície de água (MapBiomas Solo - 2023)
var waterMask = ee.Image("projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/MB_WATER_WATER_SURFACE_MASK_2023")
  .select('classification_2023');

// --- Máscara de solos arenosos (classe 23 = areal)
var sandy_areas = lulc.eq(23);
var afloramento = lulc.eq(29);

// --- Visualização auxiliar (opcional)
Map.addLayer(waterMask.updateMask(waterMask), {palette: ['#0000ff']}, 'Água (2023)', false);
Map.addLayer(sandy_areas.updateMask(sandy_areas), {palette: ['#ffff00']}, 'Solos arenosos (classe 23)', false);
Map.addLayer(afloramento.updateMask(afloramento), {palette: ['#ffff00']}, 'Afloramento (classe 29)', false);

// --- Aplicação das máscaras aos mapas de textura
var clay_masked = clay_maps_corrected
     .where(sandy_areas, 0)
     .updateMask(waterMask.unmask(0).neq(1))
     .updateMask(afloramento.unmask(0).neq(1));

var sand_masked = sand_maps_corrected
     .where(sandy_areas, 100)
     .updateMask(waterMask.unmask(0).neq(1))
     .updateMask(afloramento.unmask(0).neq(1));

var silt_masked = silt_maps_corrected
     .where(sandy_areas, 0)
     .updateMask(waterMask.unmask(0).neq(1))
     .updateMask(afloramento.unmask(0).neq(1));


var vis = {min: 0, max: 100, palette: ['fff5eb', 'fd8d3c', '7f2704']};
Map.addLayer(clay_masked.select('clay_000_030cm'), vis, 'Argila (%) - corrigida');
Map.addLayer(silt_masked.select('silt_000_030cm'), vis, 'Silte (%) - corrigida');
Map.addLayer(sand_masked.select('sand_000_030cm'), vis, 'Areia (%) - corrigida');


////////
// // Caminho base e prefixos
// CONFIGURAÇÕES DE EXPORTAÇÃO
var assetId = 'projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/c02v2';
var default_name = 'mapbiomas_soil_collection2_v2_';
var initiave_and_you = 'GT_SOLOS_TZH';
var version = 'v2';

// LISTA FINAL DAS IMAGENS A EXPORTAR
var final_images = [
  ['sand', sand_masked],
  ['silt', silt_masked],
  ['clay', clay_masked]
];

// FUNÇÃO DE EXPORTAÇÃO POR SUPERCARTA
function exportPerSupercarta(image, output, description, filter_bounds) {
  var cartas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/cartas')
    .filterBounds(filter_bounds)
    .map(function (feature) {
      return feature.set({
        supercarta: feature.getString('grid_name').slice(0, -4)
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
        description: initiave_and_you + '-' + newDescription,
        assetId: output + '/' + newDescription,
        pyramidingPolicy: {'.default': 'mode'},
        region: supercartaFeature.geometry(),
        scale: 30,
        maxPixels: 1e13,
      });
    });
  });
}

// EXPORTA TODAS AS IMAGENS
final_images.forEach(function (list) {
  var description = default_name + list[0];
  var image = list[1];
  
  exportPerSupercarta(
    image.float().set({
      'initiative': 'MAPBIOMAS SOLO',
      'source': 'LABORATÓRIO DE PEDOMETRIA',
      'type': list[0],
    }),
    assetId,
    description,
    aoiBounds
  );
});



////// Exportar Brasil todo
// // Exporta areia corrigida
// Export.image.toAsset({
//   image: sand_masked,
//   description: prefix + '-' + default_name + 'sand_percent',
//   assetId: assetIdBase + default_name + 'sand_percent',
//   region: aoiBounds,
//   scale: 30,
//   maxPixels: 1e13,
//   pyramidingPolicy: {'.default': 'mode'}
// });

// // Exporta silte corrigido
// Export.image.toAsset({
//   image: silt_masked,
//   description: prefix + '-' + default_name + 'silt_percent',
//   assetId: assetIdBase + default_name + 'silt_percent',
//   region: aoiBounds,
//   scale: 30,
//   maxPixels: 1e13,
//   pyramidingPolicy: {'.default': 'mode'}
// });

// // Exporta argila corrigida
// Export.image.toAsset({
//   image: clay_masked,
//   description: prefix + '-' + default_name + 'clay_percent',
//   assetId: assetIdBase + default_name + 'clay_percent',
//   region: aoiBounds,
//   scale: 30,
//   maxPixels: 1e13,
//   pyramidingPolicy: {'.default': 'mode'}
// });
