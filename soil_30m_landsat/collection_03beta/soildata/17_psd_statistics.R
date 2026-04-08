# title: MapBiomas Soil
# subtitle: 17. PSD statistics
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

# Load PSD data ####################################################################################
# Read PSD data processed in the previous script
folder_path <- "res/tab/"
file_name <- "soildata_psd_modeling.csv"
# List existing files in the folder_path and get the last one. Then read it.
existing_files <- list.files(path = folder_path, pattern = file_name)
last_file <- existing_files[length(existing_files)]
soildata_psd <- data.table::fread(paste0(folder_path, last_file), na.strings = c("NA", "NaN", ""))
print(soildata_psd)

# Drop unnecessary rows
# String "clay-copy" in the 'id' column
soildata_psd <- soildata_psd[!grepl("clay-copy", id)]

# Clean columns
# sand-pseudo -> sandpseudo
soildata_psd[, id := sub("-pseudo", "pseudo", id)]
# rock-pseudo -> rockpseudo
soildata_psd[, id := sub("-pseudo", "pseudo", id)]
# dataset_id <- id before the first dash
soildata_psd[, dataset_id := sub("-.*", "", id)]
# observacao_id <- id after the first dash
soildata_psd[, observacao_id := sub(".*-", "", id)]
# latitude -> coord_y
soildata_psd[, coord_y := latitude]
# longitude -> coord_x
soildata_psd[, coord_x := longitude]
summary_soildata(soildata_psd)
# Layers: 57321
# Events: 14942
# Georeferenced events: 14942
# Datasets: 195

# Figure 1. Frequency distribution of particle size components #####################################
# This figure will be used in the ATBD document.
file_path <- paste0("res/fig/", collection, "_psd_adl_ratio_histogram.png")
png(file_path, width = 480 * 4, height = 480 * 2, res = 72 * 2)
par(mfrow = c(2, 4))
hist(
  soildata_psd$esqueleto,
  main = "Coarse fraction", xlab = "Coarse fraction (g/kg), whole soil", col = "gray"
)
hist(
  soildata_psd$areia,
  main = "Sand", xlab = "Sand (g/kg), fine earth", col = "gray"
)
hist(
  soildata_psd$silte,
  main = "Silt", xlab = "Silt (g/kg), fine earth", col = "gray"
)
hist(
  soildata_psd$argila,
  main = "Clay", xlab = "Clay (g/kg), fine earth", col = "gray"
)
hist(
  soildata_psd$log_esqueleto1p_argila1p,
  main = "log(Coarse fraction/Clay)", xlab = "log(Coarse fraction/Clay), whole soil", col = "gray"
)
hist(
  soildata_psd$log_areia1p_argila1p,
  main = "log(Sand/Clay)", xlab = "log(Sand/Clay), whole soil", col = "gray"
)
hist(
  soildata_psd$log_silte1p_argila1p,
  main = "log(Silt/Clay)", xlab = "log(Silt/Clay), whole soil", col = "gray"
)
hist(
  soildata_psd$profundidade,
  main = "Midpoint depth", xlab = "Midpoint depth (cm)", col = "gray"
)
dev.off()

# Figure 2. Spatial distribution of samples with particle size data ################################
# This figure will be used in the ATBD document and the MapBiomas Soil method page. Versions in
# Portuguese, English, and Spanish are generated.
# Select the first occurrence of each 'id' to avoid overplotting
soildata_psd_sf <- soildata_psd[!duplicated(soildata_psd$id), ]
# Create spatial data
soildata_psd_sf <- sf::st_as_sf(soildata_psd_sf, coords = c("coord_x", "coord_y"), crs = 4326)

# Read South America and transform to WGS84
southamerica <- rnaturalearth::ne_countries(continent = c("south america", "europe"),
  returnclass = "sf", scale = "medium")
southamerica <- southamerica[, "iso_a2"]
# Save figure in Portuguese, English, and Spanish
lang <- c("pt", "en", "es")
main <- list(
  pt = "Amostras para modelagem da granulometria do solo inteiro",
  en = "Samples for modeling the whole-soil particle size distribution",
  es = "Muestras para modelar la granulometría del suelo entero"
)
for (i in seq_along(lang)) {
  file_path <- paste0("res/fig/", collection, "_psd_spatial_distribution_", lang[i], ".png")
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
  plot(soildata_psd_sf["argila"], add = TRUE, cex = 0.5, col = "dodgerblue4")
  prettymapr::addscalebar(plotunit = "latlon", plotepsg = 4326, pos = "bottomright")
  dev.off()
}

# Figure for Dataverse thumbnail ##################################################################
# Supported image types are JPG, TIF, or PNG and should be no larger than 500 KB.
# The maximum display size for an image file as a dataset thumbnail is 48 pixels wide by 48 pixels
# high.
file_path <- paste0("res/fig/", collection, "_psd_spatial_distribution_brazil_thumbnail.png")
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
plot(soildata_psd_sf["argila"], add = TRUE, cex = 0.5, col = "dodgerblue4")
dev.off()

# Compute statistics for PSD data ##################################################################

# Overlay biomes with soil data
old_s2 <- sf::sf_use_s2()
sf::sf_use_s2(FALSE)
soildata_psd_sf <- sf::st_join(soildata_psd_sf, brazil_biomes[-7, ])
sf::sf_use_s2(old_s2)

# Overlay states with soil data
soildata_psd_sf <- sf::st_join(soildata_psd_sf, brazil_states)
# Back to data.table
soildata_psd <- data.table::as.data.table(soildata_psd_sf)

# Count the number of samples per 'name_biome'
psd_stats_biome <- soildata_psd[, .N, by = name_biome][order(-N)]
print(psd_stats_biome)
data.table::fwrite(psd_stats_biome,
  file = paste0("res/tab/", collection, "_psd_stats_by_biome.csv"),
  sep = ";", dec = ".", row.names = FALSE
)

# Count the number of samples per 'name_state'
psd_stats_state <- soildata_psd[, .N, by = name_state][order(-N)]
print(psd_stats_state)
data.table::fwrite(psd_stats_state,
  file = paste0("res/tab/", collection, "_psd_stats_by_state.csv"),
  sep = ";", dec = ".", row.names = FALSE
)

# Scatterplot of PSD data using the SoilTexture R package ##########################################
# x11()
# install.packages("soiltexture")
# tmp <- soildata_psd_sf[soildata_psd_sf$name_biome == "Pantanal" & soildata_psd_sf$profundidade <= 30, c("argila", "silte", "areia")]
# tmp <- as.data.frame(tmp)
# tmp <- tmp[!is.na(tmp$argila) & tmp$argila > 0, ] / 10
# soiltexture::TT.plot(
#   tri.data = tmp,
#   css.names = c("argila", "silte", "areia"),
#   main = "Particle Size Distribution - SoilTexture R package",
#   class.sys = "USDA.TT"
# )


# name_biome <- "Pantanal"
# idx_biome <- which(soildata_psd_sf$name_biome == name_biome & soildata_psd_sf$profundidade <= 10)
# mapview::mapview(biomes[6, ], alpha.regions = 0.2, layer.name = "Pantanal", color = "black") +
#   mapview::mapview(soildata_psd_sf[idx_biome, ], zcol = "areia", layer.name = "Sand (g/kg)")


# abbrev_state <- "RS"
# idx_state <- which(
#   soildata_psd_sf$abbrev_state == abbrev_state &
#     soildata_psd_sf$profundidade <= 10 &
#     soildata_psd_sf$areia >= 0
# )
# mapview::mapview(states[states$abbrev_state == abbrev_state, ], alpha.regions = 0.2, layer.name = abbrev_state, color = "black") +
#   mapview::mapview(soildata_psd_sf[idx_state, ], zcol = "areia", layer.name = "Sand (g/kg)")
