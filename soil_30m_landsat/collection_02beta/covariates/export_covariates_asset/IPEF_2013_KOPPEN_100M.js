/*
 * Dataset: Koppen Climate Classification
 * 
 * Authors:
 * - Wallace Silva
 * - Barbara Silva
 * - Taciara Horst
 * - Marcos Cardoso
 * - David Pontes
 * 
 * Changes:
 * - 2022-06-01 (Wallace, Barbara): Generating dummy variables for Koppen climate classification
 * - 2024-08-12 (Marcos, David) Filling empty pixels with interpolation
 * - 2025-25-04 (Taciara): Renaming classes
 * 
 * Contact: contato@mapbiomas.org
 * 
 * MapBiomas Soil
 */

var koppen = ee.Image('projects/mapbiomas-solos-workspace/assets/covariates/climate/IPEF_koppen_30m');

var palette = [
  "8FEE94","0A5DE1","183B95","C8EC4D","68C862","CDCD31","FAEF3C","73EB31","F8A62F","93E6FD","376E2B","0C9BFB"
];


Map.addLayer(koppen,{palette:palette,min:1,max:12},'koppen',true);

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

Map.add(panel);

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

var levels = [
    {
      //name:'lv1',
      name:'koppen_l1',
      classes:[
        {
          //name:'Tropical',
          name:'A',
          classe:[3,2,10,12],
        },
        {
          //name:'Dry_season',
          name:'B',
          classe:[9],
        },
        {
          //name:'Humid_subtropical_zone',
          name:'C',
          classe:[4,8,7,6,1,5,11]
        },
      ]
    },
    {
      //name:'lv2',
      name:'koppen_l2',
      classes:[
        {
          //name:'without_dry_season',
          name:'Af',
          classe:[3],
        },
        {
          //name:'monsoon',
          name:'Am',
          classe:[2],
        },
        {
          //name:'with_dry_summer',
          name:'As',
          classe:[10],
        },
        {
          //name:'with_dry_winter',
          name:'Aw',
          classe:[12], 
        },
        {
          //name:'semiarid',
          name:'Bs',
          classe:[9],
        },
        {
          //name:'oceanic_climate_without_sry_season',
          name:'koppen_Cf',
          classe:[4,8],
        },
                {
          //name:'with_dry_summer',
          name:'Cs',
          classe:[7,6],
        },
        {
          //name:'with_dry_winter',
          name:'Cw',
          classe:[1,5,11],
        },
      ]
    },
    {
      //name:'lv3',
      name:'koppen_l3',
      classes:[
        {
          //name:'low_latitude_and_altitude',
          name:'Bsh',
          classe:[9],
        },
        {
          //name:'with_hot_summer',
          name:'Cfa',
          classe:[4],
        },
        {
          //name:'with_temperate_summer',
          name:'Cfb',
          classe:[8],
        },
        {
          //name:'and_hot',
          name:'Csa',
          classe:[7],
        },
        {
          //name:'and_temperate',
          name:'Csb',
          classe:[6],
        },
        {
          //name:'and_hot_summer',
          name:'Cwa',
          classe:[1],
        },
        {
          //name:'and_temperate_summer',
          name:'Cwb',
          classe:[5],
        },
        {
          //name:'and_short_and_cool_summer',
          name:'Cwc',
          classe:[11],
        },
      ]
    },
  ];

levels.forEach(function(object){
  
  var recipe = ee.Image().select();
  
  object.classes.forEach(function(obj){
    // print( object.name + '  ' + obj.name + ' ' + obj.classe);
    
    var dummy = koppen
      .eq(obj.classe)
      .reduce('max')
      .gte(1)
      .rename(object.name + '_' + obj.name);
      
    recipe = recipe.addBands(dummy);

  });

  var output = 'projects/mapbiomas-workspace/SOLOS/COVARIAVEIS/IPEF_2013_KOPPEN_100M/';
  var description = object.name;

  
  recipe = recipe.set({
    'index':description,
    'version':'v1',
    'date_create':ee.Date(Date.now()).format('y-M-d'),
    'theme':'GT-Solos',
    });
  
  print(object.name,recipe);
  
  Map.addLayer(recipe,{},object.name);
  Map.addLayer(koppen.geometry(),{},'bounds');
  
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
