# title: MapBiomas Soil
# subtitle: 19c. Validation of the PSD Model
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2026
# description: 

# 1. Set up the environment ========================================================================
rm(list = ls())

# Source helper functions
source("src/00_helper_functions.r")

# Set MapBiomas Soil Collection
collection <- "c3"

# 2. Training data =================================================================================
# The training data was prepared in Google Earth Engine.

# 2.1 Read data from disk --------------------------------------------------------------------------
soildata <- read_insync("c03_psd_v2025_trainingFinal.csv")
# Check the data
dim(soildata)
# 57452   135
sort(colnames(soildata))

# 2.2 Prepare data ---------------------------------------------------------------------------------
# Rename column 'id' to 'dataset_id'
data.table::setnames(soildata, "id", "dataset_id")

# Drop unnecessary columns
covars2drop <- c(
  "system:index", ".geo",
  "koppen_l3_Csb", # gbm complained: koppen_l3_Csb has no variation
  "koppen_l3_Cwc" # gbm complained: koppen_l3_Cwc has no variation
)
soildata <- soildata[, !..covars2drop]
# Check the data
dim(soildata)
# 57452   131
length(unique(soildata$dataset_id))
# 15361

# 2.3 Identify additional duplicates ---------------------------------------------------------------
# Check for additional duplicated records based on columns dataset_id and profundidade. Thuse
# dupplicates were created in Google Earth Engine.
# If a record is duplicated, append the suffix "clay-copy-" to the dataset_id. This may need to be
# done iteratively until no duplicates remain unidentified as such, as some records may be
# duplicated more than twice.
dups <- soildata[, .N, by = .(dataset_id, profundidade)][N > 1L]
while (nrow(dups) > 0L) {
  for (i in seq_len(nrow(dups))) {
    id_dup <- dups[i, dataset_id]
    prof_dup <- dups[i, profundidade]
    idx_dup <- which(soildata$dataset_id == id_dup & soildata$profundidade == prof_dup)
    if (length(idx_dup) > 1L) {
      for (j in seq_along(idx_dup)[-1L]) {
        soildata[idx_dup[j], dataset_id := paste0("clay-copy-", dataset_id)]
      }
    }
  }
  dups <- soildata[, .N, by = .(dataset_id, profundidade)][N > 1L]
}
rm(dups)
# Check the data
dim(soildata)
# 57452   131
length(unique(soildata$dataset_id))
# 15439

# Target variables
target_variable <- c("log_areia1p_argila1p", "log_esqueleto1p_argila1p", "log_silte1p_argila1p")

# Target depths
target_depth <- seq(5, 95, by = 10)
target_window <- 5 # target depth - target window <= profundidade <= target depth + target window

# 2.4 Convert target variables back to original scale ----------------------------------------------
# The target variables were treated as compositional data in Google Earth Engine, and thus
# transformed using the log-ratio transformation. To convert them back to the original scale, we
# need to apply the inverse of the log-ratio transformation, and also account for the added constant
# to avoid log(0).

# The back-transform to obtain each of the four individual fractions is as follows:
# argila = exp(0) / (1 + exp(log_silte1p_argila1p) + exp(log_areia1p_argila1p) + exp(log_esqueleto1p_argila1p))
# silte = exp(log_silte1p_argila1p) * argila
# areia = exp(log_areia1p_argila1p) * argila
# esqueleto = exp(log_esqueleto1p_argila1p) * argila
soildata[
  ,
  argila := exp(0) / (1 + exp(log_silte1p_argila1p) + exp(log_areia1p_argila1p) + exp(log_esqueleto1p_argila1p))
]
soildata[, silte := exp(log_silte1p_argila1p) * argila]
soildata[, areia := exp(log_areia1p_argila1p) * argila]
soildata[, esqueleto := exp(log_esqueleto1p_argila1p) * argila]
# Check if the proportions sum to 1
soildata[, sum_prop := argila + silte + areia + esqueleto]
print(soildata[abs(sum_prop - 1.0) > 1e-9])
soildata[, sum_prop := NULL] # Remove the temporary "total1p_test" column

# Then multiply each fraction by the total sum of fractions (1004 g/kg) to get the absolute
# values, subtract 1 from each fraction to revert the +1 adjustment, and round to the nearest
# integer:
# argila = round(argila * 1004 - 1)
# silte = round(silte * 1004 - 1)
# areia = round(areia * 1004 - 1)
# esqueleto = round(esqueleto * 1004 - 1)
soildata[, argila := round(argila * 1004 - 1)]
soildata[, silte := round(silte * 1004 - 1)]
soildata[, areia := round(areia * 1004 - 1)]
soildata[, esqueleto := round(esqueleto * 1004 - 1)]
# Check if the proportions sum to 1000 g/kg
soildata[, total_test := argila + silte + areia + esqueleto]
print(soildata[total_test != 1000, ])
soildata[, total_test := NULL] # Remove the temporary "total_test" column

# Next, set any negative value to zero (should not happen)
# Check for negative values
print(soildata[argila < 0 | silte < 0 | areia < 0 | esqueleto < 0, ])

# Rescale clay, silt, and sand back to fine-earth basis (relative to < 2 mm fraction).
# Do not coerce tiny fine-earth cases at this stage; keep values as-is for downstream cleaning.
soildata[
  esqueleto < 1000L,
  argila := round(argila / (1000 - esqueleto) * 1000)
]
soildata[
  esqueleto < 1000L,
  silte := round(silte / (1000 - esqueleto) * 1000)
]
soildata[
  esqueleto < 1000L,
  areia := round(areia / (1000 - esqueleto) * 1000)
]
# Set fine fractions to zero when esqueleto >= 1000 (100% coarse material)
soildata[esqueleto >= 1000L, argila := 0L]
soildata[esqueleto >= 1000L, silte := 0L]
soildata[esqueleto >= 1000L, areia := 0L]
soildata[, total_test := argila + silte + areia]
table(soildata[esqueleto < 1000L & total_test != 1000, total_test])
#  999 1001
# 3173 3248
# Rescale the clay, silt, and sand fractions to ensure they sum to 1000 g/kg on a fine-earth basis.
# Add the residual to the largest fraction to minimize the impact of the adjustment on the
# composition.
soildata[
  esqueleto < 1000L,
  residual := 1000L - (argila + silte + areia)
]
soildata[, largest_fraction := 0L]
soildata[
  esqueleto < 1000L,
  largest_fraction := max.col(.SD, ties.method = "first"),
  .SDcols = c("argila", "silte", "areia")
]
soildata[esqueleto < 1000L & largest_fraction == 1L, argila := argila + residual]
soildata[esqueleto < 1000L & largest_fraction == 2L, silte := silte + residual]
soildata[esqueleto < 1000L & largest_fraction == 3L, areia := areia + residual]
soildata[, c("residual", "largest_fraction") := NULL]
# Check if the proportions sum to 1000 g/kg on a fine-earth basis
soildata[, total_test := argila + silte + areia]
print(soildata[esqueleto < 1000L & total_test != 1000, .N])
soildata[, total_test := NULL]

# 3. Cross-validation data =========================================================================
# 5-fold cross-validation with grouped folds was performed in the script "19b_psd_cross_validation.R"

# 3.1 Read data from disk --------------------------------------------------------------------------
cv_pred_file_path <- paste0("res/tab/", collection, "_psd_gbm_cross_validation_raw.csv")
cv_predictions <- data.table::fread(cv_pred_file_path)
dim(cv_predictions)
# 57452     7

# 3.2 Prepare data ---------------------------------------------------------------------------------
# pred_log_areia1p_argila1p, pred_log_esqueleto1p_argila1p, pred_log_silte1p_argila1p
# The CV predictions are on the same additive log-ratio scale as the training targets, so we apply
# the same inverse transform used above and keep the results in dedicated "pred_" columns.
cv_predictions[, pred_argila := exp(0) / (
  1 + exp(pred_log_silte1p_argila1p) + exp(pred_log_areia1p_argila1p) + exp(pred_log_esqueleto1p_argila1p)
)]
cv_predictions[, pred_silte := exp(pred_log_silte1p_argila1p) * pred_argila]
cv_predictions[, pred_areia := exp(pred_log_areia1p_argila1p) * pred_argila]
cv_predictions[, pred_esqueleto := exp(pred_log_esqueleto1p_argila1p) * pred_argila]

# Check for negative values
print(cv_predictions[pred_argila < 0 | pred_silte < 0 | pred_areia < 0 | pred_esqueleto < 0, .N])
# 0

# Check if the proportions sum to 1
cv_predictions[, pred_sum_prop := pred_argila + pred_silte + pred_areia + pred_esqueleto]
print(cv_predictions[abs(pred_sum_prop - 1.0) > 1e-9, .N])
cv_predictions[, pred_sum_prop := NULL]

# Then multiply each fraction by the total sum of fractions (1004 g/kg) to get the absolute
# values, subtract 1 from each fraction to revert the +1 adjustment, and round to the nearest
# integer.
cv_predictions[, pred_argila := round(pred_argila * 1004 - 1)]
cv_predictions[, pred_silte := round(pred_silte * 1004 - 1)]
cv_predictions[, pred_areia := round(pred_areia * 1004 - 1)]
cv_predictions[, pred_esqueleto := round(pred_esqueleto * 1004 - 1)]

# Check for negative values
print(cv_predictions[pred_argila < 0 | pred_silte < 0 | pred_areia < 0 | pred_esqueleto < 0, .N])
# 41
# Print the negative values
print(cv_predictions[
  pred_argila < 0 | pred_silte < 0 | pred_areia < 0 | pred_esqueleto < 0,
  .(pred_argila, pred_silte, pred_areia, pred_esqueleto)
])
# All negative values are equal to -1, which is the expected value for samples with zero proportion
# of the respective fraction in the training data, and thus should be set to zero.
cv_predictions[pred_argila < 0, pred_argila := 0L]
cv_predictions[pred_silte < 0, pred_silte := 0L]
cv_predictions[pred_areia < 0, pred_areia := 0L]
cv_predictions[pred_esqueleto < 0, pred_esqueleto := 0L]
# Check for negative values
print(cv_predictions[pred_argila < 0 | pred_silte < 0 | pred_areia < 0 | pred_esqueleto < 0, .N])

# Check if the proportions sum to 1000 g/kg
cv_predictions[, pred_total_test := pred_argila + pred_silte + pred_areia + pred_esqueleto]
table(cv_predictions[pred_total_test != 1000, pred_total_test])
#   999  1001  1002 
# 11189  9269    29
cv_predictions[, pred_residual := 1000L - pred_total_test]
cv_predictions[
  , pred_largest_fraction := max.col(.SD, ties.method = "first"),
  .SDcols = c("pred_argila", "pred_silte", "pred_areia", "pred_esqueleto")
]
cv_predictions[pred_largest_fraction == 1L, pred_argila := pred_argila + pred_residual]
cv_predictions[pred_largest_fraction == 2L, pred_silte := pred_silte + pred_residual]
cv_predictions[pred_largest_fraction == 3L, pred_areia := pred_areia + pred_residual]
cv_predictions[pred_largest_fraction == 4L, pred_esqueleto := pred_esqueleto + pred_residual]
cv_predictions[, c("pred_residual", "pred_largest_fraction") := NULL]

# Check if the proportions sum to 1000 g/kg
cv_predictions[, pred_total_test := pred_argila + pred_silte + pred_areia + pred_esqueleto]
print(cv_predictions[pred_total_test != 1000, .N])
cv_predictions[, pred_total_test := NULL]

# Rescale clay, silt, and sand back to fine-earth basis (relative to < 2 mm fraction).
# Do not coerce tiny fine-earth cases at this stage; keep values as-is for downstream cleaning.
cv_predictions[
  pred_esqueleto < 1000L,
  pred_argila := round(pred_argila / (1000 - pred_esqueleto) * 1000)
]
cv_predictions[
  pred_esqueleto < 1000L,
  pred_silte := round(pred_silte / (1000 - pred_esqueleto) * 1000)
]
cv_predictions[
  pred_esqueleto < 1000L,
  pred_areia := round(pred_areia / (1000 - pred_esqueleto) * 1000)
]
# Set fine fractions to zero when pred_esqueleto >= 1000 (100% coarse material)
cv_predictions[pred_esqueleto >= 1000L, pred_argila := 0L]
cv_predictions[pred_esqueleto >= 1000L, pred_silte := 0L]
cv_predictions[pred_esqueleto >= 1000L, pred_areia := 0L]
cv_predictions[
  pred_esqueleto < 1000L,
  pred_residual := 1000L - (pred_argila + pred_silte + pred_areia)
]
# Check if the proportions sum to 1000 g/kg on a fine-earth basis
cv_predictions[, pred_total_test := pred_argila + pred_silte + pred_areia]
table(cv_predictions[pred_esqueleto < 1000L & pred_total_test != 1000, pred_total_test])
#  999 1001 
# 7735 4582
cv_predictions[, pred_largest_fraction := 0L]
cv_predictions[
  pred_esqueleto < 1000L,
  , pred_largest_fraction := max.col(.SD, ties.method = "first"),
  .SDcols = c("pred_argila", "pred_silte", "pred_areia")
]
cv_predictions[
  pred_esqueleto < 1000L & pred_largest_fraction == 1L, pred_argila := pred_argila + pred_residual
]
cv_predictions[
  pred_esqueleto < 1000L & pred_largest_fraction == 2L, pred_silte := pred_silte + pred_residual
]
cv_predictions[
  pred_esqueleto < 1000L & pred_largest_fraction == 3L, pred_areia := pred_areia + pred_residual
]
cv_predictions[, c("pred_residual", "pred_largest_fraction") := NULL]
# Check if the proportions sum to 1000 g/kg on a fine-earth basis
cv_predictions[, pred_total_test := pred_argila + pred_silte + pred_areia]
print(cv_predictions[pred_esqueleto < 1000L & pred_total_test != 1000, .N])
cv_predictions[, pred_total_test := NULL]

# 4. Compute prediction error ======================================================================
# We will merge the cross-validation predictions of clay, silt, and sand into the soildata object
# using the columns 'dataset_id' and 'profundidade' as keys. This will allow us to have the observed
# and predicted values in the same data table, and thus compute the prediction error for each
# fraction and each sample.

# 4.1 Merge observed and predicted fractions -------------------------------------------------------
dim(soildata)
# 57452   135
dim(cv_predictions)
# 57452     11

# Merge based on dataset_id and profundidade
soildata <- merge(
  soildata,
  cv_predictions[,
   .(dataset_id, profundidade, target_depth, pred_argila, pred_silte, pred_areia, pred_esqueleto)],
  by = c("dataset_id", "profundidade"),
  all.x = TRUE
)

# 4.2 Set evaluation samples -----------------------------------------------------------------------
# We will ignore replicates (copy), tacit-samples (pseudo), rock samples (rock), and rows with
# missing observed or predicted values.
soildata[, eval_sample := ifelse(
  grepl("copy|pseudo|rock", dataset_id) |
    is.na(argila) | is.na(silte) | is.na(areia) | is.na(esqueleto) |
    is.na(pred_argila) | is.na(pred_silte) | is.na(pred_areia) | is.na(pred_esqueleto),
  FALSE,
  TRUE
)]
soildata[eval_sample == TRUE, .N, by = target_depth]
colnames(soildata)
# 4.3 Compute summary statistics -------------------------------------------------------------------
# Use only the evaluation samples to compute summary statistics.
soildata[eval_sample == TRUE, .N, by = target_depth][order(target_depth)]
#  1:            5 11801
#  2:           15  4412
#  3:           25  5851
#  4:           35  5252
#  5:           45  4006
#  6:           55  3650
#  7:           65  3221
#  8:           75  3077
#  9:           85  2668
# 10:           95  2583

# Compute overall statistics for each fraction and by biome (Amazonia == 1, Mata_Atlantica == 1,
# Caatinga == 1, Cerrado == 1, Pampa == 1, Pantanal == 1, Zona_Costeira == 1) using only the
# evaluation samples.
biome_cols <-
  c("Amazonia", "Mata_Atlantica", "Caatinga", "Cerrado", "Zona_Costeira", "Pampa", "Pantanal")
# Clay
soildata[
  eval_sample == TRUE, round(error_statistics(observed = argila / 10, predicted = pred_argila / 10), 2)
]
#               n   me  mae    mse  rmse  mec slope
# predicted 46521 1.11 6.55 117.02 10.82 0.75     1
# Per biome statistics for clay
for (biome_col in biome_cols) {
  cat("Biome:", biome_col, "\n")
  print(soildata[
    eval_sample == TRUE & get(biome_col) == 1L,
    round(error_statistics(observed = argila / 10, predicted = pred_argila / 10), 2)
  ])
}
# Biome: Amazonia 
#               n   me  mae   mse rmse  mec slope
# predicted 23472 0.07 5.67 79.98 8.94 0.81     1
# Biome: Mata_Atlantica 
#               n   me  mae    mse rmse  mec slope
# predicted 10685 2.64 8.36 190.55 13.8 0.67  1.02
# Biome: Caatinga 
#              n   me  mae   mse  rmse  mec slope
# predicted 2218 1.61 7.31 132.9 11.53 0.53  0.87
# Biome: Cerrado 
#              n   me  mae    mse  rmse  mec slope
# predicted 5513 2.03 6.35 128.93 11.35 0.77  0.99
# Biome: Zona_Costeira 
#             n   me  mae    mse  rmse  mec slope
# predicted 532 2.17 8.15 192.57 13.88 0.62  0.88
# Biome: Pampa 
#              n   me  mae   mse rmse  mec slope
# predicted 3024 1.35 5.15 64.69 8.04 0.84  1.02
# Biome: Pantanal 
#              n   me   mae    mse  rmse  mec slope
# predicted 1077 1.69 10.26 210.61 14.51 0.52  0.89

# Silt
soildata[
  eval_sample == TRUE, round(error_statistics(observed = silte / 10, predicted = pred_silte / 10), 2)
]
#               n   me mae   mse rmse  mec slope
# predicted 46521 0.77 4.2 61.57 7.85 0.66  0.93
# Per biome statistics for silt
for (biome_col in biome_cols) {
  cat("Biome:", biome_col, "\n")
  print(soildata[
    eval_sample == TRUE & get(biome_col) == 1L,
    round(error_statistics(observed = silte / 10, predicted = pred_silte / 10), 2)
  ])
}
# Biome: Amazonia 
#               n    me  mae   mse rmse  mec slope
# predicted 23472 -0.09 2.98 28.74 5.36 0.82  1.02
# Biome: Mata_Atlantica 
#               n   me  mae    mse  rmse  mec slope
# predicted 10685 2.83 6.16 125.85 11.22 0.41  0.81
# Biome: Caatinga 
#              n   me  mae   mse rmse  mec slope
# predicted 2218 1.66 5.34 76.28 8.73 0.49  0.82
# Biome: Cerrado 
#              n   me  mae   mse rmse mec slope
# predicted 5513 0.78 4.47 71.66 8.47 0.6   0.9
# Biome: Zona_Costeira 
#             n  me  mae   mse rmse  mec slope
# predicted 532 0.7 5.24 62.95 7.93 0.78  1.05
# Biome: Pampa 
#              n   me  mae   mse rmse  mec slope
# predicted 3024 0.04 4.27 48.46 6.96 0.63  1.07
# Biome: Pantanal 
#              n    me  mae   mse rmse  mec slope
# predicted 1077 -0.74 6.78 93.58 9.67 0.41  0.92
# Sand
soildata[
  eval_sample == TRUE, round(error_statistics(observed = areia / 10, predicted = pred_areia / 10), 2)
]
#               n   me  mae    mse  rmse  mec slope
# predicted 46521 1.18 6.74 131.33 11.46 0.81     1
# Per biome statistics for sand
for (biome_col in biome_cols) {
  cat("Biome:", biome_col, "\n")
  print(soildata[
    eval_sample == TRUE & get(biome_col) == 1L,
    round(error_statistics(observed = areia / 10, predicted = pred_areia / 10), 2)
  ])
}
# Biome: Amazonia 
#               n   me mae  mse rmse  mec slope
# predicted 23472 0.55 5.9 89.8 9.48 0.84     1
# Biome: Mata_Atlantica 
#               n   me mae    mse  rmse mec slope
# predicted 10685 3.04 7.7 184.42 13.58 0.7  0.96
# Biome: Caatinga 
#              n   me  mae    mse  rmse  mec slope
# predicted 2218 0.92 8.98 210.81 14.52 0.67  0.94
# Biome: Cerrado 
#              n   me  mae    mse  rmse  mec slope
# predicted 5513 1.57 6.64 135.69 11.65 0.85  1.02
# Biome: Zona_Costeira 
#             n    me  mae    mse  rmse mec slope
# predicted 532 -1.56 8.51 224.18 14.97 0.8  0.97
# Biome: Pampa 
#              n    me  mae    mse  rmse  mec slope
# predicted 3024 -0.01 5.71 103.68 10.18 0.84  1.01
# Biome: Pantanal 
#              n   me   mae   mse  rmse  mec slope
# predicted 1077 -0.4 13.66 355.6 18.86 0.54  0.89
# Coarse fraction
soildata[
  eval_sample == TRUE, round(error_statistics(observed = esqueleto / 10, predicted = pred_esqueleto / 10), 2)
]
#               n    me  mae    mse  rmse  mec slope
# predicted 46521 -3.53 6.18 241.09 15.53 0.48  0.87

# 4.4 Observed vs. predicted values ----------------------------------------------------------------
# Prepare a four panel-figure with observed vs. predicted values for clay, silt, sand, and coarse
# fraction, using only the evaluation samples. Add a 1:1 line to each panel, and also add the
# overall RMSE and MEC values to the figure.
file_path <- paste0("res/fig/", collection, "_psd_gbm_cross_validation_observed_vs_predicted.png")
png(file_path, width = 1600, height = 1600, res = 150)
par(mfrow = c(2, 2), mar = c(4, 4, 2, 1))
# Clay
plot(
  soildata[eval_sample == TRUE, argila / 10],
  soildata[eval_sample == TRUE, pred_argila / 10],
  panel.first = grid(),
  ylab = "Observed clay (g/kg)", xlab = "Predicted clay (g/kg)", main = "Clay",
  pch = 16, cex = 0.5, xlim = c(0, 1000), ylim = c(0, 1000)
)
abline(a = 0, b = 1, col = "red")
# Silt
plot(
  soildata[eval_sample == TRUE, silte / 10],
  soildata[eval_sample == TRUE, pred_silte / 10],
  panel.first = grid(),
  ylab = "Observed silt (g/kg)", xlab = "Predicted silt (g/kg)", main = "Silt",
  pch = 16, cex = 0.5, xlim = c(0, 1000), ylim = c(0, 1000) 
)
abline(a = 0, b = 1, col = "red")
# Sand
plot(
  soildata[eval_sample == TRUE, areia / 10],
  soildata[eval_sample == TRUE, pred_areia / 10],
  panel.first = grid(),
  ylab = "Observed sand (g/kg)", xlab = "Predicted sand (g/kg)", main = "Sand",
  pch = 16, cex = 0.5, xlim = c(0, 1000), ylim = c(0, 1000)
)
abline(a = 0, b = 1, col = "red")
# Coarse fraction
plot(
  soildata[eval_sample == TRUE, esqueleto / 10],
  soildata[eval_sample == TRUE, pred_esqueleto / 10],
  panel.first = grid(),
  ylab = "Observed coarse fraction (g/kg)", xlab = "Predicted coarse fraction (g/kg)",
  main = "Coarse fraction",
  pch = 16, cex = 0.5, xlim = c(0, 1000), ylim = c(0, 1000)
)
abline(a = 0, b = 1, col = "red")
dev.off()

# 4.5 Compute layer-wise prediction errors ---------------------------------------------------------
soildata[, pred_error_argila := pred_argila - argila]
soildata[, pred_error_silte := pred_silte - silte]
soildata[, pred_error_areia := pred_areia - areia]
soildata[, pred_error_esqueleto := pred_esqueleto - esqueleto]

# 4.6 Save the data with predictions and errors ----------------------------------------------------
file_path <- paste0("res/tab/", collection, "_psd_gbm_cross_validation_predictions_and_errors.csv")
data.table::fwrite(soildata, file_path)

# 4.7 Prepare data for downstream analyses and visualizations --------------------------------------

# soildata <- data.table::fread(file_path)
# Keep only the evaluation samples for downstream analyses and visualizations
soildata <- soildata[eval_sample == TRUE]

# Drop the following fields:
# eval_sample
# log_areia1p_argila1p
# log_esqueleto1p_argila1p
# log_silte1p_argila1p
# profundidade
soildata[, eval_sample := NULL]
soildata[, log_areia1p_argila1p := NULL]
soildata[, log_esqueleto1p_argila1p := NULL]
soildata[, log_silte1p_argila1p := NULL]
soildata[, profundidade := NULL]

# Create field evento_id == dataset_id and set it as the first column of the data table
soildata[, evento_id := dataset_id]
data.table::setcolorder(soildata, c("evento_id", setdiff(colnames(soildata), "evento_id")))

# Clean field dataset_id, by dropping everything after the first dash and set it as the second
# column of the data table
soildata[, dataset_id := sub("-.*", "", dataset_id)]
data.table::setcolorder(
  soildata, c("evento_id", "dataset_id", setdiff(colnames(soildata), c("evento_id", "dataset_id")))
)

# Set field 'target_depth' as the third column of the data table
data.table::setcolorder(
  soildata, c("evento_id", "dataset_id", "target_depth", setdiff(colnames(soildata), c("evento_id", "dataset_id", "target_depth")))
)

# Get fields 'argila', 'silte', 'areia', and 'esqueleto' and add the prefix "obs_" to their names
obs_cols <- c("argila", "silte", "areia", "esqueleto")
data.table::setnames(soildata, obs_cols, paste0("obs_", obs_cols))

# Identify all fields that store only binary values (0 and 1) 
binary_cols <- sapply(soildata, function(col) all(col %in% c(0L, 1L)))
binary_col_names <- names(binary_cols)[binary_cols]
print(binary_col_names)
# Substitute 0-1 values with "no"/"yes" in the identified binary fields
for (col_name in binary_col_names) {
  soildata[, (col_name) := ifelse(get(col_name) == 0L, "no", "yes")]
}

# Except for the binary fields, target variables, predicted variables, error variables, and ID
# fields, all other fields are numeric covariates. Identify the names of these numeric covariate
# fields.
numeric_covariate_cols <- setdiff(
  colnames(soildata),
  c("evento_id", "dataset_id", "target_depth",
    "obs_argila", "obs_silte", "obs_areia", "obs_esqueleto",
    "pred_argila", "pred_silte", "pred_areia", "pred_esqueleto",
    "pred_error_argila", "pred_error_silte", "pred_error_areia", "pred_error_esqueleto",
    binary_col_names
  )
)
print(numeric_covariate_cols)
# Compute the histogram breaks of the numeric covariate fields
numeric_covariate_breaks <- lapply(
  soildata[, ..numeric_covariate_cols],
  function(col) pretty(range(col, na.rm = TRUE), n = 10)
)
print(numeric_covariate_breaks)
# Cut the numeric covariate fields into categorical bins based on the computed breaks
for (col_name in numeric_covariate_cols) {
  breaks <- numeric_covariate_breaks[[col_name]]
  soildata[, (col_name) := cut(get(col_name), breaks = breaks, include.lowest = TRUE)]
}

# Append 'cm' to the target_depth values and set it as a factor variable
soildata[, target_depth := factor(paste0(target_depth, " cm"))]

# 4.7 Save the data with predictions and errors for downstream analyses and visualizations ---------
file_path <- paste0("res/tab/", collection, "_psd_cv_4_looker.csv")
data.table::fwrite(soildata, file_path)
# Compress the file using gzip compression to save disk space and remove the intermediate file with
# the uncompressed data to avoid confusion.
cmd <- paste0("gzip -c ", file_path, " > ", sub(".csv$", ".csv.zip", file_path))
system(cmd)
file.remove(file_path)
