var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-77.89585620965532, 7.442687707812072],
          [-77.89585620965532, -35.39475280299957],
          [-29.556012459655328, -35.39475280299957],
          [-29.556012459655328, 7.442687707812072]]], null, false);
/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset Probabilidade do Black Soil 30m

Atualização: Preenchimento dos pixels vazios. 

Data: 2024-06-03
Autores: Wallace Silva, Barbara Silva, Taciara Horst, Marcos Cardoso e David Pontes

Contato: contato@mapbiomas.org

*/
var blacksoil = ee.Image('projects/mapbiomas-solos-workspace/assets/covariates/soil/FAO_blackSoilProbability_1km')
.select(0)

// .rename('b1', 'blackSoilProb');

var br = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var br_mask = ee.Image().paint(br).eq(0);
var bounds = br.geometry().bounds();

var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/';
var DataSetName = 'FAO_blackSoilProbability'; 

    var params = {
      radius:1000,
      // kernelType:,
      units:'meters',
      // iterations:,
      // kernel:
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
        // crsTransform:,
        scale:30
      }).set({
        'index': DataSetName,
        'source':'GT Solos',
        'create-data':ee.Date(Date.now()).format('y-M-d'),
        'modeled_with':'SOILGRIDS-ISRIC',
      });
    
    print(blacksoil);
    
    Map.addLayer(blacksoil.select(0),{min:160,max:655},'image resample')
    
    var description = DataSetName  + '_30m_v1';
    
    Export.image.toAsset({
      image:blacksoil,
      description:description,
      assetId:output + description,
      pyramidingPolicy:'mean',
      // dimensions:,
      region:bounds,
      scale:30,
      // crs:,
      // crsTransform:,
      maxPixels:1e11,
      // shardSize:
    });
