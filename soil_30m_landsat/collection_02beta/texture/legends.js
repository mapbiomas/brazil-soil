var bounds_triangulo_1 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-30.623456905420554, 9.732292997130518],
          [-30.623456905420554, -3.753035788055867],
          [-15.330488155420555, -3.753035788055867],
          [-15.330488155420555, 9.732292997130518]]], null, false),
    bounds_triangulo_2 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-29.920331905420554, -21.676359828631696],
          [-29.920331905420554, -33.6315821151207],
          [-14.627363155420555, -33.6315821151207],
          [-14.627363155420555, -21.676359828631696]]], null, false),
    bounds_triangulo_3 = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-30.271894405420554, -6.029717831697614],
          [-30.271894405420554, -19.205915943391354],
          [-14.978925655420555, -19.205915943391354],
          [-14.978925655420555, -6.029717831697614]]], null, false);
// 1.Grupamentos texturais (Legenda 1) 
// Function to classify soil texture based on predefined rules7
// MIN:0, MAX:5
function l1_grupamentos_texturais(image) {
  return image.expression(
    // 1 - Very clayey
'(clay >= 60) ? 1 : ' + //1. Muito Argilosa
       '((clay >= 35) && (clay < 60)) ? 2 : ' + //2. Argilosa
       '((silt >= 50) && (sand < 15) && (clay < 35)) ? 3 : ' + //3. Siltosa
       '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 4 : ' + 
       '((clay < 30) && (sand >= (85 + (clay - 1))) && (silt < 18)) ? 4: ' + //4. Arenosa
       '((clay < 40) && (sand >= 15) && (sand < (85 + (clay - 1))) && (silt <= 85)) ? 5 : ' + //5. Média
       '0',
    {sand:image.select('sand'),silt:image.select('silt'),clay:image.select('clay')}
  ).updateMask(image.select(0));
}
// 2. Sub-grupamentos texturais  (Legenda 2)
// Function to classify soil texture based on predefined rules
// MIN:0, MAX:8
function l2_subgrupamentos_texturais(image) {
  return image.expression(
    // 1 - Muito argilosa
       '(clay >= 60) ? 1 : ' + //1. Muito Argilosa
    //2. Argilosa       
       '((clay >= 35) && (clay < 60)) ? 2 : ' + //2. Argilosa
     //3. Média argilosa       
       '(((clay >= 20 && clay < 28) && (silt >= 20 && silt < 30) && (sand >= 45 && sand < 50)) || ' +
       '((clay >= 28 && clay < 35) && (silt >= 15 && silt < 30) && (sand >= 45 && sand < 50)) || ' +
       '((clay >= 20 && clay < 35) && (silt <= 30) && (sand >= 50))) ? 3 : ' + //3. Média argilosa
  //4. Siltosa     
       '((silt >= 50) && (sand < 15) && (clay < 35)) ? 4 : ' + //4. Siltosa
  //5. Média siltosa      
       '((sand >= 15 && sand <= 50) && (clay < 35) && (silt >= 30 && silt < 85)) ||' +
       '((clay > 24 && clay < 35) && (sand > 35 && sand < 46) && (silt > 18 && silt < 30))? 5 : ' + //5. Média siltosa
   //6. Média arenosa    
       '((sand >= 50 && sand < 70) && (clay <= 20) && (silt <= 50)) || '+
       '((sand <= (70 + (clay))) && (clay <= 30) && (silt < 30)) ? 6 : ' + //6. Média arenosa
   //7. Arenosa (ou arenosa média)    
       '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 7 : ' + //7. Arenosa (ou arenosa média)
    //8. Muito arenosa
       '((clay < 15) && (sand >= (85 + (clay - 1))) && (silt < 20)) ? 8 : ' + //8. Muito arenosa
       '0',
    {sand:image.select('sand'),silt:image.select('silt'),clay:image.select('clay')}
  ).updateMask(image.select(0));
}
// 3. Classes texturais (Legenda 3)
// Function to classify soil texture based on predefined rules
// MIN:0, MAX:12
function l3_classes_texturais(image) {
  return image.expression(
      //1. Muito Argilosa
        '(sand >= 0 && sand <= 40 && silt >= 0 && silt <= 40 && clay >= 60 && clay <= 100) ? 1 : ' + //1. Muito Argilosa
        '(sand >=  0 && sand <= 20 && silt >= 20 && silt <= 40 && clay >= 40 && clay < 60) ? 2 : ' +
       //2. Argilosa
        '(sand >= 20 && sand <= 45 && silt >= 0 && silt <= 40 && clay >= 40 && clay < 60) ? 2 : ' +  //2. Argilosa 
       //3. Argilo siltosa 
        '(sand >=  0 && sand < 20 && silt >= 40 && silt <= 60 && clay >= 40 && clay <= 60) ? 3 : ' +  //3. Argilo siltosa
      //4. Franco argilosa
        '((sand >= 20 && sand <= 45) && (silt >= 15 && silt <= 53) && (clay >= 27 && clay < 40)) ? 4 : ' + //4. Franco argilosa
       //5. Franco argilo siltosa   
        '(sand >= 0 && sand <= 20 && silt >= 40 && silt < 73 && clay >= 27 && clay <= 40) ? 5 : ' +  //5. Franco argilo siltosa   
        
      //6. Argilo arenosa
        '(sand >= 45 && sand < 65 && silt >= 0 && silt < 20 && clay >= 35 && clay <= 55) ? 6 : ' +    //6. Argilo arenosa
       //7. Franco argilo arenosa 
        '(sand >= 40 && sand <= 50 && silt >= 10 && silt < 28 && clay >= 20 && clay <= 35) ? 7 : ' +   
        '(sand >= 50 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 35) ? 7 : ' +
        '(sand >= 40 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 25) ? 7 : ' +
        '(sand >= 40 && sand <= 80 && silt >=  0 && silt < 28 && clay >= 20 && clay < 35) ? 7 : ' +   
        '(sand >= 45 && sand <= 55 && silt >= 10 && silt < 28 && clay >= 25 && clay < 35) ? 7 : ' +     
        '(sand >= 44 && sand <= 57 && silt >= 25 && silt < 28 && clay >= 20 && clay < 30) ? 7 : ' +      
        '(sand >= 44 && sand <= 50 && silt >= 15 && silt < 28 && clay >= 28 && clay < 26) ? 7 : ' +  //7. Franco argilo arenosa    
        //8. Franca 
        '(sand >= 22 && sand <= 52 && silt >= 28 && silt <= 50 && clay >= 5 && clay < 27) ? 8 : ' +   //8. Franca    
        '((sand >= 50 && sand < 70) && (clay < 20) && (silt < 50)) || ' + 
        '((sand <= (70 + (clay))) && (clay < 30) && (silt < 30)) ? 9 : ' + 
        //9. Franco arenoso
        '(sand >= 45 && sand <= 58 && silt >= 42 && silt < 50 && clay >=  0 && clay <  5) ? 9 : ' + //9. Franco arenoso
        //10. Areia
        '((sand >= (70 + (clay))) && (sand <= (85 + (clay - 1))) && (clay < 30) && (silt < 30)) ? 10 : ' + //10. Areia 
        //11. Areia franca
        '((clay < 15) && (sand >= (85 + (clay - 3))) && (silt < 20)) ? 11: ' + //11. Areia franca
        //12. Silte
        '(sand >= 0 && sand < 20 && silt >= 80 && silt <= 100 && clay >= 0 && clay < 10) ? 12 : ' + 
        '(sand >= 0 && sand < 10 && silt >= 80 && silt <= 100 && clay >= 0 && clay < 10) ? 12 : ' + //12. Silte
        
        //13. Franco Siltosa
        '(sand >= 0 && sand < 50 && silt >= 50 && silt <= 100 && clay >= 0 && clay < 27) ? 13 : ' + 
        '(sand >= 0 && sand < 20 && silt >= 53 && silt <= 80 && clay >=  0 && clay < 27) ? 13 : ' + 
        '(sand >= 0 && sand < 10 && silt >= 60 && silt <= 90 && clay >= 10 && clay < 27) ? 13 : ' + //13. Franco Siltosa   
        '0',
// Default (unclassified)
    {sand:image.select('sand'),silt:image.select('silt'),clay:image.select('clay')}
  ).updateMask(image.select(0));
}

// Importando as camadas de granulometria (areia, argila e silte) para 0-30 cm

var sand = ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_sand_percent').select('sand_000_030cm');
var clay = ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_clay_percent').select('clay_000_030cm');
var silt = ee.Image('projects/mapbiomas-workspace/SOLOS/PRODUTOS_C02/mapbiomas_soil_collection2_silt_percent').select('silt_000_030cm');

// Combinação das frações em uma única imagem para a camada 0-30 cm
var soilFractions_0_30cm = sand.select('sand_000_030cm')
  .addBands(silt  .select('silt_000_030cm'))
  .addBands(clay  .select('clay_000_030cm'))
  .rename(['sand', 'silt', 'clay'])

// Sum the soil fractions (sand, silt, and clay)
var totalSoilFractions = soilFractions_0_30cm.reduce(ee.Reducer.sum());

// Subtract the total sum from 100 to get the remaining fraction
var remainingFraction = ee.Image(100).subtract(totalSoilFractions);
print('Remaining Fraction:', remainingFraction);


Map.addLayer(totalSoilFractions, {
  min: 0,
  max:  100,
  palette: ['blue', 'green', 'red']
}, 'Remaining Fraction');


Map.addLayer(sand, {
  min: 0,
  max:  100,
  palette: ['blue', 'green', 'red']
}, 'sand');

Map.addLayer(silt, {
  min: 0,
  max:  100,
  palette: ['blue', 'green', 'red']
}, 'silt');


Map.addLayer(clay, {
  min: 0,
  max:  100,
  palette: ['blue', 'green', 'red']
}, 'clay');

// Define a color palette for soil texture classes

var palette_l1 = [
  'red', // 0 - não observado 000000
  '#a83800', // 1 - Very clayey
  '#aa8686', // 2 - Clay
  '#35978f', // 3 - Silty 
  '#fffe73', // 4 - Sandy
  '#d7c5a5'  // 5 - Medium
];

var palette_l2 = [
  'red', // 0 - não observado
  '#a83800', // 1 = Muito argilosa
  '#aa8686', // 2 = Argilosa
  '#f4a582', // 3 = Média-argilosa 
  '#35978f', // 4 = Siltosa  
  '#d7c5a5', // 5 = Média-siltosa
  '#F8D488', // 6 = Média-arenosa
  '#E4B074', // 7 = Arenosa-média
  '#fffe73'  // 8 = Muito-arenosa
];

var palette_l3 = [
  'red', // 0 - não observado
  "#a83800", // 1 - Muito Argilosa
  "#aa8686", // 2 - Argilosa
  "#3481a7", // 3 - Argilo Siltosa 
  "#e9a9a9", // 4 - Franco Argilosa
  "#80b1d3", // 5 - Silty Clay Loam 
  "#c994c7", // 6 - Argilo Arenosa  
  "#f4a582", // 7 - Franco Argilo Arenosa
  "#d7c5a5", // 8 - Loam   
  "#F8D488", // 9 - Sandy Loam
  "#E4B074", // 10 - Franco arenoso
  "#fffe73", // 11 - Sand
  "#35978f", // 12 - Silte
  "#ABBA7C" // 13 - Franco siltoso 

];
var legenda_l1 = {
  0:'0 - não observado',
  1:'1 - Very clayey',
  2:'2 - Clay',
  3:'3 - Silty',
  4:'4 - Sandy',
  5:'5 - Medium',
};

var legenda_l2 = {
  0: '0 - não observado',
  1: '1 - Muito argilosa',
  2: '2 - Argilosa',
  3: '3 - Média-argilosa',
  4: '4 - Siltosa',
  5: '5 - Média-siltosa',
  6: '6 - Média-arenosa',
  7: '7 - Arenosa-média',
  8: '8 - Muito-arenosa',
};

var legenda_l3 = {
  0: '0 - não observado',
  1: '1 - Heavy Clay',
  2: '2 - Clay',
  3: '3 - Silty Clay',
  4: '4 - Clay Loam',
  5: '5 - Silty Clay Loam ',
  6: '6 - Sandy Clay ',
  7: '7 - Sandy Clay Loam',
  8: '8 - Loam',
  9: '9 - Sandy Loam',
  10: '10 - Loamy Sand',
  11: '11 - Sand',
  12: '12 - Silt Loam',
  13: '13 - Silt'
};


var visParams = {
  l1:{min:0,max:5,palette:palette_l1}, //5
  l2:{min:0,max:8,palette:palette_l2}, //8
  l3:{min:0,max:13,palette:palette_l3}, //13
  sand:{min:0,max:100,bands:['sand']},
  silt:{min:0,max:100,bands:['silt']},
  clay:{min:0,max:100,bands:['clay']},
  rgb:{min:0,max:100,bands:['sand','silt','clay']},
}

Map.addLayer(soilFractions_0_30cm,visParams.rgb,'soilFractions_0_30cm');

var soilFraction_l1_grupamentos_texturais = l1_grupamentos_texturais(soilFractions_0_30cm);
Map.addLayer(soilFraction_l1_grupamentos_texturais,visParams.l1,'l1_grupamentos_texturais')
var soilFraction_l2_subgrupamentos_texturais = l2_subgrupamentos_texturais(soilFractions_0_30cm);
Map.addLayer(soilFraction_l2_subgrupamentos_texturais,visParams.l2,'l2_subgrupamentos_texturais')
var soilFraction_l3_classes_texturais = l3_classes_texturais(soilFractions_0_30cm);
Map.addLayer(soilFraction_l3_classes_texturais,visParams.l3,'l3_classes_texturais')




function createTextureTriangleMap(optionalBounds, optionalHighlight, optionalImage) {
  // Define default bounds if none are provided (centered around the equator)
  var defaultBounds = ee.Geometry.Polygon([[[-10, -10], [10, -10], [10, 10], [-10, 10], [-10, -10]]], null, false);
  
  // Use the provided bounds or default bounds
  var triangleBounds = optionalBounds !== undefined ? optionalBounds : defaultBounds;
  
  // Calculate the bounding box of the triangleBounds
  var bounds = triangleBounds.bounds();

  // Extract the coordinates of the bounding box
  var coordinates = ee.List(bounds.coordinates().get(0));
  
  // Extract X and Y coordinates
  var xs = coordinates.map(function(coord) {
    return ee.Number(ee.List(coord).get(0));
  });
  
  var ys = coordinates.map(function(coord) {
    return ee.Number(ee.List(coord).get(1));
  });
  
  // Calculate min and max of X and Y
  var minX = ee.Number(xs.reduce(ee.Reducer.min()));
  var maxX = ee.Number(xs.reduce(ee.Reducer.max()));
  var minY = ee.Number(ys.reduce(ee.Reducer.min()));
  var maxY = ee.Number(ys.reduce(ee.Reducer.max()));
  // Define the bottom vertices (left and right)
  var vertex1 = ee.List([minX, minY]); // Bottom left vertex
  var vertex2 = ee.List([maxX, minY]); // Bottom right vertex

  // Define the top vertex as the midpoint of the top edge
  var midX = minX.add(maxX).divide(2);
  var vertex3 = ee.List([midX, maxY]); // Top vertex (midpoint of top edge)

  // Create an image with longitude and latitude bands
  var lonLatImage = ee.Image.pixelLonLat().rename(['lon', 'lat']);
  
  // Calculate barycentric coordinates
  var denom = ee.Image.constant(
    (vertex2.getNumber(1).subtract(vertex3.getNumber(1))).multiply(vertex1.getNumber(0).subtract(vertex3.getNumber(0)))
    .add(
      vertex3.getNumber(0).subtract(vertex2.getNumber(0)).multiply(vertex1.getNumber(1).subtract(vertex3.getNumber(1)))
    )
  );
  
  var alphaNumerator = ee.Image.constant(vertex2.getNumber(1).subtract(vertex3.getNumber(1)))
    .multiply(lonLatImage.select('lon').subtract(vertex3.getNumber(0)))
    .add(
      ee.Image.constant(vertex3.getNumber(0).subtract(vertex2.getNumber(0)))
      .multiply(lonLatImage.select('lat').subtract(vertex3.getNumber(1)))
    );
  
  var betaNumerator = ee.Image.constant(vertex3.getNumber(1).subtract(vertex1.getNumber(1)))
    .multiply(lonLatImage.select('lon').subtract(vertex3.getNumber(0)))
    .add(
      ee.Image.constant(vertex1.getNumber(0).subtract(vertex3.getNumber(0)))
      .multiply(lonLatImage.select('lat').subtract(vertex3.getNumber(1)))
    );
  
  // Barycentric coordinates alpha, beta, gamma
  var alpha = alphaNumerator.divide(denom);
  var beta = betaNumerator.divide(denom);
  var gamma = ee.Image.constant(1).subtract(alpha).subtract(beta);
  
  // Multiply the barycentric coordinates by 100 to get percentages
  var percentage1 = alpha.multiply(100).rename('sand');
  var percentage2 = beta.multiply(100).rename('silt');
  var percentage3 = gamma.multiply(100).rename('clay');
  
  // Create a mask to ensure percentages are between 0 and 100
  var triangleMask = percentage1.gte(0).and(percentage1.lte(100))
    .and(percentage2.gte(0)).and(percentage2.lte(100))
    .and(percentage3.gte(0)).and(percentage3.lte(100));
  
  // Combine the three percentages into an RGB image
  var triangleImage = percentage1.addBands([percentage2, percentage3])
    .updateMask(triangleMask)
    .clip(triangleBounds);
  
  // Initialize the return list with the triangle image
  var resultList = [triangleImage];
  
  // If an optional highlight point is provided, calculate its position in the triangle
  if (optionalHighlight) {
    // Extract the percentages at the highlight point from the input image
    var sample = optionalImage.sample({
      region: optionalHighlight,
      scale: 30,
      numPixels: 1,
      geometries: true
    });
    
    // Get the first sample (if any)
    var sampledData = sample.first();

    // Check if sample data is available
    if (sampledData !== null) {
      var percentages = ee.List([
        sampledData.get('sand'),
        sampledData.get('silt'),
        sampledData.get('clay')
      ]);
      
      print('percentages',percentages);
      // Normalize percentages to fractions that sum to 1
      var total = percentages.reduce(ee.Reducer.sum());

      var fractions = percentages.map(function(pct) {
        return ee.Number(pct).divide(total);
      });
      
      // Calculate the x and y coordinates within the triangle
      var x = ee.Number(fractions.get(0)).multiply(vertex1.getNumber(0))
        .add(ee.Number(fractions.get(1)).multiply(vertex2.getNumber(0)))
        .add(ee.Number(fractions.get(2)).multiply(vertex3.getNumber(0)));
      
      var y = ee.Number(fractions.get(0)).multiply(vertex1.getNumber(1))
        .add(ee.Number(fractions.get(1)).multiply(vertex2.getNumber(1)))
        .add(ee.Number(fractions.get(2)).multiply(vertex3.getNumber(1)));
      
      var pointInTriangle = ee.Geometry.Point([x, y]);
      
      // Add the point to the result list
      resultList.push(pointInTriangle);
    }
  }
  
  // Return the list containing the triangle image and optionally the highlight point
  return resultList;
}

var triangulo_1 = createTextureTriangleMap(bounds_triangulo_1);
var triangulo_1_classificado = l1_grupamentos_texturais(triangulo_1[0]);
Map.addLayer(triangulo_1_classificado,visParams.l1,'triangulo_1_classificado')
var triangulo_2 = createTextureTriangleMap(bounds_triangulo_2);
var triangulo_2_classificado = l2_subgrupamentos_texturais(triangulo_2[0]);
Map.addLayer(triangulo_2_classificado,visParams.l2,'triangulo_2_classificado')
var triangulo_3 = createTextureTriangleMap(bounds_triangulo_3);
var triangulo_3_classificado = l3_classes_texturais(triangulo_3[0]);
Map.addLayer(triangulo_3_classificado,visParams.l3,'triangulo_3_classificado')


// Function to create and add a legend to the map
function addLegend(dict,visParams) {
  var legend = ui.Panel({
    widgets: [
      ui.Label({
        value: 'Textural Classification Legend',
        style: {fontWeight: 'bold', fontSize: '14px', margin: '2px'}
      })
    ],
    style: {position: 'bottom-left', padding: '0px',margin:'0px'}
  });

  // List of class names for the legend

  var palette_legenda = visParams.palette;
  var keys = Object.keys(dict);
  
  keys.forEach(function(i){
    
  // Loop through each class name to create rows in the legend
    var colorBox = ui.Label({
      style: {
        backgroundColor: palette_legenda[i],
        padding: '4px',
        margin: '2px',
        width: '10px',
        height: '5px',
        fontSize:'12px'
      }
    });
    var label = ui.Label(dict[i],{fontSize:'12px',margin:'1px'});
    var row = ui.Panel({
      widgets: [colorBox, label],
      layout: ui.Panel.Layout.Flow('horizontal'),
      style:{margin:'0px'}
    });
    legend.add(row);
  });
  
  // Add the complete legend panel to the map
  Map.add(legend);
}

// Add the legend to the map
addLegend(legenda_l1,visParams.l1);
addLegend(legenda_l2,visParams.l2);
addLegend(legenda_l3,visParams.l3);

///////////////////////////////////////////// função de click map
// Variables to hold the previous point layers
var originalMapPointLayer;
var trianglePointLayer;

// Add the onClick function
Map.onClick(function(coords) {
  // Create a point geometry at the clicked location
  var newPoint = ee.Geometry.Point([coords.lon, coords.lat]);
  
  // Remove the previous point layers if they exist
  if (originalMapPointLayer) {
    Map.layers().remove(originalMapPointLayer);
  }
  if (trianglePointLayer) {
    Map.layers().remove(trianglePointLayer);
  }
  
  // Add the point to the original map
  originalMapPointLayer = ui.Map.Layer(newPoint, {color: 'red'}, 'Clicked Point');
  Map.layers().add(originalMapPointLayer);
  
  // Use the createTextureTriangleMap function to get the corresponding point in the triangle
  var temp_result1 = createTextureTriangleMap(bounds_triangulo_1, newPoint,soilFractions_0_30cm)[1];
  var temp_result2 = createTextureTriangleMap(bounds_triangulo_2, newPoint,soilFractions_0_30cm)[1];
  var temp_result3 = createTextureTriangleMap(bounds_triangulo_3, newPoint,soilFractions_0_30cm)[1];
  // temp_result[1] is the point in the triangle
  var pointInTriangle = ee.FeatureCollection([
    temp_result1,
    temp_result2,
    temp_result3
    ]);

  // If the point in the triangle exists, add it to the map
  if (pointInTriangle) {
    // Remove the previous triangle point layer if it exists
    if (trianglePointLayer) {
      Map.layers().remove(trianglePointLayer);
    }
    
    // Add the point to the triangle image
    trianglePointLayer = ui.Map.Layer(pointInTriangle, {color: 'red'}, 'Point in Triangle');
    Map.layers().add(trianglePointLayer);
  } else {
    print('No data at this location.');
  }
});