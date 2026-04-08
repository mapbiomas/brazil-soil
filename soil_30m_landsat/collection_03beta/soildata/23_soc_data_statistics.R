# title: MapBiomas Soil
# subtitle: 23. SOC Data Statistics
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2025
rm(list = ls())

# Set MapBiomas Soil Collection
collection <- "c3"

# Source helper functions and packages
source("src/00_helper_functions.r")
if (!requireNamespace("rnaturalearth", quietly = TRUE)) {
  install.packages("rnaturalearth", dependencies = TRUE)
}
if (!requireNamespace("prettymapr", quietly = TRUE)) {
  install.packages("prettymapr", dependencies = TRUE)
}

# Read the Brazilian country boundary
brazil_country <- sf::st_read("data/brazil_country.geojson")
print(brazil_country)

# Read the Brazilian biome boundaries
brazil_biomes <- sf::st_read("data/brazil_biomes.geojson")
print(brazil_biomes)

# Read the Brazilian state boundaries
brazil_states <- sf::st_read("data/brazil_states.geojson")
print(brazil_states)

# Load SOC data ####################################################################################
folder_path <- "res/tab/"
file_name <- "soildata_soc_modeling.csv"
# List existing files in the folder_path and get the last one. Then read it.
existing_files <- list.files(path = folder_path, pattern = file_name)
last_file <- existing_files[length(existing_files)]
soildata_soc <- data.table::fread(paste0(folder_path, last_file), na.strings = c("NA", "NaN", ""))
print(soildata_soc)

# Clean columns
# sand-pseudo -> sandpseudo
soildata_soc[, id := sub("-pseudo", "pseudo", id)]
# rock-pseudo -> rockpseudo
soildata_soc[, id := sub("-pseudo", "pseudo", id)]
# dataset_id <- id before the first dash
soildata_soc[, dataset_id := sub("-.*", "", id)]
# observacao_id <- id after the first dash
soildata_soc[, observacao_id := sub(".*-", "", id)]
# Check data
summary_soildata(soildata_soc)
# Layers: 31047
# Events: 16013
# Georeferenced events: 16013
# Datasets: 201

# Figure 1. Histograms of SOC data attributes ######################################################
# This figure will be used in the ATBD document.


# Figure 2. Spatial distribution of samples with SOC data ##########################################
# This figure will be used in the ATBD document and the MapBiomas Soil method page. Versions in
# Portuguese, English, and Spanish are generated.
# Select the first occurrence of each 'id' to avoid overplotting
soildata_soc_sf <- soildata_soc[!duplicated(soildata_soc$id), ]
# Create spatial data
soildata_soc_sf <- sf::st_as_sf(soildata_soc_sf,
  coords = c("coord_x", "coord_y"), crs = 4326, remove = FALSE
)
southamerica <- rnaturalearth::ne_countries(continent = c("south america", "europe"),
  returnclass = "sf", scale = "medium")
southamerica <- southamerica[, "iso_a2"]

# Save figure in Portuguese, English, and Spanish
lang <- c("pt", "en", "es")
main <- list(
  pt = "Amostras para modelagem do estoque de carbono orgânico do solo",
  en = "Samples for modeling soil organic carbon stocks",
  es = "Muestras para modelar el stock decarbono orgánico del suelo"
)
for (i in seq_along(lang)) {
  file_path <- paste0("res/fig/", collection, "_soc_spatial_distribution_", lang[i], ".png")
  png(file_path, width = 480 * 3, height = 480 * 3, res = 72 * 3)
  par(mar = rep(1.9, 4))
  plot(brazil_country,
    reset = FALSE, col = "transparent",
    axes = TRUE, graticule = TRUE, lwd = 0.01,
    main = main[[i]]
  )
  plot(southamerica, reset = FALSE, col = "gray96", add = TRUE, lwd = 0.5)
  plot(brazil_biomes[-7, ]["name_biome"], reset = FALSE,
    main = "", axes = TRUE, col = "#eeece1", lwd = 0.5,
    border = "gray69",
    key.pos = NULL, graticule = TRUE, add = TRUE
  )
  plot(soildata_soc_sf$geometry, add = TRUE, cex = 0.5, col = "firebrick")
  prettymapr::addscalebar(plotunit = "latlon", plotepsg = 4326, pos = "bottomright")
  dev.off()
}

# Figure for Dataverse thumbnail ##################################################################
# Supported image types are JPG, TIF, or PNG and should be no larger than 500 KB.
# The maximum display size for an image file as a dataset thumbnail is 48 pixels wide by 48 pixels
# high.
file_path <- paste0("res/fig/", collection, "_soc_spatial_distribution_brazil_thumbnail.png")
png(file_path, width = 480, height = 480, res = 72)
par(mar = rep(0, 4))
plot(brazil_country,
  reset = FALSE, col = "transparent",
  axes = TRUE, graticule = TRUE, lwd = 0.01,
  main = ""
)
plot(
  brazil_biomes[-7, ]["name_biome"],
  reset = FALSE, main = "", axes = FALSE, col = "#eeece1", lwd = 0.5, border = "gray69",
  key.pos = NULL
)
plot(soildata_soc_sf$geometry, add = TRUE, cex = 0.5, col = "firebrick")
dev.off()
