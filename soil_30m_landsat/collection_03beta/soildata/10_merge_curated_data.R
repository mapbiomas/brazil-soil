# title: MapBiomas Soil
# subtitle: 10. Merge curated data
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# data: 2025
rm(list = ls())

# Set MapBiomas Soil Collection
collection <- "c3"

# Auxiliary data and functions #####################################################################
# Source helper functions
source("src/00_helper_functions.r")

# Read Brazilian state boundaries from GeoJSON file
brazil_states <- sf::st_read("data/brazil_states.geojson")

# Curated data #####################################################################################
# Path to data curation repository
curated_path <- "~/projects/SoilData/SoilData-ctb"

# List all curated data files
curated_files <- list.files(
  path = path.expand(curated_path),
  pattern = "^ctb[0-9]{4}\\.csv$",
  full.names = TRUE, recursive = TRUE
)
length(curated_files) # 40 datasets
print(curated_files)

# If length(curated_files) is larger than 0, read all files and store them in a list
if (length(curated_files) > 0) {
  curated_list <- lapply(curated_files, data.table::fread)
  curated_data <- data.table::rbindlist(curated_list, fill = TRUE)
  curated_data[, id := paste0(dataset_id, "-", observacao_id)]
} else {
  warning("No curated files found")
}
summary_soildata(curated_data)
# Layers: 13347
# Events: 5855
# Georeferenced events: 5398
# Datasets: 40

# Error handling: Check for projected coordinates, printing the dataset_id of the rows with
# projected coordinates
proj_coords <- curated_data[!is.na(coord_x) & !is.na(coord_y) &
  (coord_x < -180 | coord_x > 180 | coord_y < -90 | coord_y > 90), ]
proj_coords <- unique(proj_coords$dataset_id)
if (length(proj_coords) > 0) {
  warning(
    "Projected coordinates found in the following dataset_id(s):\n",
    paste(unique(proj_coords), collapse = ", ")
  )
} else {
  message("No projected coordinates found. You can proceed.")
}
# Remove rows with projected coordinates from curated_data
curated_data <- curated_data[!dataset_id %in% proj_coords]
summary_soildata(curated_data)
# Layers: 13347
# Events: 5855
# Georeferenced events: 5398
# Datasets: 40

# Error handling: Check for points falling outside Brazil, printing the dataset_id of the rows
# with such points
curated_data_sf <- sf::st_as_sf(
  curated_data[!is.na(coord_x) & !is.na(coord_y)],
  coords = c("coord_x", "coord_y"), crs = 4326
)
curated_data_sf <- sf::st_join(curated_data_sf, brazil_states["abbrev_state"], left = TRUE)
outside_brazil <- curated_data_sf[is.na(curated_data_sf$abbrev_state), ]
outside_brazil <- unique(outside_brazil$dataset_id)
if (length(outside_brazil) > 0) {
  warning(
    "Points falling outside Brazil found in the following dataset_id(s):\n",
    paste(unique(outside_brazil), collapse = ", ")
  )
} else {
  message("No points falling outside Brazil found. You can proceed.")
}
# Remove rows with points falling outside Brazil from curated_data
curated_data <- curated_data[!dataset_id %in% outside_brazil]
summary_soildata(curated_data)
# Layers: 13347
# Events: 5855
# Georeferenced events: 5398
# Datasets: 40

# Brazilian Soil Dataset 2024 ######################################################################
# Check if "data/00_brazilian_soil_dataset_2024.txt" exists. If not, read the Brazilian Soil Dataset
# 2024 using the 'dataverse' package and write it to 'data/00_brazilian_soil_dataset_2024.txt'.
# If the file already exists, retrieve its creation date and compare it with the creation date of
# the dataset in Dataverse. If the local file is older than the dataset in Dataverse, re-download it.
# Otherwise, read the local file using the 'data.table' package.
file_path <- "data/00_brazilian_soil_dataset_2024.txt"
doi <- "10.60502/SoilData/BCAV2B"
download_data <- TRUE
if (file.exists(file_path)) {
  # Get the creation date of the local file
  file_info <- file.info(file_path)
  local_file_date <- as.Date(file_info$mtime)
  message("Local file creation date: ", local_file_date)

  # Get the creation date of the dataset in Dataverse
  dataset <- dataverse::get_dataset(
    dataset = doi,
    server = "https://repositorio.soildata.mapbiomas.org/dataverse/soildata"
  )
  remote_file_date <- as.Date(dataset$files$creationDate)
  message("Remote file creation date: ", remote_file_date)

  # Download only if the remote file is newer
  if (local_file_date >= remote_file_date) {
    download_data <- FALSE
    message("Local file is up-to-date. No need to download.")
  }
}
if (download_data) {
  br_soil2024 <- dataverse::get_dataframe_by_name("brazilian-soil-dataset-2024.txt",
    server = "https://repositorio.soildata.mapbiomas.org/dataverse/soildata",
    dataset = doi, .f = data.table::fread
  )
  data.table::fwrite(br_soil2024, file_path, dec = ".", sep = ";")
  message("File downloaded and saved to ", file_path)
} else {
  br_soil2024 <- data.table::fread(file_path, dec = ".", sep = ";")
}
br_soil2024[, id := paste0(dataset_id, "-", observacao_id)]
summary_soildata(br_soil2024)
# Layers: 57077
# Events: 16824
# Georeferenced events: 14334
# Datasets: 255

# Merge ############################################################################################
# Merge curated data with SoilData
# Remove from br_soil2024 the datasets that are present in curated_data
curated_ctb <- curated_data[, unique(dataset_id)]
br_soil2024 <- br_soil2024[!dataset_id %in% curated_ctb]
summary_soildata(br_soil2024)
# Layers: 47792
# Events: 13566
# Georeferenced events: 11117
# Datasets: 226
# Merge datasets, keeping all columns of both datasets
soildata <- data.table::rbindlist(list(br_soil2024, curated_data), fill = TRUE)
summary_soildata(soildata)
# Layers: 61139
# Events: 19421
# Georeferenced events: 16515
# Datasets: 266

# Check spatial distribution
if (FALSE) {
  soildata_sf <- soildata[!is.na(coord_x) & !is.na(coord_y)]
  soildata_sf <- sf::st_as_sf(soildata_sf, coords = c("coord_x", "coord_y"), crs = 4326)
  plot(soildata_sf["estado_id"], cex = 0.5, key.pos = 1, key.length = 1, reset = FALSE)
  plot(brazil_states$geom, add = TRUE, border = "gray50", lwd = 0.5)
}

# Export data ######################################################################################
summary_soildata(soildata)
# Layers: 61139
# Events: 19421
# Georeferenced events: 16515
# Datasets: 266
data.table::fwrite(soildata, "data/10_soildata.txt", sep = "\t")

# On 2026-04-01 ------------------------------------------------------------------------------------
# Improve dataset information for psd and soc platforms

# # Return from soildata three columns: dataset_id, dataset_titulo, and dataset_licenca
# datasets_info <- unique(soildata[, .(dataset_id, dataset_titulo, dataset_licenca)])
# # In column dataset_licenca, delete "OpenData: Creative Commons Attribution 4.0"
# datasets_info[, dataset_licenca := gsub("OpenData: Creative Commons Attribution 4.0", "", dataset_licenca)]
# # In column dataset_licenca, delete "notOpenData: Creative Commons Attribution-NonCommercial"
# datasets_info[, dataset_licenca := gsub("notOpenData: Creative Commons Attribution-NonCommercial", "", dataset_licenca)]
# # Delete Atribuição-NãoComercial-CompartilhaIgual
# datasets_info[, dataset_licenca := gsub("Atribuição-NãoComercial-CompartilhaIgual", "", dataset_licenca)]
# # Delete Atribuição-NãoComercial
# datasets_info[, dataset_licenca := gsub("Atribuição-NãoComercial", "", dataset_licenca)]
# # Delete Atribuição
# datasets_info[, dataset_licenca := gsub("Atribuição", "", dataset_licenca)]
# # In column dataset_licenca, delete any ( or )
# datasets_info[, dataset_licenca := gsub("[()]", "", dataset_licenca)]
# # Delete trailing and leading whitespace in dataset_licenca
# datasets_info[, dataset_licenca := trimws(dataset_licenca)]
# datasets_info[, unique(dataset_licenca)]

# # In column dataset_titulo, replace \"\" with "
# datasets_info[, dataset_titulo := gsub("\\\"\\\"", "\"", dataset_titulo)]

# psd <- data.table::fread("/home/alessandro/Documents/c3_soildata_psd_platform.csv")
# dim(psd)
# # merge psd with datasets_info by dataset_id, keeping all rows of psd and adding dataset_titulo and dataset_licenca from datasets_info
# psd <- merge(psd, datasets_info, by = "dataset_id", all.x = TRUE)
# dim(psd)

# soc <- data.table::fread("/home/alessandro/Documents/c3_soildata_soc_platform.csv")
# dim(soc)
# # merge soc with datasets_info by dataset_id, keeping all rows of soc and adding dataset_titulo and dataset_licenca from datasets_info
# soc <- merge(soc, datasets_info, by = "dataset_id", all.x = TRUE)
# dim(soc)
# # write soc to disk
# file_path <- paste0("res/tab/", collection, "_soildata_soc_platform.csv")
# data.table::fwrite(soc, file_path, sep = ",")

# # from soc, get dataset_id, observacao_id, and ano_da_coleta
# soc_info <- unique(soc[, .(dataset_id, observacao_id, ano_da_coleta)])
# # drop rows where dataset_id is not in psd
# # soc_info <- soc_info[dataset_id %in% psd$dataset_id]

# # merge psd with soc_info by dataset_id and observacao_id, keeping all rows of psd (but not from
# # soc_info) and adding ano_da_coleta from soc_info
# psd <- merge(psd, soc_info, by = c("dataset_id", "observacao_id"), all.x = TRUE)
# dim(psd)

# # Check if there are duplicated rows in psd by dataset_id, observacao_id, profundidade_inicial_cm,
# # and profundidade_final_cm
# psd[, duplicated1 := duplicated(psd, by = c("dataset_id", "observacao_id", "profundidade_inicial_cm", "profundidade_final_cm"))]
# psd[, duplicated2 := duplicated(psd, by = c("dataset_id", "observacao_id", "profundidade_inicial_cm", "profundidade_final_cm"), fromLast = TRUE)]

# # drop duplicated1 == TRUE
# psd <- psd[duplicated1 == FALSE]
# dim(psd)
# # drop fields duplicated1 and duplicated2
# psd[, c("duplicated1", "duplicated2") := NULL]
# dim(psd)

# # write psd to disk
# file_path <- paste0("res/tab/", collection, "_soildata_psd_platform.csv")
# data.table::fwrite(psd, file_path, sep = ",")
# --------------------------------------------------------------------------------------------------