/*
 * MAPBIOMAS SOIL
 * @contact: contato@mapbiomas.org
 * @date: May 01, 2025
 *
 * Dataset: Black Soil Probability 30m
 *
 * Processing:
 * - Filling empty pixels with interpolation
 * - Extrapolation of 3km beyond the country's border
 */

var blacksoil = ee.Image('projects/mapbiomas-solos-workspace/assets/covariates/soil/FAO_blackSoilProbability_1km')
.select(0)

var br = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var br_mask = ee.Image().paint(br).eq(0);
var bounds = br.geometry().bounds();

var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/';
var DataSetName = 'FAO_2022_BLACKSOIL_1KM'; 

    var params = {
      radius:1000,
      units:'meters',
    };
    
    var interpolation = blacksoil
      .focalMean(params) //Somente para valor
      .focalMean(params)
      .focalMean(params)
      .unmask(0);

    // Map.addLayer(image.select(0),{min:160,max:655},'image');
    
    blacksoil = interpolation.blend(blacksoil);
    
    // Map.addLayer(interpolation.select(0),{min:160,max:655},'interpolation');
    Map.addLayer(blacksoil.select(0),{min:160,max:655},'blacksoil');

    blacksoil = blacksoil
      .updateMask(br_mask)
      .toInt16()
      .resample({mode:'bilinear'})
      .reproject({
        crs:'EPSG:4326',
        scale:30
      }).set({
        'index': DataSetName,
        'source':'GT Solos',
        'create-data':ee.Date(Date.now()).format('y-M-d'),
        'modeled_with':'SOILGRIDS-ISRIC',
      });
    
    print(blacksoil);
    
    Map.addLayer(blacksoil.select(0),{min:160,max:655},'image resample')
    
    var description = DataSetName;
    
    Export.image.toAsset({
      image:blacksoil,
      description:description,
      assetId:output + description,
      pyramidingPolicy:'mean',
      region:bounds,
      scale:30,
      maxPixels:1e11,
    });
