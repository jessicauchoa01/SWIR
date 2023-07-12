var aoi =
  /* color: #98ff00 */
  /* shown: false */
  ee.Geometry.Polygon(
    [
      [
        [-22.873484240784936, 64.12858143904046],
        [-22.873484240784936, 63.7484869456403],
        [-22.000071154847436, 63.7484869456403],
        [-22.000071154847436, 64.12858143904046],
      ],
    ],
    null,
    false
  );

function maskS2clouds(image) {
  var qa = image.select("QA60");

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa
    .bitwiseAnd(cloudBitMask)
    .eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var s2 = ee
  .ImageCollection("COPERNICUS/S2_HARMONIZED")
  .filterDate("2023-07-11", "2023-07-12")
  .filterBounds(aoi)
  .map(maskS2clouds)
  .mean()
  .clip(aoi);

var nhi = s2.normalizedDifference(["B12", "B11"]).rename("NHI");

var style_ndsi = {
  min: 0,
  max: 0.5,
  bands: ["NHI"],
  palette: [
    "141bd7",
    "42b2ff",
    "44ffd3",
    "4cff72",
    "4fff39",
    "fdff15",
    "ffa013",
    "ff1b11",
  ],
};

var visSentinel = {
  min: 0,
  max: 0.3,
  bands: ["B4", "B3", "B2"],
};

var visSwir = {
  min: 0,
  max: 0.3,
  bands: ["B12", "B8A", "B4"],
};

Map.addLayer(s2, visSwir, "SWIR");
Map.addLayer(nhi, style_ndsi, "NHI");
Map.addLayer(s2, visSentinel, "RGB (B4, B3, B2)");
Map.setOptions("SATELLITE");

var leftMap = ui.Map();
var rightMap = ui.Map();

var swir_img = ui.Map.Layer(s2, visSwir, "SWIR");
var nhi_img = ui.Map.Layer(nhi, style_ndsi, "NHI", 0, 0.8);
var rgb_img = ui.Map.Layer(s2, visSentinel);

var nhi_layer = rightMap.layers();
var rgb_layer = leftMap.layers();

nhi_layer.add(swir_img);
nhi_layer.add(nhi_img);
rgb_layer.add(rgb_img);

var nhi_label = ui.Label("SWIR 2023-07-11");
nhi_label.style().set("position", "bottom-right");

var rgb_label = ui.Label("RGB 2023-07-11");
rgb_label.style().set("position", "bottom-left");

leftMap.add(rgb_label);
rightMap.add(nhi_label);
leftMap.add(createLegend());
rightMap.add(createLegend());

function createLegend() {
  var vis = {
    min: 0,
    max: 0.5,
    palette: [
      "141bd7",
      "42b2ff",
      "44ffd3",
      "4cff72",
      "4fff39",
      "fdff15",
      "ffa013",
      "ff1b11",
    ],
  };
  var legend = ui.Panel({
    style: {
      position: "bottom-left",
      padding: "8px 15px",
    },
  });

  // Create legend title
  var legendTitle = ui.Label({
    value: "NHI",
    style: {
      fontWeight: "bold",
      fontSize: "18px",
      margin: "0 0 4px 0",
      padding: "0",
    },
  });

  // Add the title to the panel
  legend.add(legendTitle);

  function makeColorBarParams(palette) {
    return {
      bbox: [0, 0, 40, 100],
      dimensions: "30x200",
      format: "png",
      min: 0,
      max: 40,
      palette: palette,
    };
  }

  var thumbnail = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(vis.palette),
    style: { stretch: "horizontal", margin: "0px 8px", maxHeight: "24px" },
  });

  // add the thumbnail to the legend
  legend.add(thumbnail);

  // create text on top of legend
  var panel = ui.Panel({
    widgets: [
      ui.Label(vis.min, { margin: "4px 8px" }),
      ui.Label(vis.max / 2, {
        margin: "4px 8px",
        textAlign: "center",
        stretch: "horizontal",
      }),
      ui.Label(vis.max, { margin: "4px 8px" }),
    ],
    layout: ui.Panel.Layout.flow("horizontal"),
  });

  legend.add(panel);
  return legend;
}

var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: "horizontal",
  wipe: true,
});

ui.root.clear();
ui.root.add(splitPanel);

var linkPanel = ui.Map.Linker([leftMap, rightMap]);

leftMap.setCenter(-22.1841, 63.9176, 12);
