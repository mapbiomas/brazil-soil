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
Dataset LANDSAT_INDEX_BY_BYTE

Data: 2023-10-10
Autores: Bárbara Costa, Wallace Silva, Taciara Horst
Contato: contato@mapbiomas.org

*/

var landsat_ndvi = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_NDVI_BY_BYTE')
  .map(function(image){
    var start = ee.Date(ee.String(image.getNumber('year').int()).cat('-01-01'));
    return image.set({
      'system:time_start':start.millis(),
      'system:time_end':start.advance(1,'year').millis(),
    });
  });
var landsat_evi = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_EVI_BY_BYTE')
  .map(function(image){
    var start = ee.Date(ee.String(image.getNumber('year').int()).cat('-01-01'));
    return image.set({
      'system:time_start':start.millis(),
      'system:time_end':start.advance(1,'year').millis(),
    });
  });
var landsat_savi = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_SAVI_BY_BYTE')
  .map(function(image){
    var start = ee.Date(ee.String(image.getNumber('year').int()).cat('-01-01'));
    return image.set({
      'system:time_start':start.millis(),
      'system:time_end':start.advance(1,'year').millis(),
    });
  });

print(landsat_ndvi,landsat_evi,landsat_savi,'landsat_ndvi','landsat_evi','landsat_savi');

var lv0LULC = ee.ImageCollection('projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/AGE_LULC_COL8_DUMMY_v1');
// var lv0LULC_list = lv0LULC.aggregate_array('index');
var lv0LULC_list = ee.List(["antropico","natural"]);
print('lv0LULC_list',lv0LULC_list);

var addVariables = function(image) {
  var date = image.date();
  var years = date.difference(ee.Date('1970-01-01'), 'year');
  return image
  .addBands(ee.Image(years).rename('t')).float()
  .addBands(ee.Image.constant(1));
};

// --- --- --- INDICES SAVI, EVI e NDVI
// - - - - - - - REMOVENDO TENDÊNCIA DO EVI
var index_col = landsat_evi.map(addVariables);
// print(index_col)
var independents = ee.List(['constant', 't']);
var dependent = ee.String('evi_mean');
var trend = index_col.select(independents.add(dependent))
  .reduce(ee.Reducer.linearRegression(independents.length(), 1));

var coefficients = trend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([independents]);
  
var detrended = index_col.map(function(image) {
  return image.select(dependent).subtract(
    image.select(independents).multiply(coefficients).reduce('sum'))
    .rename(dependent)
    .copyProperties(image, ['system:time_start','year']);
});
var evi_col = detrended;
// - - - - - - - REMOVENDO TENDÊNCIA DO SAVI
var index_col = landsat_savi.map(addVariables);

var independents = ee.List(['constant', 't']);
var dependent = ee.String('savi_mean');
var trend = index_col.select(independents.add(dependent))
  .reduce(ee.Reducer.linearRegression(independents.length(), 1));

var coefficients = trend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([independents]);
  
var detrended = index_col.map(function(image) {
  return image.select(dependent).subtract(
    image.select(independents).multiply(coefficients).reduce('sum'))
    .rename(dependent)
    .copyProperties(image, ['system:time_start','year']);
});

var savi_col = detrended;

// - - - - - - - REMOVENDO TENDÊNCIA DO NDVI
var index_col = landsat_ndvi.map(addVariables);
var independents = ee.List(['constant', 't']);
var dependent = ee.String('ndvi_mean');
var trend = index_col.select(independents.add(dependent))
  .reduce(ee.Reducer.linearRegression(independents.length(), 1));

var coefficients = trend.select('coefficients')
  .arrayProject([0])
  .arrayFlatten([independents]);
  
var detrended = index_col.map(function(image) {
  return image.select(dependent).subtract(
    image.select(independents).multiply(coefficients).reduce('sum'))
    .rename(dependent)
    .copyProperties(image, ['system:time_start','year']);
});

var ndvi_col = detrended;
/////////////////////////////////////////////
// Map.addLayer(landsat_ndvi,{},'landsat_ndvi');
// Map.addLayer(ndvi_col,{},'ndvi_col');
// aplicando média ponderada e mascarando vazios
var years = [
    1985,1986,1987,1988,1989,1990,1991,1992,1993,1994,
    1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,
    2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,
    2015,2016,2017,2018,2019,2020,2021,2022
  ];
var index_col = years
  .map(function(year){
  
  var container_evi = ee.Image().select();
  var container_savi = ee.Image().select();
  var container_ndvi = ee.Image().select();
  
  // - - - - - - - CÁLCULO DE DECAIMENTO DO NDVI
  var alfa_07 = [
    0.327,
    0.229,
    0.160,
    0.078,
    0.055,
    0.038
  ];

  alfa_07.forEach(function(factor){
  
    var year_decay = year - alfa_07.indexOf(factor);
        
    if (year_decay < years[0]){
      year_decay = years[0];
    }
    
    var year_prev = year_decay - 1;
    var year_post = year_decay + 1;
    
    if (year_decay === years[0]){
      year_prev = year_decay + 1;
      year_post = year_decay + 2;
    }
    
    if (year_decay === years.slice(-1)[0]){
      year_prev = year_decay - 1;
      year_post = year_decay - 2;
    }
    
    ////////////////////// EVI
    var landsat_evi_year = evi_col.filter(ee.Filter.eq('year',year_decay)).mosaic();
    var landsat_evi_year_prev = evi_col.filter(ee.Filter.eq('year',year_prev)).mosaic();
    var landsat_evi_year_post = evi_col.filter(ee.Filter.eq('year',year_post)).mosaic();

    var landsat_evi_blend = landsat_evi_year_post
      .blend(landsat_evi_year_prev)
      .blend(landsat_evi_year);
    
    var evi_year = landsat_evi_blend
      .multiply(factor)
      .rename('ev_mean'+ year_decay);

    container_evi = container_evi.addBands(evi_year);

    container_evi = container_evi
      .reduce('sum')
      .int16()
      .rename('evi_mean');
    
    ////////////////////// SAVI
    var landsat_savi_year = savi_col.filter(ee.Filter.eq('year',year_decay)).mosaic();
    var landsat_savi_year_prev = savi_col.filter(ee.Filter.eq('year',year_prev)).mosaic();
    var landsat_savi_year_post = savi_col.filter(ee.Filter.eq('year',year_post)).mosaic();

    var landsat_savi_blend = landsat_savi_year_post
      .blend(landsat_savi_year_prev)
      .blend(landsat_savi_year);

    var savi_year = landsat_savi_blend
      .multiply(factor)
      .rename('savi_mean'+ year_decay);

    container_savi = container_savi.addBands(savi_year)
      .reduce('sum')
      .int16()
      .rename('savi_mean');

    
    ////////////////////// NDVI
    var landsat_ndvi_year = ndvi_col.filter(ee.Filter.eq('year',year_decay)).mosaic();
    var landsat_ndvi_year_prev = ndvi_col.filter(ee.Filter.eq('year',year_prev)).mosaic();
    var landsat_ndvi_year_post = ndvi_col.filter(ee.Filter.eq('year',year_post)).mosaic();

    var landsat_ndvi_blend = landsat_ndvi_year_post
      .blend(landsat_ndvi_year_prev)
      .blend(landsat_ndvi_year);

    var ndvi_year = landsat_ndvi_blend
      .multiply(factor)
      .rename('ndvi_mean'+ year_decay);

    container_ndvi = container_ndvi.addBands(ndvi_year)
      .reduce('sum')
      .int16()
      .rename('ndvi_mean');

    
  });

  
    var start = ee.Date(''+year+'-01-01').millis();
    var end = ee.Date(''+(year+1)+'-01-01').millis();
    ///////////////////////////////
    
    var container = container_evi.addBands(container_savi).addBands(container_ndvi)
      .set({
        year:year,
        'system:time_start':start,
        'system:time_end':end,
      });
    
    return container.set({
        year:year,
        'system:time_start':start,
        'system:time_end':end,
      });
});
index_col = ee.ImageCollection(index_col);

print('index_col',index_col);

years.forEach(function(year){
    
    var image = index_col.filter(ee.Filter.eq('year',year)).first(),
    description = ''+year,
    assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_INDEX_BY_BYTE/' + description;
    Map.addLayer(image,{},description);
    Export.image.toAsset({
      image:image,
      description:'W-GT_SOLO-LANDSAT_INDEX_BY_BYTE-'+description, 
      assetId:assetId,
      pyramidingPolicy:'median',
      // dimensions:,
      region:geometry,
      scale:30,
      // crs:,
      // crsTransform:,
      maxPixels:1e13,
      // shardSize:
    });
  });
