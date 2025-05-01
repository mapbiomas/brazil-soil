/* 
PROJETO MAPBIOMAS - Solo | GT Solos - Pacote de Trabalho: Mapeamento Espaço-Temporal de Propriedades do Solo
Dataset Dummies-koppen *
Asset com a classificação climatica de koppen

Atualização: Preenchimento de pixels vazios.

Data: 2024-08-12
Autores: Wallace Silva, Taciara Horst, Marcos Cardoso e David Pontes

Contato: contato@mapbiomas.com
Referencia https://docs.google.com/spreadsheets/d/1RlkNoJYCipVo7eJ9Fo56YjleiBmae2NYTFaeie4Q4XM/edit#gid=0
*/

// Carrega uma imagem que contém informações climáticas na projeção de Köppen.
var koppen = ee.Image('projects/mapbiomas-solos-workspace/assets/covariates/climate/IPEF_koppen_30m');

// Define uma paleta de cores para exibir as classes da imagem de Köppen.
var palette = [
  "8FEE94","0A5DE1","183B95","C8EC4D","68C862","CDCD31","FAEF3C","73EB31","F8A62F","93E6FD","376E2B","0C9BFB"
];

// Adiciona a imagem de Köppen ao mapa com a paleta de cores definida e define os valores mínimo e máximo para visualização.
Map.addLayer(koppen,{palette:palette,min:1,max:12},'koppen',true);

// Centraliza o mapa na imagem de Köppen.
Map.centerObject(koppen);

// interface
var panel = ui.Panel({
  widgets:[],
  layout:ui.Panel.Layout.flow('vertical'),
  style:{
    margin:'0px',
    position:'bottom-left'
  }
});

// Adiciona o painel de interface ao mapa.
Map.add(panel);

// Define um dicionário que mapeia os códigos de classe de Köppen para valores e cores correspondentes.
  // É criado uma lista com as diferentes classes do sistema de classificação de Köppen, cada uma com seu valor e cor associados.

var dictionary = {
 "Cwa":{
   value:1,
   color:"8FEE94",
   
 },
 "Am":{
   value:2,
   color:"0A5DE1",
   
 },
 "Af":{
   value:3,
   color:"183B95",
   
 },
 "Cfa":{
   value:4,
   color:"C8EC4D",
   
 },
 "Cwb":{
   value:5,
   color:"68C862",
   
 },
 "Csb":{
   value:6,
   color:"CDCD31",
   
 },
 "Csa":{
   value:7,
   color:"FAEF3C",
   
 },
 "Cfb":{
   value:8,
   color:"73EB31",
   
 },
 "BSh":{
   value:9,
   color:"F8A62F",
   
 },
 "As":{
   value:10,
   color:"93E6FD",
   
 },
 "Cwc":{
   value:11,
   color:"376E2B",
   
 },
 "Aw":{
   value:12,
   color:"0C9BFB",
   
 }
};

// Define três níveis de agrupamento das classes de Köppen com base em características climáticas.
  // Cada objeto neste array representa um nível de agrupamento.
var levels = [
    {
      name:'lv1',
      classes:[
        {
          name:'Tropical',
          classe:[3,2,10,12],
        },
        {
          name:'Dry_season',
          classe:[9],
        },
        {
          name:'Humid_subtropical_zone',
          classe:[4,8,7,6,1,5,11]
        },
      ]
    },
    {
      name:'lv2',
      classes:[
        {
          name:'without_dry_season',
          classe:[3],
        },
        {
          name:'monsoon',
          classe:[2],
        },
        {
          name:'with_dry_summer',
          classe:[10],
        },
        {
          name:'tropical_with_dry_winter',
          classe:[12],
        },
        {
          name:'semiarid',
          classe:[9],
        },
        {
          name:'oceanic_climate_without_sry_season',
          classe:[4,8,7,6],
        },
        {
          name:'temperate_with_dry_winter',
          classe:[1,5,11],
        },
      ]
    },
    {
      name:'lv3',
      classes:[
        {
          name:'low_latitude_and_altitude',
          classe:[9],
        },
        {
          name:'with_hot_summer',
          classe:[4],
        },
        {
          name:'with_temperate_summer',
          classe:[8],
        },
        {
          name:'and_hot',
          classe:[7],
        },
        {
          name:'and_temperate',
          classe:[6],
        },
        {
          name:'and_hot_summer',
          classe:[1],
        },
        {
          name:'and_temperate_summer',
          classe:[5],
        },
        {
          name:'and_short_and_cool_summer',
          classe:[11],
        },
      ]
    },
  ];
 
// Itera sobre os níveis de agrupamento.
  // Cria uma imagem vazia para armazenar as classes de Köppen para o nível atual.
levels.forEach(function(object){

// Cria uma imagem vazia para armazenar as classes de Köppen para o nível atual.
  var recipe = ee.Image().select();
    // Gera uma máscara para a classe de Köppen atual.
  object.classes.forEach(function(obj){
    // print( object.name + '  ' + obj.name + ' ' + obj.classe);
  
    // Gera uma máscara para a classe de Köppen atual.
    var dummy = koppen
      .eq(obj.classe)
      .reduce('max')
      .gte(1)
      .rename(object.name + '_' + obj.name);
 
   // Adiciona a máscara à imagem vazia.
    recipe = recipe.addBands(dummy);

  });

// Define o local de armazenamento e outras informações para a imagem resultante.
  var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_KOPPEN_30M_DUMMY_v1/';
  var description = object.name;

// Define metadados para a imagem resultante.
  recipe = recipe.set({
    'index':description,
    'version':'v1',
    'date_create':ee.Date(Date.now()).format('y-M-d'),
    'theme':'GT-Solos',
    });
  
  print(object.name,recipe);

// Adiciona a imagem resultante ao mapa.
  Map.addLayer(recipe,{},object.name);
  Map.addLayer(koppen.geometry(),{},'bounds');


  var params = {
    radius:1000,
    // kernelType:,
    units:'meters',
    // iterations:,
    // kernel:
  };
  
  var interpolation = recipe
    .focalMax(params) 
    .focalMax(params)
    .focalMax(params)
    .unmask(0);
  
  // Map.addLayer(image.select(0),{min:160,max:655},'image');
  
  recipe = interpolation.blend(recipe);
  print(recipe);
  
  Map.addLayer(recipe,{min: 0, max:1},'focalMax');


// Exporta a imagem resultante como um ativo no Google Earth Engine.
  Export.image.toAsset({
    image:recipe,
    description:description,
    assetId:output + description,
    pyramidingPolicy:'mode',
    // dimensions:,
    region:koppen.geometry(),
    scale:30,
    // crs:, crsTransform, 
    maxPixels:1e11,
    // shardSize
  });
  
});
