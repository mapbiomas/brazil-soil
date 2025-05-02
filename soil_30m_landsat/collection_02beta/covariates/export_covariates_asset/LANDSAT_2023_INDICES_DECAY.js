 
var biomas = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var aoi = biomas;
var aoi_img = ee.Image().paint(aoi).eq(0);
var aoi_bounds = aoi.geometry().bounds();

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

var years = [
    1985,1986,1987,1988,1989,1990,1991,1992,1993,1994,
    1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,
    2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,
    2015,2016,2017,2018,2019,2020,2021,2022, 2023
  ];

 // indices espectrais do mosaico do mapbiomas
    var mb_col = ee.ImageCollection('projects/nexgenmap/MapBiomas2/LANDSAT/BRAZIL/mosaics-2');


      var mb_indices_year = [
    'ndvi_median',

    'evi2_median',

    'savi_median',

  ];

var index_col = years.map(function(year) {
  // Inicializar containers para cada índice
  var container_ndvi = ee.Image().select();

  var container_evi2 = ee.Image().select();

  var container_savi = ee.Image().select();


  // Definindo o fator de decaimento
  var alfa_07 = [0.327, 0.229, 0.160, 0.112 , 0.078, 0.055, 0.038];

  // Loop através dos fatores de decaimento
  alfa_07.forEach(function(factor) {
    var year_decay = year - alfa_07.indexOf(factor);

    if (year_decay < years[0]) {
      year_decay = years[0];
    }

    var year_prev = year_decay - 1;
    var year_post = year_decay + 1;

    if (year_decay === years[0]) {
      year_prev = year_decay + 1;
      year_post = year_decay + 2;
    }

    if (year_decay === years.slice(-1)[0]) {
      year_prev = year_decay - 1;
      year_post = year_decay - 2;
    }

    // Loop através de cada índice em 'mb_indices_year'
    mb_indices_year.forEach(function(index) {
      // Filtrando a coleção de acordo com o índice e o ano de decaimento
      var index_band = mb_col.filter(ee.Filter.eq('year', year_decay))
                             .filter(ee.Filter.eq('satellite', year_sat[year_decay]))
                             .select([index])
                             .mosaic();
      
      var index_band_prev = mb_col.filter(ee.Filter.eq('year', year_prev))
                                  .filter(ee.Filter.eq('satellite', year_sat[year_prev]))
                                  .select([index])
                                  .mosaic();
      
      var index_band_post = mb_col.filter(ee.Filter.eq('year', year_post))
                                  .filter(ee.Filter.eq('satellite', year_sat[year_post]))
                                  .select([index])
                                  .mosaic();

      // Blend para suavizar o índice
      var index_blend = index_band_post
        .blend(index_band_prev)
        .blend(index_band);

      // Multiplicar pelo fator de decaimento
      var index_mean = index_blend.multiply(factor);

      // Adicionar ao container correspondente
      switch (index) {
        case 'ndvi_median':
          container_ndvi = container_ndvi.addBands(index_mean);
          break;

        case 'evi2_median':
          container_evi2 = container_evi2.addBands(index_mean);
          break;

        case 'savi_median':
          container_savi = container_savi.addBands(index_mean);
          break;
      }
    });
  });

  // Reduzir cada container somado para uma única banda
  container_ndvi = container_ndvi.reduce('sum').divide(100).byte().rename('mb_ndvi_median');
  container_evi2 = container_evi2.reduce('sum').divide(100).byte().rename('mb_evi2_median');
  container_savi = container_savi.reduce('sum').divide(100).byte().rename('mb_savi_median');

  // Combinar todos os containers em uma única imagem
  var container = container_ndvi.addBands([
    container_evi2,
    container_savi
  ]);

  var start = ee.Date('' + year + '-01-01').millis();
  var end = ee.Date('' + (year + 1) + '-01-01').millis();

  return container.set({
    year: year,
    'system:time_start': start,
    'system:time_end': end
  });
});

// Criar a coleção de imagens
index_col = ee.ImageCollection(index_col);
print('index_col', index_col);

// Exportar imagens para o asset
years.forEach(function(year) {
  var image = index_col.filter(ee.Filter.eq('year', year)).first();
  var description = '' + year;
  var assetId = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/LANDSAT_2023_MBINDICES_DECAY';

  Map.addLayer(image, {}, description);

  Export.image.toAsset({
    image: image,
    description: 'GT_MC_SOLO-LANDSAT_MB_INDICES_DECAY-' + description,
    assetId: assetId,
    pyramidingPolicy: 'median',
    region: aoi_bounds,
    scale: 30,
    maxPixels: 1e13
  });
});
