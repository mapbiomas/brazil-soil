var geometry = /* color: #d63000 */ee.Geometry.Polygon(
  [[[-74.82065800124552, 6.564737824080168],
    [-74.82065800124552, -34.53508159991365],
    [-22.437845501245523, -34.53508159991365],
    [-22.437845501245523, 6.564737824080168]]], null, false);
/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Covariáveis de entrada no modelo de predição dos estoques de carbono no solo

Data: 2023-09-11
Autores: Wallace Silva, Bárbara Costa, Taciara Horst, David Oliveria Pontes

Contato: wallace.silva@ipam.org.br
*/

 
var version = 'v1'; // Carregando a imagem de classificação da coleção 8 do MapBiomas com a versão 'v1'
var classification = 'projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1';
var lulc = ee.Image(classification);
// print(lulc)
// Map.addLayer(lulc) 

// Lista com objetos pensada para o processamento da idade de classes e/ou conjuntos de classes de uso e cobertura, com os dados MapBiomas
var startings = [
  {
    // O nome da banda de saída. é necessario que não contenha espaços ou caracteres especiais
    band:'formacaoFlorestal',
    // Os valores de pixel que deseja mapear na classificação de entrada: valor da legenda do MapBiomas col8
    value:[3], 
    // O valor simulado para o ano imediatamente anterior ao inicio da série. No caso de por 19, o primeiro ano da série inicia com 20
    starting:ee.Image(19),
  },
  { // Formação Savânica [4]
    band:'formacaoSavanica',
    value:[4],
    starting:ee.Image(19),
  },
  { // Campo Alagado e Área Pantanosa [11], Apicum [32]
    band:'campoAlagado-areaPantanosa',
    value:[11,32],
    starting:ee.Image(19),
  },
  { // Formacão campestre [12] e outras formações não florestais [13]
    band:'formacaoCampestre',
    value:[12, 13],
    starting:ee.Image(19),
  },
  { // Pastagem [15]
    band:'pastagem',
    value:[15],
    starting:ee.Image(19),
  },
  { // Lavouras Temp: Soja [39], Cana [20], Arroz[40], Outras Lavouras Temporárias [41], Café [46], Citrus [47], Outras Lavouras Perenes [48], Algodão[62], Dendê[35]
    band:'lavouras',
    value:[39,20,40,41,46,47,48,62,35],
    starting:ee.Image(19),
  },
  { // Silvicultura [9]
    band:'silvicultura',
    value:[9],
    starting:ee.Image(19),
  },
  { // Mosaico de Usos [21]
    band:'mosaicoDeUsos',
    value:[21],
    starting:ee.Image(19),
  },
  {  
    // FUNDIR: Restinga Arbórea [49], Restinga Herbácea [50]) 
    band:'restingas',
    value:[49, 50],
    starting:ee.Image(19),
  },
  {  
    // FUNDIR: Mangue [5] e Floresta Alagável [6]
    band:'outrasFormacoesFlorestais',
    value:[5,6],
    starting:ee.Image(19),
  },
  
  {
    // conjunto de classes naturais
    band:'natural',
    value:[3,4,5,6,49,11,12,32,29,20,13],
    starting:ee.Image(19),
  },
  {
    // conjunto de classes antropicas
    band:'antropico',
    value:[15,18,19,39,20,40,62,41,36,46,47,35,48,9,21],
    starting:ee.Image(19),
  },
];

print('startings',startings);

startings.forEach(function(obj){
  // Iterando através do objeto 'startings', que contém informações sobre as bandas de início
  
  var image_band = lulc.bandNames()
    .iterate(function(current,previous){
      // Iterando pelas bandas da imagem LULC
      
      var bandName = ee.String(current);
      
      // Extraindo o ano da banda
      var year = ee.Number.parse(bandName.slice(-4)).int();
      var yearPrev = year.subtract(1);
      
      // Criando uma máscara para a banda LULC do ano atual
      var lulc_band_year = lulc
        .select(bandName)
        .eq(obj.value)
        .reduce('max')
        .gte(1);
      
      // Selecionando a imagem do ano anterior correspondente
      var image = ee.Image(previous)
        .select(ee.String(obj.band).cat('_').cat(yearPrev));
      
      // Combinando a imagem do ano anterior com a máscara da banda LULC
      image = ee.ImageCollection([image.rename('a'),lulc_band_year.rename('a')]).sum();
      
      // Criando uma máscara para o blend da banda LULC
      var blend = lulc_band_year.updateMask(lulc_band_year.eq(0));
      
      // Aplicando o blend à imagem
      image = image.blend(blend).byte();
      
      // Adicionando a nova banda à imagem anterior
      return ee.Image(previous)
        .addBands(image.rename(ee.String(obj.band).cat('_').cat(year)));
        
    },obj.starting.rename(ee.String(obj.band).cat('_1984')).byte());
  
  // Imprimindo as bandas da imagem
  // print(image_band)
  
  // Criando uma nova imagem a partir das bandas selecionadas
  var img =  ee.Image(image_band).slice(1)
    .set({
      'index':obj.band,
      'create-data':ee.Date(Date.now()),
      'modeled_with':classification,
      'source':'GT Solos'
    });
    
  print(obj.band,img);
  Map.addLayer(img,{},obj.band);
    
  // Especificando a pasta onde os assets serão armazenados
  var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/AGE_LULC_COL8_DUMMY_'+version+'/';
  
  // Exportando a imagem para o Google Earth Engine Assets
  Export.image.toAsset({
      image: img,
      description:'age-lulc-'+obj.band,
      assetId: output+obj.band,
      pyramidingPolicy: 'mode',
      // dimensions:,
      region: geometry,
      scale: 30,
      // crs:,
      // crsTransform:,
      maxPixels: 1e11,
      // shardSize:
  });
});