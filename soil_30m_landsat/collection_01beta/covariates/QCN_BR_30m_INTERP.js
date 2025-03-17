/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset Quarta Comunicação Nacional

Atualização: Preenchimento dos pixels vazios. 

Data: 2024-11-04
Autores: Marcos Cardoso

Contato: contato@mapbiomas.org

*/
var QCN_original = ee.ImageCollection('projects/mapbiomas-workspace/SEEG/2022/QCN/QCN_30m_BR_v2_0_1').mosaic();

Map.addLayer(QCN_original,{min:0,max:600},'QCN_original');

var br = ee.FeatureCollection('projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil');
var br_mask = ee.Image().paint(br).eq(0);
var bounds = br.geometry().bounds();

var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/';
var DataSetName = 'QCN_30m_BR_INTERP'; 

    var params = {
      radius:1000,
      // kernelType:,
      units:'meters',
      // iterations:,
      // kernel:
    };
    
    var interpolation = QCN_original
      .focalMean(params) //Somente para valor
      .focalMean(params)
      .focalMean(params)
      .focalMean(params)
      .focalMean(params)
      .unmask(0);

    // Map.addLayer(image.select(0),{min:160,max:655},'image');
    
    var QCN_interpolation = interpolation.blend(QCN_original);
    
    Map.addLayer(interpolation,{min:0,max:655},'interpolation');
    Map.addLayer(QCN_interpolation,{min:0,max:600},'QCN_interpolation');

    QCN_interpolation = QCN_interpolation
      .updateMask(br_mask)
      .toInt16()
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
    
    print(QCN_interpolation);
    
    var description = DataSetName;
    
    Export.image.toAsset({
      image:QCN_interpolation,
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


 
 
// "cagb","cbgb","cdw","clitter","total"],["cagb","cbgb","cdw","clitter","ctotal"]).float())