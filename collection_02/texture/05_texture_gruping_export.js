var geometry = /* color: #d63000 */ee.Geometry.MultiPoint(),
    geometry2 = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-56.937717227159844, -31.212738165946323],
          [-54.388889102159844, -32.556011268948694],
          [-53.685764102159844, -34.4612162709242],
          [-52.279514102159844, -33.66029152502946],
          [-50.258029727159844, -30.98696451725966],
          [-48.588107852159844, -28.777224175075837],
          [-47.797092227159844, -28.468626241483356],
          [-47.884982852159844, -26.046846313305252],
          [-46.742404727159844, -24.537062077592214],
          [-42.435764102159844, -23.493408790868244],
          [-41.205295352159844, -22.8470024892391],
          [-39.008029727159844, -18.823046901250557],
          [-38.436740664659844, -14.360119465924821],
          [-38.173068789659844, -13.336103177479322],
          [-35.316623477159844, -9.633172766558726],
          [-34.16972999025411, -7.565478597982493],
          [-34.82890967775411, -5.251091081123843],
          [-36.36699561525411, -4.506732964298981],
          [-38.12480811525411, -3.1036184464980767],
          [-40.67363624025411, -2.2695826407263406],
          [-43.00273780275411, -2.0060945204904357],
          [-44.80449561525411, -0.6881286085114926],
          [-49.59453467775411, 0.6741439802337771],
          [-49.55058936525411, 2.2116960059748414],
          [-51.44023780275411, 5.149634193473053],
          [-53.24199561525411, 2.7385459169817175],
          [-56.53789405275411, 2.9141132747554233],
          [-58.47148780275411, 2.343427768574177],
          [-58.91094092775411, 3.0896532511485697],
          [-59.83379249025411, 5.980652188514394],
          [-65.50273780275411, 4.317528561338012],
          [-64.57988624025411, 2.167782784521801],
          [-66.24980811525411, 1.5968043491904125],
          [-67.74394874025411, 3.484509575916666],
          [-71.12773780275411, 1.7285847499220024],
          [-70.73222999025411, -3.717760124331084],
          [-74.20390967775411, -5.338606668055138],
          [-74.11601905275411, -9.000507235725838],
          [-72.00664405275411, -10.904908774688264],
          [-71.08379249025411, -10.300181190654367],
          [-70.90801124025411, -11.293018267906692],
          [-67.56816749025411, -11.422272435341887],
          [-66.07402686525411, -10.256941119204559],
          [-65.41484717775411, -11.98168530260791],
          [-61.89922217775411, -13.738173825162955],
          [-61.02031592775411, -14.675390691446486],
          [-60.88847999025411, -16.579724908433455],
          [-58.86699561525411, -16.663942894907258],
          [-58.20781592775411, -17.964484121537797],
          [-58.47148780275411, -20.45415446377798],
          [-58.20781592775411, -22.376862743249017],
          [-56.14238624025411, -22.539312533407262],
          [-55.70293311525411, -24.03278344451897],
          [-54.82402686525411, -24.39349604922523],
          [-55.26347999025411, -25.707238723901153],
          [-54.16484717775411, -26.10253467413037],
          [-54.91191749025411, -27.28037631925673],
          [-58.07597999025411, -29.44568724120723],
        [-58.20467759540443, -30.5196195177472]]]);
/* 
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: November 19, 2024
 * 
 * SCRIPT: SOIL TEXTURE CLASSIFICATION
 *  
 * **Purpose**:
 * This script classifies soil texture based on granulometric fractions (clay, sand, silt) for the depth intervals 
 * 0-10 cm, 0-20 cm, and 0-30 cm. The classification follows a predefined soil texture classification scheme and 
 * outputs maps for each depth interval.
 * 
 * **Inputs**:
 * - Multi-band raster images containing clay, sand, and silt percentages for:
 *   - 0-10 cm 
 *   - 0-20 cm
 *   - 0-30 cm
 *   Paths:
 *   - Sand: `projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent`
 *   - Clay: `projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent`
 *   - Silt: `projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent`
 * - Biomes feature collection: `projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil`.
 * 
 * **Outputs**:
 * - Classified soil texture maps for each depth interval:
 *   - 0-10 cm
 *   - 0-20 cm
 *   - 0-30 cm
 * - Combined multi-band image containing all depth-specific soil texture classifications.
 *
 * **Soil Texture Classification Scheme**:
 * - Very Clayey: Clay ≥ 60%
 * - Clayey: 35% ≤ Clay < 60%
 * - Silty: Silt ≥ 50%, Sand < 15%, Clay < 35%
 * - Sandy: Sand ≥ 70%, Sand < 70 + (35 - Clay), Clay < 35%
 * - Loamy: All other cases
 * 
 * **Contact**:
 * For inquiries or access to additional resources, contact:
 * - MapBiomas Soil Team: contato@mapbiomas.org
 * - Coordination: Dra. Taciara Zborowski Horst (taciaraz@professores.utfpr.edu.br)
 */        
var version = 'v010';
var output = 'projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/';
var description = version + '_SoilTexture_legend1';


// importando do layer multibanda com diferentes profundidade 
// Import sand, clay, and silt images and select respective bands
var sand = ee.Image('projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_sand_percent')
  .select(['sand_0_10cm', 'sand_0_20cm', 'sand_0_30cm']);
var clay = ee.Image('projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_clay_percent')
  .select(['clay_0_10cm', 'clay_0_20cm', 'clay_0_30cm']);
var silt = ee.Image('projects/mapbiomas-workspace/SOLOS/PREDICOES_C01/GRANULOMETRIA/beta_silt_percent')
  .select(['silt_0_10cm', 'silt_0_20cm', 'silt_0_30cm']);

// Combine bands into individual soil fraction images
var soilFractions_0_10cm = ee.Image.cat([
  sand.select('sand_0_10cm'),
  silt.select('silt_0_10cm'),
  clay.select('clay_0_10cm')
]).rename(['sand', 'silt', 'clay']);

var soilFractions_0_20cm = ee.Image.cat([
  sand.select('sand_0_20cm'),
  silt.select('silt_0_20cm'),
  clay.select('clay_0_20cm')
]).rename(['sand', 'silt', 'clay']);

var soilFractions_0_30cm = ee.Image.cat([
  sand.select('sand_0_30cm'),
  silt.select('silt_0_30cm'),
  clay.select('clay_0_30cm')
]).rename(['sand', 'silt', 'clay']);


function classifySoil(image) {
  return image.expression(
    // string
    '(clay >= 60) ? 1 : ' + //1 = muito argilosa
    '((clay >= 35) && (clay < 60)) ? 2 : ' + // argilosa
    '((silt >= 50) && (sand < 15) && (clay < 35)) ? 3 : ' + // siltosa
    '((sand >= 70) && (sand < (70 + (35 - clay))) && (clay < 35)) ? 4 : ' + // arenosa
    '5', // Média
    {
      clay: image.select('clay'),
      sand: image.select('sand'),
      silt: image.select('silt')
    }
  ).rename('classified');
}

// Classify
var soilTexture_0_10cm = classifySoil(soilFractions_0_10cm);
var soilTexture_0_20cm = classifySoil(soilFractions_0_20cm);
var soilTexture_0_30cm = classifySoil(soilFractions_0_30cm);

 // Limite biomas
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");

// Máscara de água
var water_mask = ee.Image('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/GT_MASK_SUBMERGED_AND_ANTHROPIZED_BODIES')
  .select('classification_2023');

// Area that are not water
var soilOnlyMask = water_mask.mask().neq(1); 
var br_soil = soilOnlyMask.clip(biomes); // Mask the soilTexture image using the clippedSoilAreaMask

// Clip the classified image
var maskedSoilTexture_0_10cm = soilTexture_0_10cm.updateMask(br_soil);
var maskedSoilTexture_0_20cm = soilTexture_0_20cm.updateMask(br_soil);
var maskedSoilTexture_0_30cm = soilTexture_0_30cm.updateMask(br_soil);


var palette_legenda = [
'#a83800', // Muito argilosa
'#aa8686', // Argilosa
'#b5d6ae', // Siltosa
'#fffe73', // Arenosa
'#d7c5a5' // Média
];


// Combine the three classified soil texture layers into a single multiband image
var combinedSoilTexture = maskedSoilTexture_0_10cm.rename('soil_texture_0_10cm')
  .addBands(maskedSoilTexture_0_20cm.rename('soil_texture_0_20cm'))
  .addBands(maskedSoilTexture_0_30cm.rename('soil_texture_0_30cm'));

// Define the export regionvar maskedSoilTexture = soilTexture.updateMask(clippedSoilAreaMask);
var exportRegion = combinedSoilTexture.geometry();
Map.addLayer(exportRegion,{},'teste')
print(combinedSoilTexture)
// Export the combined image to an asset
Export.image.toAsset({
  image: combinedSoilTexture,
  description: description,
  assetId: output + description,
  region: geometry2,
  scale: 30, // Adjust scale based on your data resolution
  maxPixels: 1e13,
  pyramidingPolicy: 'sample'
});

// /////////////// GENERATE FIGURE BY BIOME IN A WHITE BACKGROUND
// // Add a white background to the map
// var whiteBackground = ee.Image(1).visualize({
//   palette: ['white'],
//   opacity: 1
// });
// // Add the white background to the map
// Map.addLayer(whiteBackground, {}, 'White Background');
// // Filter for the Amazon biome
// var amazonBiome = biomes.filter(ee.Filter.eq('Bioma', 'Pantanal'));

// // Mask the soil texture image to only include the Amazon biome
// var maskedSoilTexture_Amazon = maskedSoilTexture_0_10cm.updateMask(
//   maskedSoilTexture_0_10cm.clip(amazonBiome)
// );
// ////////////////


// Visualize the classified image with the palette
Map.addLayer(maskedSoilTexture_0_10cm, {
  min: 1, // Minimum class ID
  max: 5, // Maximum class ID
  palette: palette_legenda           // Corresponding palette
}, 'Soil Texture Classification 0-10cm');

Map.addLayer(maskedSoilTexture_0_20cm, {
  min: 1, // Minimum class ID
  max: 5, // Maximum class ID
  palette: palette_legenda           // Corresponding palette
}, 'Soil Texture Classification 0-20cm');

Map.addLayer(maskedSoilTexture_0_30cm, {
  min: 1, // Minimum class ID
  max: 5, // Maximum class ID
  palette: palette_legenda            // Corresponding palette
}, 'Soil Texture Classification 0-30cm');


/////// 

/*
var classIDs2 = [
21, // Muito argilosa
22, // Argilosa
23, // Média-siltosa
24, // Média-argilosa
25, // Média-arenosa
26, // Siltosa
27, // Arenosa média
28, // Muito Arenosa
];

var palette_legenda2 = [
'#a83800', // Muito argilosa
'#aa8686', // Argilosa
'#654e9c', // Média-siltosa
'#cebec6', // Média-argilosa
'#fea67e', // Média-arenosa
'#b5d6ae', // Siltosa
'#d49616', // Arenosa média
'#fffe73', // Muito Arenosa
];

var classIDs3 = [
31, // Muito argilosa
32, // Argila 
33, // Argilo Arenosa
34, // Argilo Siltosa
35, // Franco Argilosa Siltosa
36, // Franco Argilosa
37, // Franco Argilo Arenosa
38, // Franca
39, // Franco Arenosa
310, // Areia Franca
311, // Areia
312, // Silte
313 // Franco Siltosa
];

var palette_legenda3 = [
'#a83800', // Muito argilosa
'#aa8686', // Argila 
'#d7c5a5', // Argilo Arenosa
'#9eaa85', // Argilo Siltosa
'#d6bac9', // Franco Argilosa Siltosa
'#cebec6', // Franco Argilosa
'#fecc5c', // Franco Argilo Arenosa
'#b6d8ee', // Franca
'#fea67e', // Franco Arenosa
'#d49616', // Areia Franca
'#fffe73', // Areia
'#b5d6ae', // Silte
'#654e9c', // Franco Siltosa
];

*/
