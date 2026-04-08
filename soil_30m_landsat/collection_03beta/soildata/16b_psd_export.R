# title: MapBiomas Soil
# subtitle: 16b. Export Particle Size Distribution - SoilData Platform
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# data: 2025

rm(list = ls())

# Set MapBiomas Soil Collection
collection <- "c3"

# Source helper functions and packages
source("src/00_helper_functions.r")

# LOAD SOILDATA ####################################################################################
# Read SoilData data processed in the previous script
file_path <- "data/15_soildata.txt"
soildata <- data.table::fread(file_path, sep = "\t", na.strings = c("", "NA", "NaN"))
summary_soildata(soildata)
# Layers: 72125
# Events: 19884
# Georeferenced events: 17368
# Datasets: 267

# Deal with missing data
soildata[esqueleto == 1000, argila := 0]
soildata[esqueleto == 1000, silte := 0]
soildata[esqueleto == 1000, areia := 0]

# PARTICLE SIZE DISTRIBUTION #######################################################################
# Create a data.table with the particle size distribution
# The target variables are skeleton (esqueleto), argila (clay), silte (silt), and areia (sand). We
# also need the coordinates (coord_x, coord_y) and the depth interval (profund_sup, profund_inf).
soildata_psd <- soildata[
  !is.na(esqueleto) & !is.na(argila) & !is.na(silte) & !is.na(areia) &
    !is.na(coord_x) & !is.na(coord_y) &
    !is.na(profund_sup) & !is.na(profund_inf),
  .(id, dataset_id, observacao_id,
  coord_x, coord_y, camada_id,
  profund_sup, profund_inf,
  esqueleto, argila, silte, areia)
]
summary_soildata(soildata_psd)
# Layers: 56058
# Events: 14944
# Georeferenced events: 14944
# Datasets: 197

# DATA CLEANING ###################################################################################

# Remove pseudo-samples (rock-pseudo and sand-pseudo)
# These samples are not real soil samples and were created to represent areas with rock
# outcroppings and sandy soils for the purpose of spatial modelling.
soildata_psd <- soildata_psd[
  !(grepl("rock-pseudo", id) | grepl("sand-pseudo", id)),
]
summary_soildata(soildata_psd)
# Layers: 46058
# Events: 13944
# Georeferenced events: 13944
# Datasets: 195

# Remove rows with coarse fraction (esqueleto) equal to 1000 g/kg
# These samples do not contain any fine earth fraction and were created to represent rock layers
# for the purpose of spatial modelling.
# soildata_psd <- soildata_psd[esqueleto < 1000, ]
# summary_soildata(soildata_psd)
# Layers: 45409
# Events: 13918
# Georeferenced events: 13918
# Datasets: 192

# Drop rows with depth (profund_inf) > 100
# These samples were not considered for the MapBiomas Soil project.
soildata_psd <- soildata_psd[profund_inf <= 100, ]
summary_soildata(soildata_psd)
# Layers: 42561
# Events: 13920
# Georeferenced events: 13920
# Datasets: 194

# Check if the sum of the fractions is equal to 1000 g/kg (i.e., 100%)
soildata_psd[, soma_fractions := areia + silte + argila]
soildata_psd[esqueleto == 0 & soma_fractions != 1000, ]
# No rows found where esqueleto == 0 and sum of fractions != 1000
soildata_psd[, soma_fractions := NULL]

# Check spatial distribution of samples
if (FALSE) {
  soildata_psd_sf <- sf::st_as_sf(
    soildata_psd,
    coords = c("coord_x", "coord_y"),
    crs = 4326,
    remove = FALSE
  )
  mapview::mapview(soildata_psd_sf, zcol = "argila", legend = TRUE)
  rm(soildata_psd_sf)
}

# Rename columns
colnames(soildata_psd)
# coord_x -> longitude_grau
# coord_y -> latitude_grau
# profund_sup -> profundidade_inicial_cm
# profund_inf -> profundidade_final_cm
# areia -> fracao_areia_gkg
# argila -> fracao_argila_gkg
# silte -> fracao_silte_gkg
# esqueleto -> fracao_grossa_gkg
data.table::setnames(soildata_psd, old = "coord_x", new = "longitude_grau")
data.table::setnames(soildata_psd, old = "coord_y", new = "latitude_grau")
data.table::setnames(soildata_psd, old = "profund_sup", new = "profundidade_inicial_cm")
data.table::setnames(soildata_psd, old = "profund_inf", new = "profundidade_final_cm")
data.table::setnames(soildata_psd, old = "areia", new = "fracao_areia_gkg")
data.table::setnames(soildata_psd, old = "argila", new = "fracao_argila_gkg")
data.table::setnames(soildata_psd, old = "silte", new = "fracao_silte_gkg")
data.table::setnames(soildata_psd, old = "esqueleto", new = "fracao_grossa_gkg")

# Sort rows by id, profundidade_inicial_cm, profundidade_final_cm and set camada_id accordingly
data.table::setorder(soildata_psd, id, profundidade_inicial_cm, profundidade_final_cm)
soildata_psd[, camada_id := seq_len(.N), by = id]
if (FALSE) {
  View(soildata_psd)
}

# Number of unique events
n_events <- nrow(soildata_psd[, .N, by = id])
# Number of layers
n_layers <- nrow(soildata_psd)

# ADD METADATA FOR SPATIAL FILTERING ###############################################################
old_s2 <- sf::sf_use_s2()
sf::sf_use_s2(FALSE)

# Convert soildata_psd to sf object, keeping a single point per id
soildata_psd_sf <- sf::st_as_sf(
  soildata_psd[camada_id == 1, .(id, longitude_grau, latitude_grau)],
  coords = c("longitude_grau", "latitude_grau"),
  crs = 4326,
  remove = FALSE
)
print(soildata_psd_sf)
nrow(soildata_psd_sf) == n_events

# Intersect with Brazilian biomes
brazil_biomes <- sf::st_read("data/brazil_biomes.geojson", quiet = TRUE)
soildata_psd_sf <- sf::st_join(
  soildata_psd_sf,
  brazil_biomes[-7, "name_biome"],
  left = TRUE
)
# Check number of points
nrow(soildata_psd_sf) == n_events
# Mapview points without biome
if (FALSE) {
  no_biome <- soildata_psd_sf[is.na(soildata_psd_sf$name_biome), ]
  mapview::mapview(brazil_biomes) +
    mapview::mapview(no_biome, col.region = "red")
  rm(no_biome)
}
# Set biome
# id == ctb0033-RO2658: Amazônia
# id == ctb0664-PERFIL-15: Amazônia
# id == ctb0572-E.258: Mata Atlântica
# id == 	ctb0599-AC-17: Mata Atlântica
soildata_psd_sf$name_biome[soildata_psd_sf$id == "ctb0033-RO2658"] <- "Amazônia"
soildata_psd_sf$name_biome[soildata_psd_sf$id == "ctb0664-PERFIL-15"] <- "Amazônia"
soildata_psd_sf$name_biome[soildata_psd_sf$id == "ctb0572-E.258"] <- "Mata Atlântica"
soildata_psd_sf$name_biome[soildata_psd_sf$id == "ctb0599-AC-17"] <- "Mata Atlântica"

# Intersect with Brazilian states
brazil_states <- sf::st_read("data/brazil_states.geojson", quiet = TRUE)
soildata_psd_sf <- sf::st_join(
  soildata_psd_sf,
  brazil_states["name_state"],
  left = TRUE
)
# Check number of points
nrow(soildata_psd_sf) == n_events
# Mapview points without state
if (FALSE) {
  no_state <- soildata_psd_sf[is.na(soildata_psd_sf$name_state), ]
  mapview::mapview(brazil_states) +
    mapview::mapview(no_state, col.region = "red")
  rm(no_state)
}
# Set state
# id == name_state: Rio de Janeiro
soildata_psd_sf$name_state[soildata_psd_sf$id == "name_state"] <- "Rio de Janeiro"

# Intersect with Brazilian regions
brazil_regions <- sf::st_read("data/brazil_regions.geojson", quiet = TRUE)
soildata_psd_sf <- sf::st_join(
  soildata_psd_sf,
  brazil_regions["name_region"],
  left = TRUE
)
# Check number of points
nrow(soildata_psd_sf) == n_events
# Mapview points without region
if (FALSE) {
  no_region <- soildata_psd_sf[is.na(soildata_psd_sf$name_region), ]
  mapview::mapview(brazil_regions) +
    mapview::mapview(no_region, col.region = "red")
  rm(no_region)
}
# Set region
# id == ctb0599-AC-17: Sudeste
soildata_psd_sf$name_region[soildata_psd_sf$id == "ctb0599-AC-17"] <- "Sudeste"

# Intersect with Brazilian municipalities
brazil_municipalities <- sf::st_read("data/brazil_municipalities.geojson", quiet = TRUE)
brazil_municipalities$name_muni <- paste0(
  brazil_municipalities$name_muni,
  " - ",
  brazil_municipalities$abbrev_state,
  " - ",
  brazil_municipalities$code_muni
)
soildata_psd_sf <- sf::st_join(
  soildata_psd_sf,
  brazil_municipalities["name_muni"],
  left = TRUE
)
# Check number of points
nrow(soildata_psd_sf) == n_events
# Mapview points without municipality
if (FALSE) {
  no_muni <- soildata_psd_sf[is.na(soildata_psd_sf$name_muni), ]
  mapview::mapview(brazil_municipalities) +
    mapview::mapview(no_muni, col.region = "red")
  rm(no_muni)
}
# Set municipality
# id == ctb0599-AC-17: Rio de Janeiro - RJ - 3304557
soildata_psd_sf$name_muni[soildata_psd_sf$id == "ctb0599-AC-17"] <- "Rio de Janeiro - RJ - 3304557"

# Merge metadata back to soildata_psd
soildata_psd_sf <- data.table::as.data.table(soildata_psd_sf)
nrow(soildata_psd_sf) == n_events
soildata_psd_sf[, geometry != NULL]
soildata_psd <- merge(
  soildata_psd,
  soildata_psd_sf[, .(id, name_biome, name_state, name_region, name_muni)],
  by = "id"
)
# Check number of layers
nrow(soildata_psd) == n_layers
if (FALSE) {
  View(soildata_psd)
}

# Rename columns
data.table::setnames(soildata_psd, old = "name_biome", new = "bioma_nome")
data.table::setnames(soildata_psd, old = "name_state", new = "estado_nome")
data.table::setnames(soildata_psd, old = "name_region", new = "regiao_nome")
data.table::setnames(soildata_psd, old = "name_muni", new = "municipio_nome")

# Restore s2 processing
sf::sf_use_s2(old_s2)

# EXPORT ###########################################################################################
# Export the particle size distribution data.table to a .csv file

# Drop unnecessary columns
soildata_psd[, id := NULL]

# Destination folder
folder_path <- "res/tab/"
file_name <- "_soildata_psd_platform.csv"

# List existing files in the folder_path and get the last one. Then read it.
existing_files <- list.files(path = folder_path, pattern = file_name)
write_out <- TRUE
if (length(existing_files) > 0) {
  last_file <- existing_files[length(existing_files)]
  last_soildata_psd <- data.table::fread(paste0(folder_path, last_file))
  # Check if last_soildata_psd == soildata_psd. If not, write soildata_psd to disk. Use all.equal()
  # as it is more robust to type differences after a read/write cycle. isTRUE() is needed because 
  # all.equal() returns a character string describing the difference if they are not equal, which
  # would cause an error in an if() statement.
  if (isTRUE(all.equal(last_soildata_psd, soildata_psd))) {
    cat("No changes in PSD data. Not writing to disk.\n")
    write_out <- FALSE
  }
}
if (write_out) {
  cat("Writing PSD data to disk...\n")
  file_name <- paste0(collection, "_", format(Sys.time(), "%Y_%m_%d"), file_name)
  file_path <- paste0(folder_path, file_name)
  data.table::fwrite(soildata_psd, file_path)
}
