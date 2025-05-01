/*
* Dataset: ISRIC Soilgrids 30m
*
* Authors:
* - Wallace Silva
* 
* Changes:
* - Filling empty pixels with interpolation
* - Extrapolation of 3km beyond the country's border
* 
* Contact: contato@mapbiomas.org
* Last modified on May 01, 2025
* 
* MapBiomas Soil
*/

var soil_list = [
  [ee.Image("projects/soilgrids-isric/bdod_mean"), 'bdod'],
  [ee.Image("projects/soilgrids-isric/cec_mean"), 'cec'],
  [ee.Image("projects/soilgrids-isric/cfvo_mean"), 'cfvo'],
  [ee.Image("projects/soilgrids-isric/clay_mean"), 'clay'],
  [ee.Image("projects/soilgrids-isric/nitrogen_mean"), 'nitrogen'],
  [ee.Image("projects/soilgrids-isric/phh2o_mean"), 'phh2o'],
  [ee.Image("projects/soilgrids-isric/sand_mean"), 'sand'],
  [ee.Image("projects/soilgrids-isric/silt_mean"), 'silt'],
  [ee.Image("projects/soilgrids-isric/soc_mean"), 'soc'],
]; 

var soil_covariates = ee.Image().select();

var br = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var br_mask = ee.Image().paint(br).eq(0);
var bounds = br.geometry().bounds();

var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/ISRIC_2021_SOILGRIDS_250M';

soil_list
  .forEach(function(list){
    var image = list[0];
    var name = list[1];
    
    Map.addLayer(image.select(0),{min:160,max:655},name);
    
    var params = {
      radius:1000,
      units:'meters',
    };
    
    var interpolation = image
      .focalMean(params)
      .focalMean(params)
      .focalMean(params)
      .unmask(0);

    
    image = interpolation.blend(image);
    
    // Map.addLayer(interpolation.select(0),{min:160,max:655},name+' interpolation');
    // Map.addLayer(image.select(0),{min:160,max:655},name);

    image = image
      .updateMask(br_mask)
      .resample({mode:'bilinear'})
      .reproject({
        crs:'EPSG:4326',
        scale:30
      }).set({
        'index':name,
        'source':'GT Solos',
        'create-data':ee.Date(Date.now()).format('y-M-d'),
        'modeled_with':'SOILGRIDS-ISRIC',
      }).int16();
    
    print(image);
    
    Map.addLayer(image.select(0),{min:160,max:655},name + ' resample');
    
    var description = name;
    
    Export.image.toAsset({
      image:image,
      description:description,
      assetId:output + description,
      pyramidingPolicy:'median',
      region:bounds,
      scale:30,
      maxPixels:1e11,
    });
  });
