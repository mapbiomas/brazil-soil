var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-74.04409005983102, 5.677090648400953],
          [-74.04409005983102, -34.183732823083936],
          [-34.053855684831014, -34.183732823083936],
          [-34.053855684831014, 5.677090648400953]]], null, false);
/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset LANDSAT_CLAYMINERALS_BY_BYTE

Data: 2023-10-10
Autores: Bárbara Costa, Wallace Silva, Taciara Horst, David Pontes e Marcos Cardoso
Contato: contato@mapbiomas.org

- - - - - - - CLAYMNINERALS (Al, Fe, MG)-OH INDEX CALC - - - - - - -
*/
  

// --- as funções 'corrections' buscam resumir todos os processamentos necessarios para os mosaicos
function corrections_LS57_col2 (image){
  var opticalBands = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  // - return 
  
  image = image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);

  // mascara de nuvem
  var cloudShadowBitMask = (1 << 3);
  var cloudsBitMask = (1 << 5);

  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
      .and(qa.bitwiseAnd(cloudsBitMask).eq(0));

  // mascara de ruidos, saturação radiométrica
  function bitwiseExtract(value, fromBit, toBit) {
    if (toBit === undefined)
      toBit = fromBit;
    var maskSize = ee.Number(1).add(toBit).subtract(fromBit);
    var mask = ee.Number(1).leftShift(maskSize).subtract(1);
    return value.rightShift(fromBit).bitwiseAnd(mask);
  }

  var clear = bitwiseExtract(qa, 6); // 1 if clear
  var water = bitwiseExtract(qa, 7); // 1 if water

  var radsatQA = image.select('QA_RADSAT');
  var band5Saturated = bitwiseExtract(radsatQA, 4); // 0 if band 5 is not saturated
  var anySaturated = bitwiseExtract(radsatQA, 0, 6); // 0 if no bands are saturated

  var mask_saturation = clear
    .or(water)
    .and(anySaturated.not());
  
  // is visible bands with negative reflectance? 
  var negative_mask = image.select(['SR_B1']).gt(0).and(
    image.select(['SR_B2']).gt(0)).and(
      image.select(['SR_B3']).gt(0)).and(
        image.select(['SR_B4']).gt(0)).and(
          image.select(['SR_B5']).gt(0)).and(
            image.select(['SR_B7']).gt(0));
  
  // - return
  image = image
    .updateMask(mask)
    .updateMask(mask_saturation)
    .updateMask(negative_mask);
        

  var oldBands = ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7',];
  var newBands = ['blue', 'green','red','nir','swir1','swir2'];
  image = image.select(oldBands,newBands);

  // - 
  return image;

  // - return timeFlag_landsat(image);
}

function corrections_LS8_col2 (image){

  // - radiometric correction
  var opticalBands = image.select('SR_B.*').multiply(0.0000275).add(-0.2);
  // rectfy to dark corpse reflectance == -0.0000000001
  opticalBands = opticalBands.multiply(10000).subtract(0.0000275 * 0.2 * 1e5 * 100).round()
    .divide(10000);
  
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  
  // - return 
  image = image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
    
  // - masks
  // If the cloud bit (3) is set and the cloud confidence (9) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var qa = image.select('QA_PIXEL');
      var cloud = qa.bitwiseAnd(1 << 3)
      .and(qa.bitwiseAnd(1 << 9))
      .or(qa.bitwiseAnd(1 << 4));
  
  // If the clear bit (6) is set 
  // or water bit is set (7), then it's a good pixel 
  var good_pixel  = qa.bitwiseAnd(1 << 6)
      .or(qa.bitwiseAnd(1 << 7));

  // read radsat 
  var radsatQA = image.select('QA_RADSAT');
  // Is any band saturated? 
  var saturated = radsatQA.bitwiseAnd(1 << 0)
    .or(radsatQA.bitwiseAnd(1 << 1))
      .or(radsatQA.bitwiseAnd(1 << 2))
        .or(radsatQA.bitwiseAnd(1 << 3))
          .or(radsatQA.bitwiseAnd(1 << 4))
            .or(radsatQA.bitwiseAnd(1 << 5))
              .or(radsatQA.bitwiseAnd(1 << 6));

  // is any band with negative reflectance? 
  var negative_mask = image.select(['SR_B1']).gt(0).and(
    image.select(['SR_B2']).gt(0)).and(
      image.select(['SR_B3']).gt(0)).and(
        image.select(['SR_B4']).gt(0)).and(
          image.select(['SR_B5']).gt(0)).and(
            image.select(['SR_B7']).gt(0));

  // -return 
  image = image
  .updateMask(cloud.not())
  .updateMask(good_pixel)
  .updateMask(saturated.not())
  .updateMask(negative_mask);
  
  
  // correction bandnames to default
  var oldBands = ['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7',];
  var newBands = ['blue', 'green','red','nir','swir1','swir2'];
  
  image = image.select(oldBands,newBands);
  // - 
  return image;

  // - return timeFlag_landsat(image);
}

// clayminerals function
function addBand_CLAYMINERALS (image){
  var exp = '(b("swir1") / b("swir2")) / (b("nir") / b("red"))';
  var clayminerals = image
    .expression(exp)
    .multiply(100)
    .byte()
    .rename("clayminerals");
  return image
    .addBands(clayminerals);
}

var mask = ee.Image().paint(ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/estados-2017'));
var description = 'qualityMosaic-claymineralsIndex';

// Import the Landsat 5, 7, and 8 collections
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
            .map(corrections_LS57_col2)
            .map(addBand_CLAYMINERALS);

var l7 = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
            .map(corrections_LS57_col2)
            .map(addBand_CLAYMINERALS);

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
            .map(corrections_LS8_col2)
            .map(addBand_CLAYMINERALS);

// Merge the collections
var collection = l5.merge(l7).merge(l8);
var claymineral = collection
      .select('clayminerals')
      .mean()
      .rename('clayminerals_quality')
      .int16()
      .updateMask(mask.eq(0))
      .set({
        'reduce':'median',
        'index': description,
        'version':'v1',
        'create-data':'2023-03-22'
      });

print (claymineral);
Map.addLayer (claymineral.select('clayminerals_quality'), {min:30, max:100}, 'claymineral', false);

var output_folder = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_CLAYMINERALS_BY_BYTE';
 Export.image.toAsset({
      image: claymineral,
      description:'CLAYMINERALS',
      assetId: output_folder,
      pyramidingPolicy:'mean',
      // dimensions:,
      region:geometry,
      scale:30,
      // crs:,
      // crsTransform:,
      maxPixels:1e13,
      // shardSize:
      });
