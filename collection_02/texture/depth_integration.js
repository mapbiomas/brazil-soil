var bounds_triangulo_1 = /* color: #d63000 */ee.Geometry.MultiPoint(),
    bounds_triangulo_3 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-29.920331905420554, -21.676359828631696],
          [-29.920331905420554, -33.6315821151207],
          [-14.627363155420555, -33.6315821151207],
          [-14.627363155420555, -21.676359828631696]]], null, false),
    bounds_triangulo_2 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-30.271894405420554, -6.029717831697614],
          [-30.271894405420554, -19.205915943391354],
          [-14.978925655420555, -19.205915943391354],
          [-14.978925655420555, -6.029717831697614]]], null, false),
  triangulo_asset_position = /* color: #d63000 */ee.Geometry.MultiPoint();
// plot simples dos dados https://code.earthengine.google.com/8ea3efa2d9cebc22531daf5f7273ab2a?noload=1 
/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: November 19, 2024
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

var granulometry = ee.ImageCollection("projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_granulometry-v0");
print('granulometry',granulometry,granulometry.toBands(),granulometry.mosaic(),granulometry.aggregate_array('type').distinct(),granulometry.aggregate_array('pepth').distinct());
var granulometry_toBands = granulometry.toBands();


var types = ["clay","sand","silt"]
var depths = ["000_010cm","010_020cm","020_030cm"]

var defalt_name = './*TYPE_percent_DEPTH./*'


// Definindo as imagens para os componentes e profundidades

var clay_000_010cm = granulometry_toBands.select('.*clay_percent_000_010cm.*').reduce('median').rename('clay_000_010cm');
print('clay_000_010cm',clay_000_010cm);
var sand_000_010cm = granulometry_toBands.select('.*sand_percent_000_010cm.*').reduce('median').rename('sand_000_010cm');
print('sand_000_010cm',sand_000_010cm);
var silt_000_010cm = granulometry_toBands.select('.*silt_percent_000_010cm.*').reduce('median').rename('silt_000_010cm');
print('silt_000_010cm',silt_000_010cm);
var clay_010_020cm = granulometry_toBands.select('.*clay_percent_010_020cm.*').reduce('median').rename('clay_010_020cm');
print('clay_010_020cm',clay_010_020cm);
var sand_010_020cm = granulometry_toBands.select('.*sand_percent_010_020cm.*').reduce('median').rename('sand_010_020cm');
print('sand_010_020cm',sand_010_020cm);
var silt_010_020cm = granulometry_toBands.select('.*silt_percent_010_020cm.*').reduce('median').rename('silt_010_020cm');
print('silt_010_020cm',silt_010_020cm);
var clay_020_030cm = granulometry_toBands.select('.*clay_percent_020_030cm.*').reduce('median').rename('clay_020_030cm');
print('clay_020_030cm',clay_020_030cm);
var sand_020_030cm = granulometry_toBands.select('.*sand_percent_020_030cm.*').reduce('median').rename('sand_020_030cm');
print('sand_020_030cm',sand_020_030cm);
var silt_020_030cm = granulometry_toBands.select('.*silt_percent_020_030cm.*').reduce('median').rename('silt_020_030cm');
print('silt_020_030cm',silt_020_030cm);



// Função para calcular a média simples
function simpleAverage(band1, band2) {
  return band1.add(band2).divide(2);
}

// Função para calcular a média simples de três bandas
function simpleAverage2(band1, band2, band3) {
  return band1.add(band2).add(band3).divide(3);
}

// Calculando a média simples para cada componente (0-20 cm)
var clay_000_020cm = simpleAverage(clay_000_010cm, clay_010_020cm).round().rename('clay_000_020cm');
var sand_000_020cm = simpleAverage(sand_000_010cm, sand_010_020cm).round().rename('sand_000_020cm');
var silt_000_020cm = simpleAverage(silt_000_010cm, silt_010_020cm).round().rename('silt_000_020cm');

// Calculando a média simples para cada componente (0-30 cm)
var clay_000_030cm = simpleAverage2(clay_000_010cm, clay_010_020cm, clay_020_030cm).round().rename('clay_000_030cm');
var sand_000_030cm = simpleAverage2(sand_000_010cm, sand_010_020cm, sand_020_030cm).round().rename('sand_000_030cm');
var silt_000_030cm = simpleAverage2(silt_000_010cm, silt_010_020cm, silt_020_030cm).round().rename('silt_000_030cm');

// Criando imagens compostas para argila, areia e silte com 5 bandas
var clay_maps = ee.Image.cat([clay_000_010cm.round().rename('clay_000_010cm'), 
                               clay_010_020cm.round().rename('clay_010_020cm'), 
                               clay_020_030cm.round().rename('clay_020_030cm'),
                               clay_000_020cm,
                               clay_000_030cm]).byte();

var sand_maps = ee.Image.cat([sand_000_010cm.round().rename('sand_000_010cm'), 
                              sand_010_020cm.round().rename('sand_010_020cm'), 
                              sand_020_030cm.round().rename('sand_020_030cm'),
                              sand_000_020cm,
                              sand_000_030cm]).byte();

var silt_maps = ee.Image.cat([silt_000_010cm.round().rename('silt_000_010cm'), 
                              silt_010_020cm.round().rename('silt_010_020cm'), 
                              silt_020_030cm.round().rename('silt_020_030cm'),
                              silt_000_020cm,
                              silt_000_030cm]).byte();

// Chamando paleta de cores
var palettes = require('users/wallacesilva/mapbiomas-solos:COLECAO_01/tools/module_palettes.js');

// Visualização
function addLayerByDepth(image, prefix, component, palette) {
  // Array com os nomes das profundidades
  var depths = ['000_010cm', '010_020cm', '020_030cm', '000_020cm', '000_030cm'];
  
  // Loop para adicionar cada camada
  depths.forEach(function(depth) {
    var bandName = prefix + depth;
    Map.addLayer(image.select(bandName), {min: 0, max: 100, palette: palette}, component + ' ' + depth);
  });
}

// correção
var sum = silt_maps.add(sand_maps).add(clay_maps).divide(3);
var gt100 = sum.gt(100);
var silt_subtract = sum.subtract(100).updateMask(gt100);
silt_maps = silt_maps.subtract(silt_subtract.unmask());

addLayerByDepth(clay_maps, 'clay_', 'Clay', palettes.get('granulometry_clay'));
addLayerByDepth(sand_maps, 'sand_', 'Sand', palettes.get('granulometry_sand'));
addLayerByDepth(silt_maps, 'silt_', 'Silt', palettes.get('granulometry_silt'));


var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var aoi = biomes;
var aoiImg = ee.Image().paint(aoi).eq(0);
var aoiBounds = aoi.geometry().bounds();

var assetId = 'projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/';
var default_name = 'mapbiomas_soil_collection2_';
var initiave_and_you = 'GT_SOLOS_WS';

var description = default_name + 'sand_percent';
//Exportando as imagens finais como assets
Export.image.toAsset({
  image: sand_maps,
  description: initiave_and_you +'-' + description,
  assetId: assetId + description,
  region: aoiBounds,
  scale: 30,
  maxPixels: 1e13,
  pyramidingPolicy:'median'
});

description = default_name + 'silt_percent';
Export.image.toAsset({
  image: silt_maps,
  description: initiave_and_you +'-' + description,
  assetId: assetId + description,
  region: aoiBounds,
  scale: 30,
  maxPixels: 1e13,
  pyramidingPolicy:'median'
});

description = default_name + 'clay_percent';
Export.image.toAsset({
  image: clay_maps,
  description: initiave_and_you +'-' + description,
  assetId: assetId + description,
  region: aoiBounds,
  scale: 30,
  maxPixels: 1e13,
  pyramidingPolicy:'median'
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Define version and output paths
// Import sand, clay, and silt images
var sand = sand_maps;
var clay = clay_maps;
var silt = silt_maps;

// Function to combine sand, silt, and clay bands for a given soil depth
function createSoilFractions(depth) {
  return ee.Image.cat([
    sand.select('sand_' + depth), 
    silt.select('silt_' + depth),
    clay.select('clay_' + depth)
  ]).rename(['sand', 'silt', 'clay']); 
}

// Create soil fraction images for different depths
var depths = ['000_010cm', '000_020cm', '000_030cm'];
var soilFractions = depths.map(createSoilFractions);

// Function to classify soil texture for a given level
function classifySoil(image, level) {
  var expressions = {
    1:     // 1 - Very clayey
      '(clay >= 60) ? 1 : ' + //1. Muito Argilosa
       '((clay >= 35) && (clay < 60)) ? 2 : ' + //2. Argilosa
       '((silt >= 50) && (sand < 15) && (clay < 35)) ? 3 : ' + //3. Siltosa
       '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 4 : ' + 
       '((clay < 30) && (sand >= (85 + (clay - 1))) && (silt < 18)) ? 4: ' + //4. Arenosa
       '((clay < 40) && (sand >= 15) && (sand < (85 + (clay - 1))) && (silt <= 85)) ? 5 : ' + //5. Média
       '0',
       
    2:  // 1 - Muito argilosa
    // 1 - Muito argilosa
       '(clay >= 60) ? 1 : ' + //1. Muito Argilosa
    //2. Argilosa       
       '((clay >= 35) && (clay < 60)) ? 2 : ' + //2. Argilosa
     //3. Média argilosa       
       '(((clay >= 20 && clay < 28) && (silt >= 20 && silt < 30) && (sand >= 45 && sand < 50)) || ' +
       '((clay >= 28 && clay < 35) && (silt >= 15 && silt < 30) && (sand >= 45 && sand < 50)) || ' +
       '((clay >= 20 && clay < 35) && (silt <= 30) && (sand >= 50))) ? 3 : ' + //3. Média argilosa
  //4. Siltosa     
       '((silt >= 50) && (sand < 15) && (clay < 35)) ? 4 : ' + //4. Siltosa
  //5. Média siltosa      
       '((sand >= 15 && sand <= 50) && (clay < 35) && (silt >= 30 && silt < 85)) ||' +
       '((clay > 24 && clay < 35) && (sand > 35 && sand < 46) && (silt > 18 && silt < 30))? 5 : ' + //5. Média siltosa
   //6. Média arenosa    
       '((sand >= 50 && sand < 70) && (clay <= 20) && (silt <= 50)) || '+
       '((sand <= (70 + (clay))) && (clay <= 30) && (silt < 30)) ? 6 : ' + //6. Média arenosa
   //7. Arenosa (ou arenosa média)    
       '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 7 : ' + //7. Arenosa (ou arenosa média)
    //8. Muito arenosa
       '((clay < 15) && (sand >= (85 + (clay - 1))) && (silt < 20)) ? 8 : ' + //8. Muito arenosa
       '0',
       
       
    3:        //1. Muito Argilosaclay_0_30cm
        '(sand >= 0 && sand <= 40 && silt >= 0 && silt <= 40 && clay >= 60 && clay <= 100) ? 1 : ' + //1. Muito Argilosa
        '(sand >=  0 && sand <= 20 && silt >= 20 && silt <= 40 && clay >= 40 && clay < 60) ? 2 : ' +
       //2. Argilosa
        '(sand >= 20 && sand <= 45 && silt >= 0 && silt <= 40 && clay >= 40 && clay < 60) ? 2 : ' +  //2. Argilosa 
       //3. Argilo siltosa 
        '(sand >=  0 && sand < 20 && silt >= 40 && silt <= 60 && clay >= 40 && clay <= 60) ? 3 : ' +  //3. Argilo siltosa
      //4. Franco argilosa
        '((sand >= 20 && sand <= 45) && (silt >= 15 && silt <= 53) && (clay >= 27 && clay < 40)) ? 4 : ' + //4. Franco argilosa
       //5. Franco argilo siltosa   
        '(sand >= 0 && sand <= 20 && silt >= 40 && silt < 73 && clay >= 27 && clay <= 40) ? 5 : ' +  //5. Franco argilo siltosa   
        
      //6. Argilo arenosa
        '(sand >= 45 && sand < 65 && silt >= 0 && silt < 20 && clay >= 35 && clay <= 55) ? 6 : ' +    //6. Argilo arenosa
       //7. Franco argilo arenosa 
        '(sand >= 40 && sand <= 50 && silt >= 10 && silt < 28 && clay >= 20 && clay <= 35) ? 7 : ' +   
        '(sand >= 50 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 35) ? 7 : ' +
        '(sand >= 40 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 25) ? 7 : ' +
        '(sand >= 40 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 35) ? 7 : ' +   
        '(sand >= 45 && sand <= 55 && silt >= 10 && silt < 28 && clay >= 25 && clay < 35) ? 7 : ' +     
        '(sand >= 44 && sand <= 57 && silt >= 25 && silt < 28 && clay >= 20 && clay < 30) ? 7 : ' +      
        '(sand >= 44 && sand <= 50 && silt >= 15 && silt < 28 && clay >= 28 && clay < 26) ? 7 : ' +  //7. Franco argilo arenosa    
        //8. Franca 
        '(sand >= 22 && sand <= 52 && silt >= 28 && silt <= 50 && clay >= 5 && clay < 27) ? 8 : ' +   //8. Franca    
        '((sand >= 50 && sand < 70) && (clay < 20) && (silt < 50)) || ' + 
        '((sand <= (70 + (clay))) && (clay < 30) && (silt < 30)) ? 9 : ' + 
        //9. Franco arenoso
        '(sand >= 45 && sand <= 58 && silt >= 42 && silt < 50 && clay >=  0 && clay <  5) ? 9 : ' + //9. Franco arenoso
        //10. Areia
        '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 10 : ' + //10. Areia 
        //11. Areia franca
        '((clay < 15) && (sand >= (85 + (clay - 3))) && (silt < 20)) ? 11: ' + //11. Areia franca
        //12. Silte
        '(sand >= 0 && sand < 20 && silt >= 80 && silt <= 100 && clay >= 0 && clay < 10) ? 12 : ' + 
        '(sand >= 0 && sand < 10 && silt >= 80 && silt <= 100 && clay >= 0 && clay < 10) ? 12 : ' + //12. Silte
        
        //13. Franco Siltosa
        '(sand >= 0 && sand < 50 && silt >= 50 && silt <= 100 && clay >= 0 && clay < 27) ? 13 : ' + 
        '(sand >= 0 && sand < 20 && silt >= 53 && silt <= 80 && clay >=  0 && clay < 27) ? 13 : ' + 
        '(sand >= 0 && sand < 10 && silt >= 60 && silt <= 90 && clay >= 10 && clay < 27) ? 13 : ' + //13. Franco Siltosa   
        '0',
  };
  
  return image.expression(expressions[level], {
    clay: image.select('clay'),
    sand: image.select('sand'),
    silt: image.select('silt')
  }).rename('classified')
  .updateMask(image.select(0));
}

// Apply soil texture classification for all depths and levels
var classifiedImages = depths.map(function(depth, idx) {
  var fraction = soilFractions[idx];
  return {
    lv1: classifySoil(fraction, 1),
    lv2: classifySoil(fraction, 2),
    lv3: classifySoil(fraction, 3)
  };
});

// Load biome boundaries and water mask
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var water_mask = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/GT_MASK_SUBMERGED_AND_ANTHROPIZED_BODIES')
                  .select('classification_2023');

// Create a mask for non-water areas and clip to biome boundaries
var soilOnlyMask = water_mask.mask().neq(1); // Mask non-water areas
var biomeMasked = soilOnlyMask.clip(biomes); // Clip to biome boundaries

// Apply soil texture classification for all depths and levels
var classifiedImages = depths.map(function(depth, idx) {
  var fraction = soilFractions[idx];
  return {
    lv1: classifySoil(fraction, 1).updateMask(biomeMasked), // Apply mask
    lv2: classifySoil(fraction, 2).updateMask(biomeMasked), // Apply mask
    lv3: classifySoil(fraction, 3).updateMask(biomeMasked)  // Apply mask
  };
});

// Palettes for visualization
var palettes = {
  lv1: ['#000000','#a83800', '#aa8686', '#35978f', '#fffe73', '#d7c5a5'], // Level 1 palette
  lv2: ['#000000','#a83800', '#aa8686', '#f4a582', '#35978f', '#d7c5a5', '#F8D488', '#E4B074', '#fffe73'], // Level 2 palette
  lv3: ['#000000',"#a83800", "#aa8686", "#3481a7", "#e9a9a9", "#80b1d3", "#c994c7", "#f4a582","#d7c5a5", "#F8D488", "#E4B074", "#fffe73", "#35978f", "#ABBA7C"] // Level 3 palette
};
  

var legends = {
  lv1:{
      0:'0 - não observado',
    1:'1 - Very clayey',
    2:'2 - Clay',
    3:'3 - Silty',
    4:'4 - Sandy',
    5:'5 - Medium'
  },
  lv2:{
    0: '0 - não observado',
    1: '1 - Muito argilosa',
    2: '2 - Argilosa',
    3: '3 - Média-argilosa',
    4: '4 - Siltosa',
    5: '5 - Média-siltosa',
    6: '6 - Média-arenosa',
    7: '7 - Arenosa-média',
    8: '8 - Muito-arenosa',
  },
  lv3:{
    0: '0 - não observado',
    1: '1 - Heavy Clay',
    2: '2 - Clay',
    3: '3 - Silty Clay',
    4: '4 - Clay Loam',
    5: '5 - Silty Clay Loam ',
    6: '6 - Sandy Clay ',
    7: '7 - Sandy Clay Loam',
    8: '8 - Loam',
    9: '9 - Sandy Loam',
    10: '10 - Loamy Sand',
    11: '11 - Sand',
    12: '12 - Silt Loam',
    13: '13 - Silt ',
  }
};


var visParams = {
  lv1:{min:0,max:5,palette:palettes.lv1},
  lv2:{min:0,max:8,palette:palettes.lv2},
  lv3:{min:0,max:13,palette:palettes.lv3},
  rgb:{min:0,max:100,bands:['sand','silt','clay']},
};


// Add layers to map for each level and depth
classifiedImages.forEach(function(images, idx) {
  var depth = depths[idx];
  Map.addLayer(images.lv1, visParams.lv1, 'Level 1 - ' + depth);
  Map.addLayer(images.lv2, visParams.lv2, 'Level 2 - ' + depth);
  Map.addLayer(images.lv3, visParams.lv3, 'Level 3 - ' + depth);
  
  
  // description = default_name + 'l1_grupamentos_texturais';
  description = default_name + 'lv1_textural_groups';
  Export.image.toAsset({
    image: images.lv1,
    description: initiave_and_you +'-' + description,
    assetId: assetId + description,
    region: aoiBounds,
    scale: 30,
    maxPixels: 100,
 //   pyramidingPolicy:'mode'
    pyramidingPolicy:'sample'
  });

  // description = default_name + 'l2_subgrupamentos_texturais';
  description = default_name + 'lv2_textural_subgroups';
  Export.image.toAsset({
    image: images.lv2,
    description: initiave_and_you +'-' + description,
    assetId: assetId + description,
    region: aoiBounds,
    scale: 30,
    maxPixels: 1e13,
  //  pyramidingPolicy:'mode'
    pyramidingPolicy:'sample'
  });

  // description = default_name + 'l3_classes_texturais';
  description = default_name + 'lv3_textural_classes';
  Export.image.toAsset({
    image: images.lv3,
    description: initiave_and_you +'-' + description,
    assetId: assetId + description,
    region: aoiBounds,
    scale: 30,
    maxPixels: 1e13,
  //  pyramidingPolicy:'mode'
    pyramidingPolicy:'sample'
  });

  
});

//////////////////////////////////////////// triangule asset

function createTextureTriangleMap(optionalBounds, optionalHighlight, optionalImage) {
  // Define default bounds if none are provided (centered around the equator)
  var defaultBounds = ee.Geometry.Polygon([[[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]]], null, false);
  
  // Use the provided bounds or default bounds
  var triangleBounds = optionalBounds !== undefined ? optionalBounds : defaultBounds;
  
  // Calculate the bounding box of the triangleBounds
  var bounds = triangleBounds.bounds();

  // Extract the coordinates of the bounding box
  var coordinates = ee.List(bounds.coordinates().get(0));
  
  // Extract X and Y coordinates
  var xs = coordinates.map(function(coord) {
    return ee.Number(ee.List(coord).get(0));
  });
  
  var ys = coordinates.map(function(coord) {
    return ee.Number(ee.List(coord).get(1));
  });
  
  // Calculate min and max of X and Y
  var minX = ee.Number(xs.reduce(ee.Reducer.min()));
  var maxX = ee.Number(xs.reduce(ee.Reducer.max()));
  var minY = ee.Number(ys.reduce(ee.Reducer.min()));
  var maxY = ee.Number(ys.reduce(ee.Reducer.max()));
  // Define the bottom vertices (left and right)
  var vertex1 = ee.List([minX, minY]); // Bottom left vertex
  var vertex2 = ee.List([maxX, minY]); // Bottom right vertex

  // Define the top vertex as the midpoint of the top edge
  var midX = minX.add(maxX).divide(2);
  var vertex3 = ee.List([midX, maxY]); // Top vertex (midpoint of top edge)

  // Create an image with longitude and latitude bands
  var lonLatImage = ee.Image.pixelLonLat().rename(['lon', 'lat']);
  
  // Calculate barycentric coordinates
  var denom = ee.Image.constant(
    (vertex2.getNumber(1).subtract(vertex3.getNumber(1))).multiply(vertex1.getNumber(0).subtract(vertex3.getNumber(0)))
    .add(
      vertex3.getNumber(0).subtract(vertex2.getNumber(0)).multiply(vertex1.getNumber(1).subtract(vertex3.getNumber(1)))
    )
  );
  
  var alphaNumerator = ee.Image.constant(vertex2.getNumber(1).subtract(vertex3.getNumber(1)))
    .multiply(lonLatImage.select('lon').subtract(vertex3.getNumber(0)))
    .add(
      ee.Image.constant(vertex3.getNumber(0).subtract(vertex2.getNumber(0)))
      .multiply(lonLatImage.select('lat').subtract(vertex3.getNumber(1)))
    );
  
  var betaNumerator = ee.Image.constant(vertex3.getNumber(1).subtract(vertex1.getNumber(1)))
    .multiply(lonLatImage.select('lon').subtract(vertex3.getNumber(0)))
    .add(
      ee.Image.constant(vertex1.getNumber(0).subtract(vertex3.getNumber(0)))
      .multiply(lonLatImage.select('lat').subtract(vertex3.getNumber(1)))
    );
  
  // Barycentric coordinates alpha, beta, gamma
  var alpha = alphaNumerator.divide(denom);
  var beta = betaNumerator.divide(denom);
  var gamma = ee.Image.constant(1).subtract(alpha).subtract(beta);
  
  // Multiply the barycentric coordinates by 100 to get percentages
  var percentage1 = alpha.multiply(100).rename('sand');
  var percentage2 = beta.multiply(100).rename('silt');
  var percentage3 = gamma.multiply(100).rename('clay');
  
  // Create a mask to ensure percentages are between 0 and 100
  var triangleMask = percentage1.gte(0).and(percentage1.lte(100))
    .and(percentage2.gte(0)).and(percentage2.lte(100))
    .and(percentage3.gte(0)).and(percentage3.lte(100));
  
  // Combine the three percentages into an RGB image
  var triangleImage = percentage1.addBands([percentage2, percentage3])
    .updateMask(triangleMask)
    .clip(triangleBounds);
  
  // Initialize the return list with the triangle image
  var resultList = [triangleImage];
  
  // If an optional highlight point is provided, calculate its position in the triangle
  if (optionalHighlight) {
    // Extract the percentages at the highlight point from the input image
    var sample = optionalImage.sample({
      region: optionalHighlight,
      scale: 30,
      numPixels: 1,
      geometries: true
    });
    
    // Get the first sample (if any)
    var sampledData = sample.first();

    // Check if sample data is available
    if (sampledData !== null) {
      var percentages = ee.List([
        sampledData.get('sand'),
        sampledData.get('silt'),
        sampledData.get('clay')
      ]);
      
      print('percentages',percentages);
      // Normalize percentages to fractions that sum to 1
      var total = percentages.reduce(ee.Reducer.sum());

      var fractions = percentages.map(function(pct) {
        return ee.Number(pct).divide(total);
      });
      
      // Calculate the x and y coordinates within the triangle
      var x = ee.Number(fractions.get(0)).multiply(vertex1.getNumber(0))
        .add(ee.Number(fractions.get(1)).multiply(vertex2.getNumber(0)))
        .add(ee.Number(fractions.get(2)).multiply(vertex3.getNumber(0)));
      
      var y = ee.Number(fractions.get(0)).multiply(vertex1.getNumber(1))
        .add(ee.Number(fractions.get(1)).multiply(vertex2.getNumber(1)))
        .add(ee.Number(fractions.get(2)).multiply(vertex3.getNumber(1)));
      
      var pointInTriangle = ee.Geometry.Point([x, y]);
      
      // Add the point to the result list
      resultList.push(pointInTriangle);
    }
  }
  
  // Return the list containing the triangle image and optionally the highlight point
  return resultList;
}


var triangule = createTextureTriangleMap(triangulo_asset_position)[0];
var triangule_asset = triangule
  .addBands(classifySoil(triangule,1).rename('l1_textural_groups'))
  .addBands(classifySoil(triangule,2).rename('l2_textural_subgroups'))
  .addBands(classifySoil(triangule,3).rename('l2_textural_classes'));

Map.addLayer(triangule_asset,{},'triangule_asset');

description = default_name + 'textural_triangule';
Export.image.toAsset({
  image: triangule_asset,
  description: initiave_and_you +'-' + description,
  assetId: assetId + description,
  region: aoiBounds,
  scale: 30,
  maxPixels: 1e13,
  pyramidingPolicy:'mode'
});


//////////////////// AUXILIAR USER INTERFACE


var soilFractions_0_30cm = sand.select('sand_000_030cm')
  .addBands(silt.select('silt_000_030cm'))
  .addBands(clay.select('clay_000_030cm'))
  .rename(['sand', 'silt', 'clay']);


var triangulo_1 = createTextureTriangleMap(bounds_triangulo_1);
var triangulo_1_classificado = classifySoil(triangulo_1[0],1);
Map.addLayer(triangulo_1_classificado,visParams.lv1,'triangulo_1_classificado')
var triangulo_2 = createTextureTriangleMap(bounds_triangulo_2);
var triangulo_2_classificado = classifySoil(triangulo_2[0],2);
Map.addLayer(triangulo_2_classificado,visParams.lv2,'triangulo_2_classificado')
var triangulo_3 = createTextureTriangleMap(bounds_triangulo_3);
var triangulo_3_classificado = classifySoil(triangulo_3[0],3);
Map.addLayer(triangulo_3_classificado,visParams.lv3,'triangulo_3_classificado')


// Function to create and add a legend to the map
function addLegend(dict,visParams) {
  var legend = ui.Panel({
    widgets: [
      ui.Label({
        value: 'Textural Classification Legend',
        style: {fontWeight: 'bold', fontSize: '14px', margin: '2px'}
      })
    ],
    style: {position: 'bottom-left', padding: '0px',margin:'0px'}
  });

  // List of class names for the legend

  var palette_legenda = visParams.palette;
  var keys = Object.keys(dict);
  
  keys.forEach(function(i){
    
  // Loop through each class name to create rows in the legend
    var colorBox = ui.Label({
      style: {
        backgroundColor: palette_legenda[i],
        padding: '4px',
        margin: '2px',
        width: '10px',
        height: '5px',
        fontSize:'12px'
      }
    });
    var label = ui.Label(dict[i],{fontSize:'12px',margin:'1px'});
    var row = ui.Panel({
      widgets: [colorBox, label],
      layout: ui.Panel.Layout.Flow('horizontal'),
      style:{margin:'0px'}
    });
    legend.add(row);
  });
  
  // Add the complete legend panel to the map
  Map.add(legend);
}

// Add the legend to the map
addLegend(legends.lv1,visParams.lv1);
addLegend(legends.lv2,visParams.lv2);
addLegend(legends.lv3,visParams.lv3);

///////////////////////////////////////////// função de click map

var palette_l1 = [
  '#000000', // 0 - não observado
  '#a83800', // 1 - Very clayey
  '#aa8686', // 2 - Clay
  '#35978f', // 3 - Silty 
  '#fffe73', // 4 - Sandy
  '#d7c5a5'  // 5 - Medium
];

var palette_l2 = [
  '#000000', // 0 - não observado
  '#a83800', // 1 = Muito argilosa
  '#aa8686', // 2 = Argilosa
  '#f4a582', // 3 = Média-argilosa 
  '#35978f', // 4 = Siltosa  
  '#d7c5a5', // 5 = Média-siltosa
  '#F8D488', // 6 = Média-arenosa
  '#E4B074', // 7 = Arenosa-média
  '#fffe73'  // 8 = Muito-arenosa
];

var palette_l3 = [
  "#000000", // 0 - não observado
  "#a83800", // 1 - Muito Argilosa
  "#aa8686", // 2 - Argilosa
  "#3481a7", // 3 - Argilo Siltosa 
  "#e9a9a9", // 4 - Franco Argilosa
  "#80b1d3", // 5 - Silty Clay Loam 
  "#c994c7", // 6 - Argilo Arenosa  
  "#f4a582", // 7 - Franco Argilo Arenosa
  "#d7c5a5", // 8 - Loam   
  "#F8D488", // 9 - Sandy Loam
  "#E4B074", // 10 - Franco arenoso
  "#fffe73", // 11 - Sand
  "#35978f", // 12 - Silte
  "#ABBA7C" // 13 - Franco siltoso 
];
var legenda_l1 = {
  0:'0 - não observado',
  1:'1 - Very clayey',
  2:'2 - Clay',
  3:'3 - Silty',
  4:'4 - Sandy',
  5:'5 - Medium',
};

var legenda_l2 = {
  0: '0 - não observado',
  1: '1 - Muito argilosa',
  2: '2 - Argilosa',
  3: '3 - Média-argilosa',
  4: '4 - Siltosa',
  5: '5 - Média-siltosa',
  6: '6 - Média-arenosa',
  7: '7 - Arenosa-média',
  8: '8 - Muito-arenosa',
};

var legenda_l3 = {
  0: '0 - não observado',
  1: '1 - Heavy Clay',
  2: '2 - Clay',
  3: '3 - Silty Clay',
  4: '4 - Clay Loam',
  5: '5 - Silty Clay Loam ',
  6: '6 - Sandy Clay ',
  7: '7 - Sandy Clay Loam',
  8: '8 - Loam',
  9: '9 - Sandy Loam',
  10: '10 - Loamy Sand',
  11: '11 - Sand',
  12: '13 - Silt Loam',
  13: '12 - Silt'
};


var visParams = {
  l1:{min:0,max:5,palette:palette_l1},
  l2:{min:0,max:8,palette:palette_l2},
  l3:{min:0,max:13,palette:palette_l3},
  sand:{min:0,max:100,bands:['sand']},
  silt:{min:0,max:100,bands:['silt']},
  clay:{min:0,max:100,bands:['clay']},
  rgb:{min:0,max:100,bands:['sand','silt','clay']},
}


// Variables to hold the previous point layers
var originalMapPointLayer;
var trianglePointLayer;

// Add the onClick function
Map.onClick(function(coords) {
  // Create a point geometry at the clicked location
  var newPoint = ee.Geometry.Point([coords.lon, coords.lat]);
  
  // Remove the previous point layers if they exist
  if (originalMapPointLayer) {
    Map.layers().remove(originalMapPointLayer);
  }
  if (trianglePointLayer) {
    Map.layers().remove(trianglePointLayer);
  }
  
  // Add the point to the original map
  originalMapPointLayer = ui.Map.Layer(newPoint, {color: 'red'}, 'Clicked Point');
  Map.layers().add(originalMapPointLayer);
  
  // Use the createTextureTriangleMap function to get the corresponding point in the triangle
  var temp_result1 = createTextureTriangleMap(bounds_triangulo_1, newPoint,soilFractions_0_30cm)[1];
  var temp_result2 = createTextureTriangleMap(bounds_triangulo_2, newPoint,soilFractions_0_30cm)[1];
  var temp_result3 = createTextureTriangleMap(bounds_triangulo_3, newPoint,soilFractions_0_30cm)[1];
  // temp_result[1] is the point in the triangle
  var pointInTriangle = ee.FeatureCollection([
    temp_result1,
    temp_result2,
    temp_result3
    ]);

  // If the point in the triangle exists, add it to the map
  if (pointInTriangle) {
    // Remove the previous triangle point layer if it exists
    if (trianglePointLayer) {
      Map.layers().remove(trianglePointLayer);
    }
    
    // Add the point to the triangle image
    trianglePointLayer = ui.Map.Layer(pointInTriangle, {color: 'red'}, 'Point in Triangle');
    Map.layers().add(trianglePointLayer);
  } else {
    print('No data at this location.');
  }
});

// Importando a coleção de biomas do IBGE
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var biomes_line = ee.Image().paint(biomes,1,1);


// Iterar pelas camadas do mapa e exibir informações organizadas
Map.layers().forEach(function(layer) {
  // Ignorar a camada de fundo branco
  if (layer.getName() === 'White Background') {
    return;
  }

  // Recuperar informações da camada
  var eeObject = layer.getEeObject();

  if (layer.getName().slice(0,9) === 'triangulo'){
      eeObject = eeObject.set({
      'system:footprint':eeObject.get('system:footprint')
      });
  } else {
    eeObject = eeObject.set({
        'system:footprint':aoiBounds
    });
  }


  var visParams = layer.getVisParams();
  var layerName = layer.getName();
  var thumbnail = ui.Thumbnail({
    image: eeObject.visualize(visParams).blend(biomes_line)
      .set({
        'system:footprint':eeObject.get('system:footprint')
      }),
    params: {
      dimensions: 512,
    },
    style: {
      margin: '10px 0',
      border: '1px solid #ccc'
    }
  });



  // Criar um painel para organizar as informações da camada
  var layerPanel = ui.Panel({
    widgets: [
      ui.Label({
        value: 'Camada: ' + layerName,
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#333',
          margin: '0 0 10px 0'
        }
      }),
      ui.Label({
        value: 'Visual Params: ' + JSON.stringify(visParams, null, 2),
        style: {
          fontSize: '12px',
          color: '#555',
          margin: '5px 0'
        }
      }),
      thumbnail,
      ui.Label({
        value: '⚠️ Raster Virtual. Clique para aprender como adicionar mapas no QGIS',
        targetUrl: 'https://brasil.mapbiomas.org/wp-content/uploads/sites/4/2024/06/Adicionar-raster-virtual-no-qgis.pdf',
        style: {
          fontSize: '12px',
          color: '#007bff',
          margin: '5px 0',
          textDecoration: 'underline'
        }
      }),
      ui.Label({
        value: 'URL do MapId: ' + eeObject.visualize(visParams).getMapId().urlFormat,
        style: {
          fontSize: '12px',
          color: '#555',
          margin: '5px 0'
        }
      })
    ],
    style: {
      border: '1px solid #ddd',
      // borderRadius: '5px',
      backgroundColor: '#f9f9f9',
      padding: '10px',
      margin: '10px 0'
    }
  });

  // Adicionar o painel ao UI principal
  // ui.root.add(layerPanel);
  print(layerPanel);
});
