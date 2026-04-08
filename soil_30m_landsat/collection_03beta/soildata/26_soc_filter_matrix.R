# title: MapBiomas Soil
# subtitle: 26. Filter SOC Design Matrix
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2025
rm(list = ls())

# Source helper functions
source("src/00_helper_functions.r")

# Read data from disk ##############################################################################
soildata <- read_insync("c03_soc_v2025_11_26_trep.csv")
dim(soildata)
# 35235   164

# Drop rows ########################################################################################
# Drop samples with PSEUDOROCK_index == 1 and afloramento == 0
soildata <- soildata[!(PSEUDOROCK_index == 1 & afloramento == 0)]
dim(soildata)
# 34164   164

# Drop samples with PSEUDOSAND_index == 1 and areia == 0
soildata <- soildata[!(PSEUDOSAND_index == 1 & areia == 0)]
dim(soildata)
# 33891   164

# Drop samples with PSEUDOROCK_index == 1 and mb_ndvi_median_decay > 147
soildata <- soildata[!(PSEUDOROCK_index == 1 & mb_ndvi_median_decay > 147)]
dim(soildata)
# 33471   164

# Drop samples with PSEUDOROCK_index == 1 and black_soil_prob > 10
soildata <- soildata[!(PSEUDOROCK_index == 1 & black_soil_prob > 10)]
dim(soildata)
# 33285   164

# Drop samples with PSEUDOROCK_index == 1 and argila_000_030cm > 0
soildata <- soildata[!(PSEUDOROCK_index == 1 & argila_000_030cm > 0)]
dim(soildata)
# 33240   164

# Drop samples with PSEUDOSAND_index == 1 and argila_000_030cm > 0
soildata <- soildata[!(PSEUDOSAND_index == 1 & argila_000_030cm > 0)]
dim(soildata)
# 33174   164

# Drop samples with PSEUDOSAND_index == 1 and black_soil_prob > 10
soildata <- soildata[!(PSEUDOSAND_index == 1 & black_soil_prob > 10)]
dim(soildata)
# 32712   164

# Drop samples with PSEUDOSAND_index == 1 and Wetsols > 10
soildata <- soildata[!(PSEUDOSAND_index == 1 & Wetsols > 10)]
dim(soildata)
# 32433   164

# Drop samples with IFN_index == 1 and restingas > 0
soildata <- soildata[!(IFN_index == 1 & restingas > 0)]
dim(soildata)
# 32409   164

# Filter out samples with YEAR_index == -26 and restigas > 0
soildata <- soildata[!(YEAR_index == -26 & restingas > 0)]
dim(soildata)
# 32407   164

# Filter out samples with black_soil_prob > 10 and areia > 0
soildata <- soildata[!(black_soil_prob > 10 & areia > 0)]
dim(soildata)
# 32406   164

# Filter out samples with black_soil_prob > 50 and areia_000_030cm > 70
soildata <- soildata[!(black_soil_prob > 50 & areia_000_030cm > 70)]
dim(soildata)
# 32404   164

# Filter out samples with PSEUDOSAND_index == 0 and PSEUDOROCK_index == 0 and
# mb_evi2_median_decay < 100 and Water_40y_recurrence > 0
soildata <- soildata[
  !(PSEUDOSAND_index == 0 & PSEUDOROCK_index == 0 & mb_evi2_median_decay < 100 &
    Water_40y_recurrence > 0)
]
dim(soildata)
# 32399   164









# Drop columns #####################################################################################
# Drop columns not needed for modeling
soildata <- soildata[, c("system:index", ".geo") := NULL]
dim(soildata)
# 32433  162

# Drop constant covariates #########################################################################
# We check for covariates that are constant (zero variance) across all samples.

# Check which covariates are constant
constant_columns <- sapply(soildata, function(x) length(unique(x)) == 1)

# Print the names of the constant covariates
constant_colnames <- names(soildata)[constant_columns]
if (length(constant_colnames) == 0) {
  print("No constant covariates found.")
} else {
  print("Constant covariates found:")
  print(constant_colnames)
  # Remove constant covariates
  soildata <- soildata[, !constant_columns, with = FALSE]
}
# "koppen_l3_Csb" "koppen_l3_Cwc"

# Check the data
dim(soildata)
# 32433   160

# Drop small sample size covariates ################################################################
# We assess binary covariates (0/1) created from categorical covariates. These covariates may have
# very few samples for the 1 class, which means that the model cannot learn from them.
# Minimum number of samples for the 1 class: 30
min_sample_size <- 30

# Identify which covariates are binary, i.e., have only two unique values (0 and 1)
binary_columns <- sapply(soildata, function(x) length(unique(x)) == 2)
# Print the names of the binary covariates
binary_colnames <- names(soildata)[binary_columns]
if (length(binary_colnames) == 0) {
  print("No binary covariates found.")
} else {
  print("Binary covariates found:")
  print(binary_colnames)
}

# Count the number of occurrences of 1 in each binary covariate
binary_counts <- sapply(soildata[, ..binary_colnames], function(x) sum(x == 1))
# Identify binary covariates with less than min_sample_size occurrences of 1
low_sample_size_covars <- names(binary_counts[binary_counts < min_sample_size])
if (length(low_sample_size_covars) == 0) {
  print("No binary covariates with less than 30 occurrences of 1 found.")
} else {
  print("Binary covariates with less than 30 occurrences of 1 found:")
  print(binary_counts[low_sample_size_covars])
}
# Gurupi_Provincia: 3
# Sao_Luis_Provincia: 8
# latossolo_plutonicas: 7
# koppen_l3_Csa: 2
# koppen_l3_Csa: 2

# Remove small sample size covariates
covars2drop <- c(low_sample_size_covars)
soildata <- soildata[, !..covars2drop]

# Check the data again
dim(soildata)
# 32433   155

# Near-zero variance covariates ####################################################################
# We identify covariates with near-zero variance.

# Get the names of the covariates
near_zero_variance_covars <- caret::nearZeroVar(
  soildata,
  freqCut = 1000 / 1,
  uniqueCut = 10,
  saveMetrics = TRUE
)
near_zero_names <- rownames(near_zero_variance_covars)[near_zero_variance_covars$nzv]
if (length(near_zero_names) == 0) {
  print("No covariates with near-zero variance found.")
} else {
  print("Covariates with near-zero variance:")
  print(near_zero_variance_covars[near_zero_names, ])
}
#                     freqRatio percentUnique zeroVar  nzv
# NEOSSOLO_REGOLITICO  1071.258   0.006016847   FALSE TRUE
# lavourasPerene       1507.727   0.060168472   FALSE TRUE

# Remove near-zero variance covariates
soildata <- soildata[, !..near_zero_names]
# Check the data again
dim(soildata)
# 32433   153

# High correlation covariates ######################################################################
# We identify and remove covariates with high correlation (absolute Spearman correlation
# >= 0.95).
max_correlation <- 0.95

# Get the names of the binary covariates (ignore them in the correlation analysis)
is_binary <- sapply(soildata, function(x) length(unique(x)) == 2)
# Get the names of the quantitative covariates
is_numeric <- sapply(soildata, is.numeric)
# Get the names of the covariates to analyze for correlation
covars_names <- colnames(soildata)[is_numeric & !is_binary]

# Compute the correlation matrix only for quantitative covariates
correlation_matrix <- cor(
  soildata[, ..covars_names],
  method = "spearman",
  use = "pairwise.complete.obs"
)

# Identify highly correlated covariates
high_correlation <- which(abs(correlation_matrix) >= max_correlation, arr.ind = TRUE)
high_correlation <- high_correlation[high_correlation[, 1] != high_correlation[, 2], ]
high_correlation <- high_correlation[order(high_correlation[, 1]), ]
if (nrow(high_correlation) == 0) {
  print("No covariates with high correlation found.")
} else {
  print("Covariates with high correlation:")
  print(high_correlation)
}
# remove lavourasTemp: high correlation with lavouras (and lavourasPerene was already removed)
# remove mb_water_recurrence_dynamic: high correlation with mb_edges (WHY?)
# remove mb_fireRecurrence: high correlation with mb_fire_time_after_fire
# remove elev_stdev: high correlation with slope and roughness
# remove roughness: high correlation with slope (and elev_stdev was already removed)
# remove mb_savi_median_decay: high correlation with mb_evi2_median_decay
covars2drop <- c(
  "lavourasTemp",
  "mb_water_recurrence_dynamic",
  "mb_fireRecurrence",
  "elev_stdev",
  "roughness",
  "mb_savi_median_decay"
)
soildata <- soildata[, !..covars2drop]

# Check the data again
dim(soildata)
# 32433   147

# Save the cleaned design matrix to disk ###########################################################
file_path <- "data/25_soildata.txt"
data.table::fwrite(soildata, file_path, sep = "\t")
