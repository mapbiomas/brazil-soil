# title: MapBiomas Soil
# subtitle: 22. Compute Soil Organic Carbon Stock
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2025
rm(list = ls())

# Set MapBiomas Soil Collection
collection <- "c3"

# Set survival flag (Data for Felipe Brun)
survival <- TRUE

# Set year range of the MapBiomas series
year_range <- c(min = 1985, max = 2024)

# Set maximum soil depth (cm) for SOC stock calculation
if (survival) {
  max_depth <- 100 # Data for Felipe Brun
} else {
  max_depth <- 30
}

# Source helper functions and packages
source("src/00_helper_functions.r")
if (!require("qmap")) {
  install.packages("qmap", dependencies = TRUE)
  library("qmap")
}

# Read the Brazilian biome boundaries
brazil_biomes <- sf::st_read("data/brazil_biomes.geojson")
# keep only biomes of interest, dropping code_biome == 7 (Sistema Costeiro)
brazil_biomes <- brazil_biomes[brazil_biomes$code_biome %in% c(1, 2, 3, 4, 5, 6), ]
print(brazil_biomes)

# LOAD SOILDATA ####################################################################################
# Read SoilData data processed in the previous script
file_path <- "data/21_soildata.txt"
soildata <- data.table::fread(file_path, sep = "\t", na.strings = c("", "NA", "NaN"))
summary_soildata(soildata)
# Layers: 72125
# Events: 19884
# Georeferenced events: 17368
# Datasets: 267

if (survival) {
  # Drop id == ctb0567-Perfil-MBCT5
  # Error in layer depths were already corrected in the source. Drop here to avoid difficulties.
  soildata <- soildata[id != "ctb0567-Perfil-MBCT5"]
  # Drop id == ctb0758-175
  # Error in layer depths were already corrected in the source. Drop here to avoid difficulties.
  soildata <- soildata[id != "ctb0758-175"]
}

# LAYER ID (ORDER)
# Make sure that the layer id (camada_id) exists and is in the correct order
soildata <- soildata[order(id, profund_sup, profund_inf)]
soildata[, camada_id := 1:.N, by = id]
soildata[, .N, by = camada_id]

# Data for soil organic carbon stock ###############################################################
if (survival) {
  soildata_soc <- soildata[!is.na(coord_x) & !is.na(coord_y), ] # Data for Felipe Brun
} else {
  soc_columns <- c(
    "id", "dataset_id", "observacao_id",
    "coord_x", "coord_y", "data_ano",
    "VulcanicasSubprov", "VulcanicasSubprovLikely",
    "PlutonicasSubprov", "PlutonicasSubprovLikely",
    "SedimentaresSubprov", "SedimentaresSubprovLikely",
    "MetamorficasSubprov", "MetamorficasSubprovLikely",
    "SedimentosSubprov",
    "camada_id", "camada_nome",
    "profund_sup", "profund_inf",
    "carbono", "esqueleto", "dsi"
  )
soildata_soc <- soildata[!is.na(coord_x) & !is.na(coord_y), ..soc_columns]
}

# National Forest Inventory (IFN)
# Identify the soil layers that are part of the IFN:
# - their id starts with ctb0053, ctb0055, ctb0056, ctb0057, ctb0058, ctb0059, ctb0060, or ctb0061
soildata_soc[, IFN_index := grepl("^ctb0053|^ctb005[5-9]|^ctb006[0-1]", id)]
soildata_soc[, IFN_index := as.integer(IFN_index)]
soildata_soc[, .N, by = IFN_index][order(-N)]
# 4584 layers are part of the IFN

# Pseudo samples
# Identify pseudo-samples of rock outcrops and sandy soils
# dataset_id = "rock-pseudo"
# dataset_id = "sand-pseudo"
soildata_soc[, PSEUDOSAND_index := as.integer(dataset_id == "sand-pseudo")]
soildata_soc[, PSEUDOROCK_index := as.integer(dataset_id == "rock-pseudo")]
soildata_soc[, .N, by = PSEUDOSAND_index][order(-N)]
soildata_soc[, .N, by = PSEUDOROCK_index][order(-N)]

# Sampling year
# ctb0664 is missing the sampling year, even in the source data. The document was published in 1977,
# so we set data_ano to 1976.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0664", data_ano := 1976]
# ctb0682 was published in 2007, but we do not have access to the source document to check the
# sampling year. We set data_ano to 2006.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0682", data_ano := 2006]
# ctb0697 is Volume 1 of the RADAMBRASIL project, started in 1970. ctb0697 was published in 1973.
# The sampling year is missing in the source document. We set data_ano to 1971.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0697", data_ano := 1971]
# ctb0702 has samples from the RADAMBRASIL project. We can drop them to avoid duplicates.
soildata_soc <- soildata_soc[!(is.na(data_ano) & dataset_id == "ctb0702"), ]
# ctb0703 is Volume 4 of the RADAMBRASIL project, started in 1970. ctb0703 was published in 1974.
# The sampling year is missing in the source document. We set data_ano to 1972.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0703", data_ano := 1972]
# ctb0704 is Volume 2 of the RADAMBRASIL project, started in 1970. ctb0704 was published in 1973.
# The sampling year is missing in the source document. We set data_ano to 1971.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0704", data_ano := 1971]
# ctb0705 is Volume 5 of the RADAMBRASIL project, started in 1970. ctb0705 was published in 1974.
# The sampling year is missing in the source document. We set data_ano to 1972.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0705", data_ano := 1972]
# ctb0706 is Volume 6 of the RADAMBRASIL project, started in 1970. ctb0706 was published in 1974.
# The sampling year is missing in the source document. We set data_ano to 1972.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0706", data_ano := 1972]
# ctb0707 is Volume 7 of the RADAMBRASIL project, started in 1970. ctb0707 was published in 1975.
# The sampling year is missing in the source document. We set data_ano to 1973.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0707", data_ano := 1973]
# ctb0709 is Volume 8 of the RADAMBRASIL project, started in 1970. ctb0709 was published in 1975.
# The sampling year is missing in the source document. We set data_ano to 1973.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0709", data_ano := 1973]
# ctb0710 is Volume 9 of the RADAMBRASIL project, started in 1970. ctb0710 was published in 1975.
# The sampling year is missing in the source document. We set data_ano to 1973.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0710", data_ano := 1973]
# ctb0711 is Volume 10 of the RADAMBRASIL project, started in 1970. ctb0711 was published in 1976.
# The sampling year is missing in the source document. We set data_ano to 1974.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0711", data_ano := 1974]
# ctb0713 is Volume 12 of the RADAMBRASIL project, started in 1970. ctb0713 was published in 1976.
# The sampling year is missing in the source document. We set data_ano to 1974.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0713", data_ano := 1974]
# ctb0714 is Volume 11 of the RADAMBRASIL project, started in 1970. ctb0714 was published in 1976.
# The sampling year is missing in the source document. We set data_ano to 1974.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0714", data_ano := 1974]
# ctb0717 is Volume 13 of the RADAMBRASIL project, started in 1970. ctb0717 was published in 1977.
# The sampling year is missing in the source document. We set data_ano to 1975.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0717", data_ano := 1975]
# ctb0718 is Volume 14 of the RADAMBRASIL project, started in 1970. ctb0718 was published in 1977.
# The sampling year is missing in the source document. We set data_ano to 1975.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0718", data_ano := 1975]
# ctb0751 is Volume 16 of the RADAMBRASIL project, started in 1970. ctb0751 was published in 1978.
# The sampling year is missing in the source document. We set data_ano to 1976.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0751", data_ano := 1976]
# ctb0752 is Volume 17 of the RADAMBRASIL project, started in 1970. ctb0752 was published in 1978.
# The sampling year is missing in the source document. We set data_ano to 1976.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0752", data_ano := 1976]
# ctb0753 is Volume 18 of the RADAMBRASIL project, started in 1970. ctb0753 was published in 1978.
# The sampling year is missing in the source document. We set data_ano to 1976.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0753", data_ano := 1976]
# ctb0754 is Volume 19 of the RADAMBRASIL project, started in 1970. ctb0754 was published in 1979.
# The sampling year is missing in the source document. We set data_ano to 1977.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0754", data_ano := 1977]
# ctb0756 is Volume 20 of the RADAMBRASIL project, started in 1970. ctb0756 was published in 1980.
# The sampling year is missing in the source document. We set data_ano to 1978.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0756", data_ano := 1978]
# ctb0757 is Volume 21 of the RADAMBRASIL project, started in 1970. ctb0757 was published in 1981. 
# The sampling year is missing in the source document. We set data_ano to 1979.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0757", data_ano := 1979]
# ctb0758 is Volume 22 of the RADAMBRASIL project, started in 1970. ctb0758 was published in 1981.
# The sampling year is missing in the source document. We set data_ano to 1979.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0758", data_ano := 1979]
# ctb0770 is Volume 33 of the RADAMBRASIL project, started in 1970. ctb0770 was published in 1986.
# The sampling year is missing in the source document. We set data_ano to 1984.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0770", data_ano := 1984]
# ctb0829 has samples from the RADAMBRASIL project. We can ignore them to avoid duplicates.
soildata_soc <- soildata_soc[!(is.na(data_ano) & dataset_id == "ctb0829"), ]
# ctb0760 is Volume 24 of the RADAMBRASIL project, started in 1970. ctb0760 was published in 1981.
# The sampling year is missing in the source document. We set data_ano to 1979.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0760", data_ano := 1979]
# ctb0761 is Volume 25 of the RADAMBRASIL project, started in 1970. ctb0761 was published in 1981. 
# The sampling year is missing in the source document. We set data_ano to 1979.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0761", data_ano := 1979]
# ctb0767 is Volume 30 of the RADAMBRASIL project, started in 1970. ctb0767 was published in 1983.
# The sampling year is missing in the source document. We set data_ano to 1981.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0767", data_ano := 1981]
# ctb0769 is Volume 32 of the RADAMBRASIL project, started in 1970. ctb0769 was published in 1983.
# The sampling year is missing in the source document. We set data_ano to 1981.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0769", data_ano := 1981]
# ctb0771 is Volume 34 of the RADAMBRASIL project, started in 1970. ctb0771 was published in 1987.
# The sampling year is missing in the source document. We set data_ano to 1985.
soildata_soc[is.na(data_ano) & dataset_id == "ctb0771", data_ano := 1985]

# Indicator variable for the sampling year
# Create an indicator variable for the sampling year (YEAR_index) that is the difference between the
# sampling year and the closest year of the series. We start with YEAR_index = 0 for all samples.
soildata_soc[, YEAR_index := 0L]
# Check if there are any events with sampling year larger than the final year of the series
print(soildata_soc[data_ano > year_range["max"], id])
soildata_soc[data_ano > year_range["max"], YEAR_index := data_ano - year_range[["max"]]]
soildata_soc[, .N, by = YEAR_index]
# Then set the sampling year to the final year of the series.
soildata_soc[data_ano > year_range["max"], data_ano := year_range[["max"]]]
# Check if there are any events with sampling year smaller than the initial year of the series
soildata_soc[data_ano < year_range["min"], .N]
# There are 15418 layers with sampling year smaller than 1985
soildata_soc[data_ano < year_range["min"], YEAR_index := data_ano - year_range[["min"]]]
soildata_soc[, .N, by = YEAR_index][order(-YEAR_index)]
# Then set the sampling year to the initial year of the series.
soildata_soc[data_ano < year_range["min"], data_ano := year_range[["min"]]]
soildata_soc[, .N, by = data_ano][order(data_ano)]
# Summary after fixing missing sampling years
summary_soildata(soildata_soc)
# Layers: 63215
# Events: 17285
# Georeferenced events: 17285
# Datasets: 216

# Clean data #######################################################################################

# Remove data from Technosols and Anthrosols
# Solo construído no aterro encerrado da Caturrita, Santa Maria (RS)
soildata_soc <- soildata_soc[dataset_id != "ctb0036", ]
# Projeto Parque Frei Veloso - Levantamento Detalhado dos Solos do Campus da Ilha do Fundão UFRJ
soildata_soc <- soildata_soc[dataset_id != "ctb0599", ]
# Projeto Caldeirão: caracterização e gênese das Terras Pretas Amazônicas
soildata_soc <- soildata_soc[dataset_id != "ctb0018", ]
# Summary
summary_soildata(soildata_soc)
# Layers: 62720
# Events: 17110
# Georeferenced events: 17110
# Datasets: 213

# Drop layers starting from soil depth greater than max_depth (cm)
soildata_soc <- soildata_soc[profund_sup < max_depth, ]
# Summary
summary_soildata(soildata_soc)
# Layers: 33835
# Events: 17106
# Georeferenced events: 17106
# Datasets: 213

# Remove soil layers missing data on soil organic carbon
# Rule: For each profile (id), if a layer i (camada_id = i) is missing carbon (carbono = NA), remove
# that layer and ALL deeper layers (camada_id >= i). Keep only layers above the first missing one.
# If the first layer is missing, the whole profile is dropped.
soildata_soc[is.na(carbono), .N] # count missing layers: 2645
soildata_soc[is.na(carbono), .N, by = camada_id][order(camada_id)]  # distribution by depth index
if (FALSE) {
  View(soildata_soc[is.na(carbono), .(id, camada_nome, profund_sup, profund_inf)])
}
# Various layers are missing carbon data.
# ctb0001: the source study did not have carbon data, but other studies from the same site might 
#   have it.
# ctb0004: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0008: the carbon data has not been digitized yet.
# ctb0010: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0012: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0013: the carbon data has not been digitized yet.
# ctb0014: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0015: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0016: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0023: the carbon data has not been digitized yet.
# ctb0026: the source study did not have carbon data, but other studies from the same site might 
#   have it.
# ctb0027: the source study did not have carbon data, but other studies from the same site might 
#   have it.
# ctb0028: there are a few layers with missing carbon data.
# ctb0029: the carbon data alteady been digitized, but the source data has not been processed yet.
# ctb0030: there are a few layers with missing carbon data.
# ctb0033: there are a few layers with missing carbon data.
# ctb0038: there are a few layers with missing carbon data.
# ctb0040: there are a few layers with missing carbon data.
# ctb0044: there are a few layers with missing carbon data.
# ctb0046: there are various layers with missing carbon data.
# ctb0051: there are a few layers with missing carbon data.
# ctb0052: there are various layers with missing carbon data, but they are rock layers.
# ctb0053: there are a few layers with missing carbon data.
# ctb0055: there are a few layers with missing carbon data.
# ctb0056: there are a few layers with missing carbon data.
# ctb0057: there are a few layers with missing carbon data.
# ctb0059: there are a few layers with missing carbon data.
# ctb0065: there are a few layers with missing carbon data.
# ctb0092: there are a few layers with missing carbon data.
# ctb0093: there are various layers with missing carbon data, but they are rock layers.
# For all other datasets, the carbon data has been digitized and processed, but some layers
# are still missing carbon data.
# Identify, for each profile, the shallowest layer with missing carbon
soildata_soc[,
  min_missing_layer := ifelse(any(is.na(carbono)), min(camada_id[is.na(carbono)]), NA_integer_),
  by = id
]
# Keep profiles/layers where either there is no missing carbon (min_missing_layer is NA)
# or the layer is shallower than the first missing layer
soildata_soc <- soildata_soc[is.na(min_missing_layer) | camada_id < min_missing_layer]
soildata_soc[, min_missing_layer := NULL]
# After applying the rule, there should be no remaining NA in carbono
stopifnot(soildata_soc[ , all(!is.na(carbono)) ])
summary_soildata(soildata_soc)
# Layers: 31070
# Events: 16026
# Georeferenced events: 16026
# Datasets: 201

# Drop profiles missing surface layer
# Check if all soil profiles (id) have a layer starting at soil surface (profund_sup = 0 cm)
soildata_soc[, has_topsoil := any(profund_sup == 0), by = id]
soildata_soc[has_topsoil == FALSE, .N, by = id]
soildata_soc[has_topsoil == FALSE, .(id, camada_nome, profund_sup, profund_inf, carbono)]
# There are 03 profiles missing surface layer, all of them from ctb0029
soildata_soc <- soildata_soc[has_topsoil == TRUE, ]
soildata_soc[, has_topsoil := NULL]
summary_soildata(soildata_soc)
# Layers: 31067
# Events: 16023
# Georeferenced events: 16023
# Datasets: 201

# Remove soil samples outside Brazil
# Create a spatial object with the soil organic carbon data
soildata_soc_sf <- sf::st_as_sf(soildata_soc, coords = c("coord_x", "coord_y"), crs = 4326)
# Intersect the soil organic carbon data with the Brazilian biomes
old_s2 <- sf::sf_use_s2()
sf::sf_use_s2(FALSE)
soildata_soc_sf <- sf::st_join(soildata_soc_sf, brazil_biomes["name_biome"])
sf::sf_use_s2(old_s2)
soildata_soc[, name_biome := soildata_soc_sf$name_biome]
rm(soildata_soc_sf)
# Check if there are any events without a biome
soildata_soc[, .N, by = name_biome][order(-N)]
# Drop events without a biome
soildata_soc <- soildata_soc[!is.na(name_biome), ]
summary_soildata(soildata_soc)
# Layers: 31065
# Events: 16022
# Georeferenced events: 16022
# Datasets: 201

# Prepare data for SOC stock calculation ###########################################################

# Compute soil layer thickness (cm)
soildata_soc[, espessura := profund_inf - profund_sup]
# Check if there is any negative or zero thickness
if (soildata_soc[espessura <= 0, .N] > 0) {
  warning("There are layers with negative or zero thickness.")
  print(soildata_soc[espessura <= 0, ])
} else {
  print("There are no layers with negative or zero thickness.")
}
# There are no layers with negative or zero thickness

# Soil bulk density (g/cm³) for rock layers
# For rock layers (esqueleto = 1000 g/kg), set soil bulk density (dsi) to 0 g/cm³
soildata_soc[esqueleto == 1000, dsi := 0]

# Density of coarse fragments
# We set the density of coarse fragments based on the geological substrate
# First, set zero to NA_
soildata_soc[, c(
  "VulcanicasSubprov", "VulcanicasSubprovLikely",
  "PlutonicasSubprov", "PlutonicasSubprovLikely",
  "SedimentaresSubprov", "SedimentaresSubprovLikely",
  "MetamorficasSubprov", "MetamorficasSubprovLikely",
  "SedimentosSubprov"
) := lapply(.SD, function(x) ifelse(x == 0, NA, x)), .SDcols = c(
  "VulcanicasSubprov", "VulcanicasSubprovLikely",
  "PlutonicasSubprov", "PlutonicasSubprovLikely",
  "SedimentaresSubprov", "SedimentaresSubprovLikely",
  "MetamorficasSubprov", "MetamorficasSubprovLikely",
  "SedimentosSubprov"
)]
# Then, multiply by the rock density (g/cm³)
# VulcanicasSubprov: 2.74 g/cm³
# VulcanicasSubprovLikely: 2.74 g/cm³
soildata_soc[, VulcanicasSubprov := VulcanicasSubprov * 2.74]
soildata_soc[, VulcanicasSubprovLikely := VulcanicasSubprovLikely * 2.74]
# PlutonicasSubprov: 2.66 g/cm³
# PlutonicasSubprovLikely: 2.66 g/cm³
soildata_soc[, PlutonicasSubprov := PlutonicasSubprov * 2.66]
soildata_soc[, PlutonicasSubprovLikely := PlutonicasSubprovLikely * 2.66]
# SedimentaresSubprov: 2.30 g/cm³
# SedimentaresSubprovLikely: 2.30 g/cm³
soildata_soc[, SedimentaresSubprov := SedimentaresSubprov * 2.30]
soildata_soc[, SedimentaresSubprovLikely := SedimentaresSubprovLikely * 2.30]
# MetamorficasSubprov: 2.70 g/cm³
# MetamorficasSubprovLikely: 2.70 g/cm³
soildata_soc[, MetamorficasSubprov := MetamorficasSubprov * 2.70]
soildata_soc[, MetamorficasSubprovLikely := MetamorficasSubprovLikely * 2.70]
# SedimentosSubprov: 2.00 g/cm³
soildata_soc[, SedimentosSubprov := SedimentosSubprov * 2.00]
# Summary
summary(soildata_soc[, .(
  VulcanicasSubprov, VulcanicasSubprovLikely, PlutonicasSubprov,
  PlutonicasSubprovLikely, SedimentaresSubprov, SedimentaresSubprovLikely, MetamorficasSubprov,
  MetamorficasSubprovLikely, SedimentosSubprov
)])
# Compute the row average of the rock density
# First, consider the cases in which we are almost sure about the geological substrate, i.e.
# VulcanicasSubprov, SedimentaresSubprov, PlutonicasSubprov, MetamorficasSubprov, and
# SedimentosSubprov are larger than one (1).
soildata_soc[, rock_density_sure := rowMeans(.SD, na.rm = TRUE), .SDcols = c(
  "VulcanicasSubprov", "SedimentaresSubprov", "SedimentosSubprov", "PlutonicasSubprov",
  "MetamorficasSubprov"
)]
# Summary
summary(soildata_soc$rock_density_sure)
# Then, consider the cases in which we are less sure about the geological substrate, i.e.
# VulcanicasSubprovLikely, SedimentaresSubprovLikely, PlutonicasSubprovLikely,
# MetamorficasSubprovLikely, and SedimentosSubprov are larger than one (1).
soildata_soc[, rock_density_likely := rowMeans(.SD, na.rm = TRUE), .SDcols = c(
  "VulcanicasSubprovLikely", "SedimentaresSubprovLikely", "PlutonicasSubprovLikely",
  "MetamorficasSubprovLikely"
)]
# Summary
summary(soildata_soc$rock_density_likely)
# Merge the two rock density estimates into a single column, rock_density, giving priority to
# rock_density_sure
soildata_soc[
  ,
  rock_density := ifelse(is.na(rock_density_sure), rock_density_likely, rock_density_sure)
]
# Summary
summary(soildata_soc$rock_density)
# 3049 layers with no rock density estimate (NA), 3000 being pseudo samples of sandy soils
# (PSEUDOSAND_index = 1) and rock outcrops (PSEUDOROCK_index = 1)
# For PSEUDOROCK_index = 1, set rock density to 2.65 g/cm³
soildata_soc[PSEUDOROCK_index == 1, rock_density := 2.65]
# For PSEUDOSAND_index = 1, set rock density to 0 g/cm³
soildata_soc[PSEUDOSAND_index == 1, rock_density := 0]
# For the remaining 49 layers, set rock density to the average of all other layers
mean_rock_density <- mean(soildata_soc$rock_density, na.rm = TRUE)
soildata_soc[is.na(rock_density), rock_density := mean_rock_density]
summary(soildata_soc$rock_density)
# Then, remove the intermediate columns and objects
soildata_soc[, c(
  "VulcanicasSubprov", "VulcanicasSubprovLikely",
  "PlutonicasSubprov", "PlutonicasSubprovLikely",
  "SedimentaresSubprov", "SedimentaresSubprovLikely",
  "MetamorficasSubprov", "MetamorficasSubprovLikely",
  "SedimentosSubprov",
  "rock_density_sure", "rock_density_likely"
) := NULL]
rm(mean_rock_density)
if (FALSE) {
  # View rock density distribution on a map
  soildata_soc_sf <- sf::st_as_sf(soildata_soc, coords = c("coord_x", "coord_y"), crs = 4326)
  mapview::mapview(soildata_soc_sf, zcol = "rock_density", legend = TRUE, cex = 3)
  rm(soildata_soc_sf)
}

# Volume of coarse fragments (%) in the whole soil
# Employ information on rock content (esqueleto, g/kg), rock density (rock_density, g/cm³), and
# fine earth density (dsi, g/cm³) to estimate the volume of coarse fragments (volumetric rock
# content, vrc, %) in the whole soil.
# Formula:
# The complete formula, with explicit unit conversion of rock content (esqueleto) from g/kg to a
# unitless mass fraction (g/g), is:
# vrc = ((esqueleto / 1000) / rock_density) /
#       (((esqueleto / 1000) / rock_density) + ((1 - (esqueleto / 1000)) / dsi)) * 100
# The simplified formula below is mathematically equivalent because the factor of 1000 in the
# numerator and denominator cancels out.
# vrc = (esqueleto / rock_density) / ((esqueleto / rock_density) + ((1000 - esqueleto) / dsi)) * 100
soildata_soc[, vrc := (esqueleto / rock_density) /
  ((esqueleto / rock_density) + ((1000 - esqueleto) / dsi)) * 100]
# Summary
summary(soildata_soc$vrc)
# Layers with esqueleto = 1000 g/kg (rock layers) result in NA for vrc because
# (1000 - esqueleto) becomes zero. For these layers, vrc should be 100%.
soildata_soc[esqueleto == 1000, vrc := 100]
# Layers with esqueleto = 0 g/kg (no coarse fragments) result in vrc = NaN. For these layers,
# vrc should be 0%.
soildata_soc[esqueleto == 0, vrc := 0]
summary(soildata_soc$vrc)
if (FALSE) {
  View(soildata_soc[, .(id, camada_nome, profund_sup, profund_inf, carbono, dsi, vrc)])
}

# Layer limits
# The lowermost layer of some soil profiles may go beyond the target depth (max_depth, cm). We
# have to reset the lower limit of those layers to max_depth.
# Source: https://github.com/ncss-tech/aqp/blob/master/R/depthWeights.R
# The thickness of each layer is recalculated.
target_layer <- c(0, max_depth)
soildata_soc[profund_sup < target_layer[1], profund_sup := target_layer[1]]
soildata_soc[profund_inf < target_layer[1], profund_inf := target_layer[1]]
soildata_soc[profund_sup > target_layer[2], profund_sup := target_layer[2]]
soildata_soc[profund_inf > target_layer[2], profund_inf := target_layer[2]]
# Recompute layer thickness
soildata_soc[, espessura := profund_inf - profund_sup]
nrow(soildata_soc[espessura <= 0, ])
nrow(soildata_soc[espessura > max_depth, ])
# There are no layers with zero or negative thickness
if (FALSE) {
  View(soildata_soc[, .(id, camada_nome, profund_sup, profund_inf, carbono, dsi, vrc)])
}

# Soil organic carbon density ######################################################################

# Compute soil organic carbon density (g/cm³)
# Variables: carbono (g/kg), vrc (%), and dsi (g/cm³)
# Formula:
# soc_density_gcm3 = (carbono / 1000) * (1 - (vrc / 100)) * dsi
soildata_soc[, soc_density_gcm3 := (carbono / 1000) * (1 - (vrc / 100)) * dsi]
summary(soildata_soc$soc_density_gcm3)
if (FALSE) {
  x11()
  hist(soildata_soc[, soc_density_gcm3])
  rug(soildata_soc[, soc_density_gcm3])
}
# Temporarily separate pseudo samples from real samples
soildata_soc_pseudo <- soildata_soc[PSEUDOSAND_index == 1 | PSEUDOROCK_index == 1, ]
summary_soildata(soildata_soc_pseudo)
# Layers: 3000
# Events: 1000
# Georeferenced events: 1000
# Datasets: 2
soildata_soc <- soildata_soc[!PSEUDOSAND_index == 1 & !PSEUDOROCK_index == 1, ]
summary_soildata(soildata_soc)
# Layers: 28065
# Events: 15022
# Georeferenced events: 15022
# Datasets:199

# Compare the SOC density between the IFN and non-IFN samples
# For the IFN samples, the median SOC density is higher than for the non-IFN samples in all biomes.
# Differences are statistically significant in the Amazon, Atlantic Forest, and Caatinga. The
# difference is not statistically significant in the Cerrado, but the coifndence interval is very
# wide for the IFN samples. There are no IFN samples in the Pampa and Pantanal biomes.
ylim <- extendrange(soildata_soc$soc_density_gcm3)
file_path <- paste0("res/fig/", collection, "_soc_density_boxplot_ifn_biome.png")
png(file_path, width = 480 * 3, height = 480 * 2, res = 72 * 2)
par(mar = c(5, 8, 4, 2) + 0.1)
boxplot(
  soc_density_gcm3 ~ IFN_index + name_biome,
  soildata_soc, horizontal = TRUE,
  col = c("lightgreen", "lightyellow"),
  ylab = "",
  xlab = "Soil organic carbon density (g/cm^3)", cex.axis = 0.8, ylim = ylim, las = 1
)
legend("topright",
  legend = c("Non-IFN", "IFN"),
  fill = c("lightgreen", "lightyellow"), cex = 0.8
)
dev.off()
# The SOC density of IFN samples are skewed to the right. The skew is stronger for large SOC
# densities. We employ quantile mapping to correct the skewness of the IFN samples. The reason for
# the skewness likely if the sampling of organic layers (Od) by the IFN staff that is generally
# ignored by soil scientists.

# Quantile mapping of SOC density for IFN samples
# The quantile mapping is performed for the IFN samples in each biome. The quantiles of the SOC
# density of the IFN samples are matched to the quantiles of the SOC density of the non-IFN samples.
# AMAZON
range(soildata_soc[name_biome == "Amazônia" & IFN_index == 1, soc_density_gcm3])
# 0.004534689 0.183192162
amazon_qmap <- qmap::fitQmap(
  obs = soildata_soc[name_biome == "Amazônia" & soildata_soc$IFN_index == 0, soc_density_gcm3],
  mod = soildata_soc[name_biome == "Amazônia" & soildata_soc$IFN_index == 1, soc_density_gcm3],
  method = "PTF", wet.day = FALSE, transfun = "power"
)
amazon_qmap <- qmap::doQmap(
  soildata_soc[name_biome == "Amazônia" & IFN_index == 1, soc_density_gcm3], amazon_qmap
)
range(amazon_qmap)
# 0.00524534 0.16531019
# CAATINGA
range(soildata_soc[name_biome == "Caatinga" & IFN_index == 1, soc_density_gcm3])
# 0.001553611 0.105989301
caatinga_qmap <- qmap::fitQmap(
  obs = soildata_soc[name_biome == "Caatinga" & soildata_soc$IFN_index == 0, soc_density_gcm3],
  mod = soildata_soc[name_biome == "Caatinga" & soildata_soc$IFN_index == 1, soc_density_gcm3],
  method = "PTF", wet.day = FALSE, transfun = "scale"
)
caatinga_qmap <- qmap::doQmap(
  soildata_soc[name_biome == "Caatinga" & IFN_index == 1, soc_density_gcm3], caatinga_qmap
)
range(caatinga_qmap)
# 0.001009238 0.068851440
# CERRADO
range(soildata_soc[name_biome == "Cerrado" & IFN_index == 1, soc_density_gcm3])
# 0.003589864 0.094666905
cerrado_qmap <- qmap::fitQmap(
  obs = soildata_soc[name_biome == "Cerrado" & soildata_soc$IFN_index == 0, soc_density_gcm3],
  mod = soildata_soc[name_biome == "Cerrado" & soildata_soc$IFN_index == 1, soc_density_gcm3],
  method = "PTF", wet.day = FALSE, transfun = "power"
)
cerrado_qmap <- qmap::doQmap(
  soildata_soc[name_biome == "Cerrado" & IFN_index == 1, soc_density_gcm3], cerrado_qmap
)
range(cerrado_qmap)
# 0.00297659 0.06650054
# ATLANTIC FOREST
range(soildata_soc[name_biome == "Mata Atlântica" & IFN_index == 1, soc_density_gcm3])
# 0.001887912 0.407403062
atlantica_qmap <- qmap::fitQmap(
  obs = soildata_soc[name_biome == "Mata Atlântica" & soildata_soc$IFN_index == 0, soc_density_gcm3],
  mod = soildata_soc[name_biome == "Mata Atlântica" & soildata_soc$IFN_index == 1, soc_density_gcm3],
  method = "PTF", wet.day = FALSE, transfun = "power"
)
atlantica_qmap <- qmap::doQmap(
  soildata_soc[name_biome == "Mata Atlântica" & IFN_index == 1, soc_density_gcm3], atlantica_qmap
)
range(atlantica_qmap)
# 0.0008866673 0.4842967268
# Apply the quantile mapping results to the main data table, creating a new column
# soc_density_gcm3_qmap
soildata_soc[name_biome == "Amazônia" & IFN_index == 1, 
  soc_density_gcm3_qmap := amazon_qmap
]
soildata_soc[name_biome == "Caatinga" & IFN_index == 1, 
  soc_density_gcm3_qmap := caatinga_qmap
]
soildata_soc[name_biome == "Cerrado" & IFN_index == 1, 
  soc_density_gcm3_qmap := cerrado_qmap
]
soildata_soc[name_biome == "Mata Atlântica" & IFN_index == 1, 
  soc_density_gcm3_qmap := atlantica_qmap
]
soildata_soc[is.na(soc_density_gcm3_qmap), soc_density_gcm3_qmap := soc_density_gcm3]
# Summary
summary(soildata_soc$soc_density_gcm3_qmap)
# Save figure with the boxplot of SOC stock by biome and IFN status after quantile mapping
ylim <- c(0, max(soildata_soc$soc_density_gcm3_qmap))
file_path <- paste0("res/fig/", collection, "_soc_density_boxplot_ifn_biome_qmap.png")
png(file_path, width = 480 * 3, height = 480 * 2, res = 72 * 2)
par(mar = c(5, 8, 4, 2) + 0.1)
boxplot(
  soc_density_gcm3_qmap ~ IFN_index + name_biome,
  soildata_soc, horizontal = TRUE,
  col = c("lightgreen", "lightyellow"),
  ylab = "",
  xlab = "Soil organic carbon density (g/cm^3)", cex.axis = 0.8, ylim = ylim, las = 1
)
legend("topright",
  legend = c("Non-IFN", "IFN"),
  fill = c("lightgreen", "lightyellow"), cex = 0.8
)
dev.off()

# Join back the pseudo samples
soildata_soc <- data.table::rbindlist(list(soildata_soc, soildata_soc_pseudo), fill = TRUE)
# Set soc_density_gcm3_qmap equal to soc_density_gcm3 for pseudo samples
soildata_soc[
  PSEUDOSAND_index == 1 | PSEUDOROCK_index == 1,
  soc_density_gcm3_qmap := soc_density_gcm3
]
summary(soildata_soc$soc_density_gcm3_qmap)
summary_soildata(soildata_soc)
# Layers: 31065
# Events: 16022
# Georeferenced events: 16022
# Datasets: 201

# Soil organic carbon stock ########################################################################

# Compute soil organic carbon stock (g/m^2) in each layer
# Consider both soc_density_gcm3 and soc_density_gcm3_qmap
# Note: espessura (thickness) is in cm, so we multiply by 10,000 to convert to m²
soildata_soc[, soc_stock_gm2 := round(soc_density_gcm3 * espessura * 10000)]
soildata_soc[, soc_stock_gm2_qmap := round(soc_density_gcm3_qmap * espessura * 10000)]
# Summary
summary(soildata_soc$soc_stock_gm2)
summary(soildata_soc$soc_stock_gm2_qmap)
# Save figure with the dispersion plot of SOC stock before and after quantile mapping
file_path <- paste0("res/fig/", collection, "_soc_stock_dispersion_before_after_qmap.png")
png(file_path, width = 480 * 2, height = 480 * 2, res = 72 * 2)
plot(
  soildata_soc[PSEUDOSAND_index != 1 & PSEUDOROCK_index != 1, soc_stock_gm2],
  soildata_soc[PSEUDOSAND_index != 1 & PSEUDOROCK_index != 1, soc_stock_gm2_qmap],
  xlab = "Soil organic carbon stock (g/m^2) before quantile mapping",
  ylab = "Soil organic carbon stock (g/m^2) after quantile mapping"
)
dev.off()

# Compute the cummulative SOC stock (g/m^2)
# For each soil profile (id), cummulative sum the SOC stock downward the soil profile till the
# lowermost layer within the target depth (max_depth, cm)
soildata_soc <- soildata_soc[order(id, profund_sup)]
soildata_soc[, soc_stock_gm2_cum := cumsum(soc_stock_gm2), by = id]
soildata_soc[, soc_stock_gm2_cum_qmap := cumsum(soc_stock_gm2_qmap), by = id]
# Summary
summary(soildata_soc$soc_stock_gm2_cum)
summary(soildata_soc$soc_stock_gm2_cum_qmap)
if (FALSE) {
  View(soildata_soc[
    ,
    .(id, camada_nome, profund_inf, soc_stock_gm2, soc_stock_gm2_cum,
     soc_stock_gm2_qmap, soc_stock_gm2_cum_qmap)
  ])
}
# Summary
summary_soildata(soildata_soc)
# Layers: 31065
# Events: 16022
# Georeferenced events: 16022
# Datasets: 201

# Get the maximum cummulative SOC stock (g/m²) for each soil profile (id)
# Get the maximum cummulative SOC stock (kg/m^2) for each soil profile (id)
soildata_soc[, max_soc_stock_gm2 := max(soc_stock_gm2_cum), by = id]
if (FALSE) {
  # View mapview
  soildata_soc_sf <- sf::st_as_sf(soildata_soc, coords = c("coord_x", "coord_y"), crs = 4326)
  mapview::mapview(soildata_soc_sf, zcol = "max_soc_stock_gm2", legend = TRUE)
  rm(soildata_soc_sf)
}

# Drop the following samples: quick screening of possible outliers
# RS: ctb0770-E138 
# PR: ctb0055-PR_2, ctb0055-PR_3, ctb0055-PR_4, ctb0055-PR_5, ctb0055-PR_7 
# ctb0607-PERFIL-112 
# ctb0057-SE_24 
# ctb0059-CE_365 
outliers <- c(
  "ctb0770-E138",
  "ctb0055-PR_2", "ctb0055-PR_3", "ctb0055-PR_4", "ctb0055-PR_5", "ctb0055-PR_7",
  "ctb0607-PERFIL-112",
  "ctb0057-SE_24",
  "ctb0059-CE_365"
)
soildata_soc <- soildata_soc[!id %in% outliers, ]
summary_soildata(soildata_soc)
# Layers: 31047
# Events: 16013
# Georeferenced events: 16013
# Datasets: 201

# Number of unique events
n_events <- nrow(soildata_soc[, .N, by = id])
# Number of layers
n_layers <- nrow(soildata_soc)

# ADD METADATA FOR SPATIAL FILTERING ###############################################################
old_s2 <- sf::sf_use_s2()
sf::sf_use_s2(FALSE)

# Convert soildata_soc to sf object, keeping a single point per id
soildata_soc_sf <- sf::st_as_sf(
  soildata_soc[camada_id == 1, .(id, coord_x, coord_y)],
  coords = c("coord_x", "coord_y"),
  crs = 4326,
  remove = FALSE
)
print(soildata_soc_sf)
nrow(soildata_soc_sf) == n_events

# Intersect with Brazilian states
brazil_states <- sf::st_read("data/brazil_states.geojson", quiet = TRUE)
soildata_soc_sf <- sf::st_join(
  soildata_soc_sf,
  brazil_states["name_state"],
  left = TRUE
)
# Check number of points
nrow(soildata_soc_sf) == n_events
# Mapview points without state
if (FALSE) {
  no_state <- soildata_soc_sf[is.na(soildata_soc_sf$name_state), ]
  mapview::mapview(brazil_states) +
    mapview::mapview(no_state, col.region = "red")
  rm(no_state)
}

# Intersect with Brazilian regions
brazil_regions <- sf::st_read("data/brazil_regions.geojson", quiet = TRUE)
soildata_soc_sf <- sf::st_join(
  soildata_soc_sf,
  brazil_regions["name_region"],
  left = TRUE
)
# Check number of points
nrow(soildata_soc_sf) == n_events
# Mapview points without region
if (FALSE) {
  no_region <- soildata_soc_sf[is.na(soildata_soc_sf$name_region), ]
  mapview::mapview(brazil_regions) +
    mapview::mapview(no_region, col.region = "red")
  rm(no_region)
}

# Intersect with Brazilian municipalities
brazil_municipalities <- sf::st_read("data/brazil_municipalities.geojson", quiet = TRUE)
brazil_municipalities$name_muni <- paste0(
  brazil_municipalities$name_muni,
  " - ",
  brazil_municipalities$abbrev_state,
  " - ",
  brazil_municipalities$code_muni
)
soildata_soc_sf <- sf::st_join(
  soildata_soc_sf,
  brazil_municipalities["name_muni"],
  left = TRUE
)
# Check number of points
nrow(soildata_soc_sf) == n_events
# Mapview points without municipality
if (FALSE) {
  no_muni <- soildata_soc_sf[is.na(soildata_soc_sf$name_muni), ]
  mapview::mapview(brazil_municipalities) +
    mapview::mapview(no_muni, col.region = "red")
  rm(no_muni)
}

# Merge metadata back to soildata_soc
soildata_soc_sf <- data.table::as.data.table(soildata_soc_sf)
nrow(soildata_soc_sf) == n_events
soildata_soc_sf[, geometry != NULL]
soildata_soc <- merge(
  soildata_soc,
  soildata_soc_sf[, .(id, name_state, name_region, name_muni)],
  by = "id"
)
# Check number of layers
nrow(soildata_soc) == n_layers
if (FALSE) {
  View(soildata_soc)
}

# Rename columns
data.table::setnames(soildata_soc, old = "name_biome", new = "bioma_nome")
data.table::setnames(soildata_soc, old = "name_state", new = "estado_nome")
data.table::setnames(soildata_soc, old = "name_region", new = "regiao_nome")
data.table::setnames(soildata_soc, old = "name_muni", new = "municipio_nome")

# Restore s2 processing
sf::sf_use_s2(old_s2)

# Export SOC data ##################################################################################
if (survival) {
  # Export SOC data for survival modelling #########################################################
  cols_out <- c(
    # dataset wise variables -----------------------------------------------------------------------
    "dataset_id", # unique identifier for the dataset of each soil profile
    "DATASET_COARSE", # does the dataset contain samples with coarse fragments?
    # indicators for data filtering (if needed) ----------------------------------------------------
    "IFN_index", # boolean for samples from the Brazilian National Forest Inventory (IFN)
    "PSEUDOSAND_index", # boolean for pseudo samples of sandy soils (remove from modelling?)
    "PSEUDOROCK_index", # boolean for pseudo samples of rock outcrops (remove from modelling?)
    # event wise variables -------------------------------------------------------------------------
    "id", # unique identifier for each soil profile (dataset_id + observacao_id)
    "observacao_id", # unique identifier for each soil profile
    "dataset_licenca", # license of the dataset
    "coord_x", # longitude in decimal degrees (use for plotting)
    "coord_y", # latitude in decimal degrees (use for plotting)
    "coord_precisao", # precision of the coordinates in meters (use for filtering perhaps)
    "coord_fonte", # source of the coordinates (use for filtering perhaps)
    "pais_id", # unique identifier for each country
    "estado_id", # unique identifier for each state
    "municipio_id", # unique identifier for each municipality
    "data_ano", # year of the data collection
    "stoniness", # stoniness class (pedregosidade)
    "has_stoniness", # boolean for stoniness
    "rockiness", # rockiness class (rochosidade)
    "has_rockiness", # boolean for rockiness
    "EVENT_COARSE", # Does this soil profile has a stony layer?
    "coord_x_utm", # longitude in meters, use as predictor
    "coord_y_utm",  # latitude in meters, use as predictor
    "ORDER", # Soil order as defined by the Brazilian Soil Classification System (SiBCS)
    "SUBORDER", # Soil suborder as defined by the Brazilian Soil Classification System (SiBCS)
    "STONESOL", # Is the soil order a stony soil?
    "Acrisols", # Probability of the soil being an Acrisol (SoilGrids)
    "Alisols", # Probability of the soil being an Alisol (SoilGrids)
    "Arenosols", # Probability of the soil being an Arenosol (SoilGrids)
    "Chernozems", # Probability of the soil being a Chernosol (SoilGrids)
    "Ferralsols", # Probability of the soil being a Ferralsol (SoilGrids)
    "Gleysols",  # Probability of the soil being a Gleysol (SoilGrids)
    "Histosols", # Probability of the soil being a Histosol (SoilGrids)
    "Leptosols", # Probability of the soil being a Leptosol (SoilGrids)
    "Lixisols", # Probability of the soil being a Lixisol (SoilGrids)
    "Luvisols", # Probability of the soil being a Luvisol (SoilGrids)
    "Nitisols",  # Probability of the soil being a Nitisol (SoilGrids)
    "Phaeozems", # Probability of the soil being a Phaeozem (SoilGrids)
    "Planosols", # Probability of the soil being a Planosol (SoilGrids)
    "Plinthosols", # Probability of the soil being a Plinthosol (SoilGrids)
    "Podzols", # Probability of the soil being a Podzol (SoilGrids)
    "Regosols", # Probability of the soil being a Regosol (SoilGrids)
    "Stagnosols", # Probability of the soil being a Stagnosol (SoilGrids)
    "Umbrisols", # Probability of the soil being a Umbrisol (SoilGrids)
    "Vertisols",  # Probability of the soil being a Vertisol (SoilGrids)
    "AmazonasSolimoesProv", # Boolean for geological province (ATBD)
    "AmazoniaProv", # Boolean for geological province (ATBD)
    "BorboremaProv", # Boolean for geological province (ATBD)
    "CoberturaCenozoicaProv", # Boolean for geological province (ATBD)
    "CosteiraMargem_ContinentalProv", # Boolean for geological province (ATBD)
    "GurupiProv", # Boolean for geological province (ATBD)
    "MantiqueiraProv", # Boolean for geological province (ATBD)
    "Massad_aguaProv", # Boolean for geological province (ATBD)
    "ParanaProv", # Boolean for geological province (ATBD)
    "ParecisProv", # Boolean for geological province (ATBD)
    "ParnaibaProv", # Boolean for geological province (ATBD)
    "ReconcavoTucano_JatobaProv", # Boolean for geological province (ATBD)
    "SaoFranciscoProv", # Boolean for geological province (ATBD)
    "SaoLuisProv", # Boolean for geological province (ATBD)
    "TocantisProv",  # Boolean for geological province (ATBD)
    "black_soils", # Probability of being a black soil (FAO)
    # Terrain variables derived from digital elevation model -------
    "altitude", # altitude above sea level in meters
    "convergence", # convergence index
    "cti", # compound topographic index
    "dev_magnitude", # magnitude of the deviation from mean elevation
    "eastness", # eastness index    
    "elev_stdev", # standard deviation of the elevation
    "geomorphon", # geomorphon class (flat, peak, ridge, shoulder, spur, slope, hollow, etc)
    "hand", # height above the nearest drainage
    "northness", # northness index
    "pcurv", # profile curvature
    "roughness", # roughness index
    "slope", # slope
    "spi", # stream power index
    # --------------------------------------------------------
    "lulc", # land use and land cover class (MapBiomas C10)
    "bioma_nome", # biome name (IBGE)
    "rockyIndex", # distance from a rocky outcrop (censored at 7000 m)
    "sandyIndex", # distance from a sandy area (censored at 7000 m)
    # layer wise variables
    "camada_id", # unique identifier for each layer within a soil profile (id)
    "camada_nome", # name of the layer
    "profund_sup", # upper depth of the layer in cm
    "profund_inf", # lower depth of the layer in cm
    "esqueleto", # laboratory measurement of coarse fragments content (mass)
    "coarse_upper", # coarse fragments content of the upper layer (mass)
    "coarse_lower", # coarse fragments content of the lower layer (mass)
    "vrc", # volumetric rock content in the whole soil (%)
    "terrafina", # laboratory measurement of fine earth content
    "argila", # laboratory measurement of clay content
    "argila_upper", # clay content of the upper layer
    "argila_lower",  # clay content of the lower layer
    "silte", # laboratory measurement of silt content
    "silt_clay_ratio", # ratio between silt and clay content
    "areia", # laboratory measurement of sand content
    "areia_upper", # sand content of the upper layer
    "areia_lower",  # sand content of the lower layer
    "carbono", # laboratory measurement of soil organic carbon content
    "ctc", # laboratory measurement of cation exchange capacity
    "cec_clay_ratio", # ratio between CEC and clay content
    "ph", # laboratory measurement of soil pH
    "dsi", # laboratory measurement of soil bulk density
    "dsi_upper", # bulk density of the upper layer
    "dsi_lower", # bulk density of the lower layer
    "STONY", # presence of stones in the soil layer
    "ORGANIC", # organic layer (high carbon content)
    "AHRZN", # the layer is an A horizon
    "EHRZN", # the layer is an E horizon
    "BHRZN", # the layer is a B horizon
    "CHRZN", # the layer is a C horizon
    "DENSIC", # the layer has high bulk density
    "GLEY", # the layer is a gleyed layer
    # Soil properties from SoilGrids (process data so that it matches the layer depth)
    "bdod_00_05cm", # soil bulk density
    "bdod_05_15cm",
    "bdod_15_30cm",
    "bdod_30_60cm",
    "bdod_60_100cm",
    "bdod_100_200cm",
    "clay_00_05cm", # clay content
    "clay_05_15cm",
    "clay_15_30cm",
    "clay_30_60cm",
    "clay_60_100cm",
    "clay_100_200cm",
    "sand_00_05cm", # sand content
    "sand_05_15cm",
    "sand_15_30cm",
    "sand_30_60cm",
    "sand_60_100cm",
    "sand_100_200cm",
    "soc_00_05cm", # soil organic carbon content
    "soc_05_15cm",
    "soc_15_30cm",
    "soc_30_60cm",
    "soc_60_100cm",
    "soc_100_200cm",
    "cfvo_00_05cm", # coarse fragments content
    "cfvo_05_15cm",
    "cfvo_15_30cm",
    "cfvo_30_60cm",
    "cfvo_60_100cm",
    "cfvo_100_200cm",
    # Target variables =============================================================================
    "soc_density_gcm3_qmap", # soil organic carbon density (g/cm^3)
    "soc_stock_gm2_qmap", # soil organic carbon stock (g/m^2) in the layer
    "soc_stock_gm2_cum_qmap", # cummulative soil organic carbon stock (g/m^2) from the surface to the lower depth of the layer
    # Endpoint indicator (rock == no soil) =========================================================
    "is_rock" # boolean
  )
  soildata_soc <- soildata_soc[, ..cols_out]

  # Destination folder
  folder_path <- "res/tab/"
  file_name <- "soildata_soc_modeling_survival.csv"
  # List existing files in the folder_path and get the last one. Then read it.
  existing_files <- list.files(path = folder_path, pattern = file_name)
  write_out <- TRUE
  if (length(existing_files) > 0) {
    last_file <- existing_files[length(existing_files)]
    last_soildata_soc <- data.table::fread(paste0(folder_path, last_file))
    # Check if last_soildata_soc == soildata_soc. If not, write soildata_soc to disk.
    # Use all.equal() as it is more robust to type differences after a read/write cycle.
    # isTRUE() is needed because all.equal() returns a character string describing the difference if they are not equal, which would cause an error in an if() statement.
    if (isTRUE(all.equal(last_soildata_soc, soildata_soc))) {
      cat("No changes in SOC data. Not writing to disk.\n")
      write_out <- FALSE
    }
  }
  if (write_out) {
    cat("Writing SOC data to disk...\n")
    file_name <- paste0(collection, "_", format(Sys.time(), "%Y_%m_%d"), "_", file_name)
    file_path <- paste0(folder_path, file_name)
    data.table::fwrite(soildata_soc, file_path)
  }
} else {
  # Export SOC data for spatial modelling ##########################################################

  # Select columns and set order
  soc_cols <- c(
    "id", "coord_x", "coord_y", "data_ano", "profund_inf",
    "soc_stock_gm2_cum", "soc_stock_gm2_cum_qmap",
    "IFN_index", "YEAR_index", "PSEUDOROCK_index", "PSEUDOSAND_index"
  )
  soildata_soc_modeling <- soildata_soc[, ..soc_cols]
  # Rename columns
  data.table::setnames(soildata_soc_modeling, "coord_x", "longitude")
  data.table::setnames(soildata_soc_modeling, "coord_y", "latitude")
  data.table::setnames(soildata_soc_modeling, "data_ano", "ano")
  data.table::setnames(soildata_soc_modeling, "profund_inf", "profundidade")
  data.table::setnames(soildata_soc_modeling, "soc_stock_gm2_cum", "carbono_gm2")
  data.table::setnames(soildata_soc_modeling, "soc_stock_gm2_cum_qmap", "carbono_gm2_qmap")


  ncol(soildata_soc_modeling) # Result: 11 columns (variables)
  nrow(soildata_soc_modeling) # Result: 31047 rows (layers)
  nrow(unique(soildata_soc_modeling[, "id"])) # Result: 16013 unique soil profiles
  length(unique(sub("-.*$", "", soildata_soc_modeling$id))) # Result: 201 unique datasets

  # Destination folder
  folder_path <- "res/tab/"
  file_name <- "soildata_soc_modeling.csv"

  # List existing files in the folder_path and get the last one. Then read it.
  existing_files <- list.files(path = folder_path, pattern = file_name)
  write_out <- TRUE
  if (length(existing_files) > 0) {
    last_file <- existing_files[length(existing_files)]
    last_soildata_soc <- data.table::fread(paste0(folder_path, last_file))
    # Check if last_soildata_soc == soildata_soc. If not, write soildata_soc to disk.
    # Use all.equal() as it is more robust to type differences after a read/write cycle.
    # isTRUE() is needed because all.equal() returns a character string describing
    # the difference if they are not equal, which would cause an error in an if() statement.
    if (isTRUE(all.equal(last_soildata_soc, soildata_soc))) {
      cat("No changes in SOC data. Not writing to disk.\n")
      write_out <- FALSE
    }
  }
  if (write_out) {
    cat("Writing SOC data to disk...\n")
    file_name <- paste0(collection, "_", format(Sys.time(), "%Y_%m_%d"), "_", file_name)
    file_path <- paste0(folder_path, file_name)
    data.table::fwrite(soildata_soc, file_path)
  }

  # Load SOC data to Google Earth Engine ###########################################################
  # Using the API results in a more laborious process, as we need to chunk the data to avoid
  # exceeding the 10 MB payload limit per request. Thus, we upload the data mannually using the
  # GEE web interface.
  # URL: https://code.earthengine.google.com/
  # Location: projects/mapbiomas-workspace/SOLOS/AMOSTRAS/ORIGINAIS/collection3/
  # Asset name: the same as the CSV file name without the .csv extension

  # Export SOC data for platform ###################################################################

  # Select columns and set order
  soildata_soc_platform <- soildata_soc[
    !is.na(carbono) & !is.na(dsi) & !is.na(vrc) &
      !is.na(coord_x) & !is.na(coord_y) &
      !is.na(profund_sup) & !is.na(profund_inf),
    .(id, dataset_id, observacao_id,
    coord_x, coord_y,
    data_ano, YEAR_index,
    camada_id,
    profund_sup, profund_inf,
    carbono, dsi, vrc,
    bioma_nome, estado_nome, regiao_nome, municipio_nome)
  ]
  summary_soildata(soildata_soc_platform)
  # Layers: 31047
  # Events: 16013
  # Georeferenced events: 16013
  # Datasets:201

  # Remove pseudo-samples (rock-pseudo and sand-pseudo)
  # These samples are not real soil samples and were created to represent areas with rock
  # outcroppings and sandy soils for the purpose of spatial modelling.
  soildata_soc_platform <- soildata_soc_platform[
    !(grepl("rock-pseudo", id) | grepl("sand-pseudo", id)),
  ]
  summary_soildata(soildata_soc_platform)
  # Layers: 28047
  # Events: 15013
  # Georeferenced events: 15013
  # Datasets:199

  # Rename columns
  colnames(soildata_soc_platform)
  # coord_x -> longitude_grau
  # coord_y -> latitude_grau
  # data_ano -> ano_da_coleta
  # profund_sup -> profundidade_inicial_cm
  # profund_inf -> profundidade_final_cm
  # carbono -> carbono_organico_gkg
  # dsi -> densidade_do_solo_gcm3
  # vrc -> fracao_grossa_pv
  data.table::setnames(soildata_soc_platform, old = "coord_x", new = "longitude_grau")
  data.table::setnames(soildata_soc_platform, old = "coord_y", new = "latitude_grau")
  data.table::setnames(soildata_soc_platform, old = "data_ano", new = "ano_da_coleta")
  data.table::setnames(soildata_soc_platform, old = "profund_sup", new = "profundidade_inicial_cm")
  data.table::setnames(soildata_soc_platform, old = "profund_inf", new = "profundidade_final_cm")
  data.table::setnames(soildata_soc_platform, old = "carbono", new = "carbono_organico_gkg")
  data.table::setnames(soildata_soc_platform, old = "dsi", new = "densidade_do_solo_gcm3")
  data.table::setnames(soildata_soc_platform, old = "vrc", new = "fracao_grossa_pv")

  # Round numeric columns
  soildata_soc_platform[, carbono_organico_gkg := round(carbono_organico_gkg)]
  soildata_soc_platform[, densidade_do_solo_gcm3 := round(densidade_do_solo_gcm3, 2)]
  soildata_soc_platform[, fracao_grossa_pv := round(fracao_grossa_pv)]

  # Reset sampling year
  soildata_soc_platform[, ano_da_coleta := ano_da_coleta + YEAR_index]
  # Drop YEAR_index
  soildata_soc_platform[, YEAR_index := NULL]

  if (FALSE) {
    View(soildata_soc_platform)
  }

  # Export to a .csv file
  # Drop unnecessary columns
  soildata_soc_platform[, id := NULL]

  # Destination folder
  folder_path <- "res/tab/"
  file_name <- "_soildata_soc_platform.csv"

  # List existing files in the folder_path and get the last one. Then read it.
  existing_files <- list.files(path = folder_path, pattern = file_name)
  write_out <- TRUE
  if (length(existing_files) > 0) {
    last_file <- existing_files[length(existing_files)]
    last_soildata_soc <- data.table::fread(paste0(folder_path, last_file))
    # Check if last_soildata_psd == soildata_psd. If not, write soildata_psd to disk. Use all.equal()
    # as it is more robust to type differences after a read/write cycle. isTRUE() is needed because 
    # all.equal() returns a character string describing the difference if they are not equal, which
    # would cause an error in an if() statement.
    if (isTRUE(all.equal(last_soildata_soc, soildata_soc_platform))) {
      cat("No changes in SOC data. Not writing to disk.\n")
      write_out <- FALSE
    }
  }
  if (write_out) {
    cat("Writing SOC data to disk...\n")
    file_name <- paste0(collection, "_", format(Sys.time(), "%Y_%m_%d"), file_name)
    file_path <- paste0(folder_path, file_name)
    data.table::fwrite(soildata_soc_platform, file_path)
  }
}
