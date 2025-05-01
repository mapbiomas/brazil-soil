// Importar os dados dos biomas e das amostras fornecidas
var biomes = ee.FeatureCollection("projects/mapbiomas-workspace/AUXILIAR/biomas_IBGE_250mil");
var aoi = biomes;
var aoiImg = ee.Image().paint(aoi).eq(0);
var aoiBounds = aoi.geometry().bounds();

var amostras = ee.FeatureCollection("projects/ee-marcoscardoso/assets/25-11-amostras-IFN");

// Lista de anos para os quais queremos criar as imagens
var anos = ee.List.sequence(1985, 2023);

// Função para criar uma imagem para cada ano
var criarImagemAno = function(ano) {
  // Criar imagem com valor 1, limitada à área de interesse (aoi)
  var imagemConstante = ee.Image(1).clip(aoi);

  // Filtrar as amostras para o ano específico
  var amostrasAno = amostras.filter(ee.Filter.eq('year', ano));
  
  // Criar uma máscara de amostras onde há dados no ano especificado
  var maskAmostras = ee.Image().byte().paint(amostrasAno, 1).clip(aoi);

  // Ajustar a imagem para que onde houver amostras no ano, o valor seja 0
  var imagemFinal = imagemConstante.where(maskAmostras.eq(1), 0);

  // Adicionar metadata com o ano para referência
  return imagemFinal.set('year', ano);
};

// Aplicar a função para cada ano da lista e criar uma coleção de imagens
var colecaoImagens = ee.ImageCollection(anos.map(criarImagemAno));

// Selecionar a imagem do ano de 2004 e recortar para a área de interesse
var anoVisualizar = 2013;  // Altere para o ano desejado
var imagemAnoSelecionado = colecaoImagens.filter(ee.Filter.eq('year', anoVisualizar)).first().clip(aoi);

// Visualizar a imagem do ano selecionado no mapa, recortada para a área de interesse
Map.centerObject(aoi, 5);
Map.addLayer(aoi, {}, 'Área de Interesse');
Map.addLayer(imagemAnoSelecionado, {min: 0, max: 1, palette: ['red', 'green']}, 'Imagem Ano ' + anoVisualizar + ' Recortada');

// Adicionar a camada de pontos das amostras para visualização
var amostrasAnoSelecionado = amostras.filter(ee.Filter.eq('year', anoVisualizar));
Map.addLayer(amostrasAnoSelecionado, {color: 'blue'}, 'Pontos de Amostras ' + anoVisualizar);

// Exportar a imagem para cada ano
anos.getInfo().forEach(function(ano) {
  var imagemAno = colecaoImagens.filter(ee.Filter.eq('year', ano)).first().clip(aoi);
  
    Export.image.toAsset({
    image: imagemAno,
    description: 'GT_SOLO_MC_TARGET_IFN_' + ano,
    assetId: 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/GT_TARGET_IFN/' + ano,
    scale: 30,
    region: aoiBounds,
    maxPixels: 1e13
  });
});