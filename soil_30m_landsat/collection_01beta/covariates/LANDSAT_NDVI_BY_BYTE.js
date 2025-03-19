var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-75.49872075888901, 6.56060232238872],
          [-75.49872075888901, -35.54590579669133],
          [-29.79559575888901, -35.54590579669133],
          [-29.79559575888901, 6.56060232238872]]], null, false);
/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset LANDSAT_NDVI_BY_BYTE

Data: 2023-10-09
Autores: Bárbara Costa, Wallace Silva, Taciara Horst
Contato: contato@mapbiomas.org

*/

// --- coleções de imagens de sensores orbitais do espectro otico
var datasets = [
  {
    'dataset':'satellites',
    'id':'LANDSAT/LT05/C02/T1_L2',
    'name':'landsat5_C02',
    'show':false,
    'years':[1985,1986,1987,1988,1989,1990,1991,1992,1993,1994,1995,1996,1997,1998,1999,2004,2005,2006,2007,2008,2009,2010,2011],
    'vis':{
        min:0.03,
        max:0.4,
        bands:['swir1','nir','red'],
    },
    allProcess:function(col){
       col = ee.ImageCollection(col).filter(ee.Filter.inList('system:index', blockList_landsat).not());
      
      return ee.ImageCollection(col).map(function(image){
        image = clipBoard_Landsat (image);
        image = corrections_LS57_col2(image);
        image = addBand_NDVI(image);
        return image;
      });
    },
    reduceProcess:function(col){
      var max = col.select('ndvi').max().rename('ndvi_max');
      var median = col.select('ndvi').median().rename('ndvi_median');
      return max
        .addBands(median)
        .int16();
    },
    

  },
  {
    'dataset':'satellites',
    'id':'LANDSAT/LE07/C02/T1_L2',
    'name':'landsat7_C02',
    'years':[2000,2001,2002,2003,2012],
    'vis':{
      min:0.03,
      max:0.4,
      bands:['swir1','nir','red'],
    },
    allProcess:function(col){
      col = ee.ImageCollection(col).filter(ee.Filter.inList('system:index', blockList_landsat).not());
      return ee.ImageCollection(col).map(function(image){
        
      image = clipBoard_Landsat (image);
      image = corrections_LS57_col2(image);
      image = addBand_NDVI(image);
      return image;
    });
    },
    reduceProcess:function(col){
      var max = col.select('ndvi').max().rename('ndvi_max');
      var median = col.select('ndvi').median().rename('ndvi_median');
      return max
        .addBands(median)
        .int16();

    },
  },
  {
    'dataset':'satellites',
    'id':'LANDSAT/LC08/C02/T1_L2',
    'name':'landsat8_C02',
    'years':[2013,2014,2015,2016,2017,2018,2019,2020,2021,2022],
    'vis':{
        min:0.03,
        max:0.4,
        bands:['swir1','nir','red'],
      },
    allProcess:function(col){
      col = ee.ImageCollection(col).filter(ee.Filter.inList('system:index', blockList_landsat).not());
      return ee.ImageCollection(col).map(function(image){
        
      image = clipBoard_Landsat (image);
      image = corrections_LS8_col2(image);
      image = addBand_NDVI(image);
      return image;
    });
    },
    reduceProcess:function(col){
      var max = col.select('ndvi').max().rename('ndvi_max');
      var median = col.select('ndvi').median().rename('ndvi_median');
      return max
        .addBands(median)
        .int16();
    },
  }, 
];

var blockList_landsat = [];

// recortando bordas de cenas landsat
function clipBoard_Landsat(image){
  return image
    .updateMask(ee.Image().paint(image.geometry().buffer(-3000)).eq(0));
}

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
  var newBands = ['blue', 'green','red',  'nir',  'swir1','swir2'];
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
  var newBands = ['blue', 'green','red',  'nir',  'swir1','swir2'];
  
  image = image.select(oldBands,newBands);
  // - 
  return image;

  // - return timeFlag_landsat(image);
}

function addBand_NDVI (image){
  var exp = '( b("nir") - b("red") ) / ( b("nir") + b("red") )';
  var ndvi = image
    .expression(exp)
    .add(1)
    .multiply(100)
    .byte()
    .rename("ndvi");
  return image
    .addBands(ndvi);
}

var mask = ee.Image().paint(ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/estados-2017'));

// Map.addLayer(mask)

datasets
// .slice(0,1)
.forEach(function(obj){
  
  obj.years
  // .slice(0,1)
  .forEach(function(year){
    var start = ''+year+'-01-01';
    var end = ''+(year+1)+'-01-01';

    var col_year = ee.ImageCollection(obj.id).filterDate(start,end);

    col_year = obj.allProcess(col_year);

    var description = 'MEAN-'+year;

      var image = col_year
      .select('ndvi')
      .mean()
      .rename('ndvi_mean')
      .int16()
      .updateMask(mask.eq(0))
      .set({
        'reduce':'mean',
        'year':year,
        'index':description,
        'sistem:start_time':ee.Date(start).millis(),
        'sistem:end_time':ee.Date(end).millis(),
        'version':'v1',
        'create-data':'2022-07-05'
      });
    
    // print(image)
    
    var output_folder = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_NDVI_BY_BYTE/';
    // var output_folder = 'projects/mapbiomas-solos-workspace/assets/-temporary/';
    
    // Map.addLayer(image.select('ndvi_median'),{min:1000,max:17000},description + 'median',false);
    // Map.addLayer(image.select('ndvi_max'),{min:1000,max:1700},description + 'max',false);
   
    Export.image.toAsset({
      image:image,
      description:description,
      assetId:output_folder+description,
      pyramidingPolicy:'mean',
      // dimensions:,
      region:geometry,
      scale:30,
      // crs:,
      // crsTransform:,
      maxPixels:1e11,
      // shardSize:
      });
    
  });
  

});