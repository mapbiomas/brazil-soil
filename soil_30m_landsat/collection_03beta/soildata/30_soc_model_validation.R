# title: MapBiomas Soil
# subtitle: 31. Validation of the SOC Model
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2026
# description: This script performs the validation of the SOC model using leave-group-out
# cross-validation.
rm(list = ls())

# Source helper functions
source("src/00_helper_functions.r")

# Set MapBiomas Soil Collection
collection <- "c3"

# Read data from disk ##############################################################################
soildata <- read_insync("c03_soc_v2025_trainingFinal.csv")
# Check the data
dim(soildata)
# 27425   136
sort(colnames(soildata))

# Prepare data for SOC modeling ####################################################################
# Drop unnecessary columns
covars2drop <- c("system:index", "carbono_gm2")
soildata <- soildata[, !..covars2drop]
# Check the data
dim(soildata)
# 27425   134
length(unique(soildata$id))
# 14704

# Rename column 'id' to 'dataset_id'
data.table::setnames(soildata, "id", "dataset_id")

# Add a column to store a logical value indicating whether the sample is from the deepest layer of
# the profile or not.
soildata[, is_deepest_layer := profundidade == max(profundidade), by = dataset_id]

# Create grouping variable
# The 'dataset_id' column contains the original sample ID and, in some cases, the 'trep10-' or
# 'trep20-' string indicating that the sample is a temporal replica.
# Check sample replicas
soildata[grepl("trep10|trep20", dataset_id), dataset_id]
# Set grouping variable
soildata[, group_id := sub("trep10-|trep20-", "", dataset_id)]
soildata[, group_id := as.integer(as.factor(group_id))]
# Check the number of unique groups
unique_groups <- unique(soildata$group_id)
num_groups <- length(unique_groups)
print(num_groups)
# 13108
dim(soildata)
# 27425   135
# View(soildata[, .(group_id, dataset_id, profundidade, carbono_gm2_qmap)])

# Set model hyperparameters ########################################################################
# These hyperparameters were obtained from the previous step of hyperparameter tuning and used
# to train the model used for prediction in Google Earth Engine.
num_trees <- 300L
mtry <- 24L
min_node_size <- 2L
max_depth <- 40L

# Standard model training ##########################################################################
# Compute the out-of-bag statistics for the training data. This will give us an estimate of the
# model's performance on unseen data. Model training is performed using (virtually) the same method
# used in Google Earth Engine. This is performed here are Google Earth Engine does not have the
# same flexibility as R.

# Train the model
model_gee <- ranger::ranger(
  formula = carbono_gm2_qmap ~ .,
  data = soildata[, !c("dataset_id", ".geo", "group_id", "is_deepest_layer")],
  num.trees = num_trees,
  mtry = mtry,
  min.node.size = min_node_size,
  max.depth = max_depth,
  importance = "impurity",
  num.threads = parallel::detectCores() - 1,
  seed = 1984,
  verbose = TRUE
)
print(model_gee)
# Ranger result:
# Type:                             Regression 
# Number of trees:                  300 
# Sample size:                      27425 
# Number of independent variables:  131 
# Mtry:                             24 
# Target node size:                 2 
# Variable importance mode:         none 
# Splitrule:                        variance 
# OOB prediction error (MSE):       7142432 
# R squared (OOB):                  0.7263739

# Variable importance:
# Get the five most important variables based on the mean decrease in impurity (MDI) from the 
# ranger model
var_importance <- model_gee$variable.importance
top5_vars <- names(sort(var_importance, decreasing = TRUE))[1:5]
print(top5_vars)
# [1] "profundidade"     "elevation"        "restingas"        "ESPODOSSOLO"     
# [5] "argila_000_030cm"

# Extract OOB predictions for the training data
soildata[, pred_gee := model_gee$predictions]

# Compute overall OOB statistics for SOC stocks in t/ha
round(error_statistics(
  observed = soildata[, carbono_gm2_qmap] / 100,
  predicted = soildata[, pred_gee] / 100
), 2)
#             me   mae    mse  rmse  mec slope
# predicted 0.32 11.74 714.24 26.73 0.73   1.1

# Compute OOB statistics considering only the depest layer (max(profundidade)) of each profile.
round(error_statistics(
  observed = soildata[is_deepest_layer == 1, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1, pred_gee] / 100
), 2)
#               n    me   mae     mse  rmse  mec slope
# predicted 14752 -1.97 13.81 1070.66 32.72 0.67  1.24

# Restricted model training ########################################################################
# Compute the out-of-bag statistics for the training data using a custom in-bag list that defines
# the in and out-of-bag samples based on the grouping variable (group_id) that contains the original
# samples (layers) from a soil profile and its temporal replicas. This means that when a sample from
# a given soil profile is selected for training, all samples (layers) from that profile as well as
# its temporal replicas are included in the training set. This approach is used to prevent data
# leakage and ensure that the model is evaluated on truly unseen data.

# Get the number of observations in the dataset
n_obs <- nrow(soildata)

# Precompute row indices by group (once)
group_idx <- split(seq_len(n_obs), soildata$group_id)

# Vectorized in-bag creation
custom_inbag <- lapply(seq_len(num_trees), function(i) {
  set.seed(i)
  sampled_groups <- sample(unique_groups, size = num_groups, replace = TRUE)
  group_counts <- tabulate(match(sampled_groups, unique_groups), nbins = num_groups)
  row_weights <- integer(n_obs)
  nz <- which(group_counts > 0L)
  for (g in nz) {
    row_weights[group_idx[[g]]] <- group_counts[g]
  }
  row_weights
})
# Check the structure of the custom in-bag list
str(custom_inbag, 1)
# Sum of in-bag samples for each tree (should be close to the number of samples, i.e 27425)
summary(sapply(custom_inbag, sum))
#  Min. 1st Qu.  Median    Mean 3rd Qu.    Max.
# 27086   27348   27448   27447   27556   27786
# Out-of-bag samples for each tree (should be close to 1/3 of the number of samples, i.e. 9142)
summary(sapply(custom_inbag, function(x) sum(x == 0)))
#  Min. 1st Qu.  Median    Mean 3rd Qu.    Max.
#  9786   10006   10074   10076   10139   10373
# Check the in-bag samples across groups for the first tree
# View(soildata[custom_inbag[[1]] > 0, .(dataset_id, group_id, profundidade, carbono_gm2_qmap)])

# Train the model using the custom in-bag list
model_noleak <- ranger::ranger(
  formula = carbono_gm2_qmap ~ .,
  data = soildata[, !c("dataset_id", ".geo", "group_id", "is_deepest_layer", "pred_gee")],
  num.trees = num_trees,
  mtry = mtry,
  min.node.size = min_node_size,
  max.depth = max_depth,
  inbag = custom_inbag, # Use the custom in-bag list to define OOB samples based on group_id
  num.threads = parallel::detectCores() - 1,
  importance = "impurity",
  seed = 1984,
  verbose = TRUE
)
print(model_noleak)
# Ranger result:
# Type:                             Regression 
# Number of trees:                  300 
# Sample size:                      27425 
# Number of independent variables:  131 
# Mtry:                             24 
# Target node size:                 2 
# Variable importance mode:         none 
# Splitrule:                        variance 
# OOB prediction error (MSE):       11079856 
# R squared (OOB):                  0.5755314

# Variable importance:
# Get the five most important variables based on the mean decrease in impurity (MDI) from the 
# ranger model
var_importance_noleak <- model_noleak$variable.importance
top5_vars_noleak <- names(sort(var_importance_noleak, decreasing = TRUE))[1:5]
print(top5_vars_noleak) 
# [1] "profundidade"     "elevation"        "restingas"        "ESPODOSSOLO"     
# [5] "argila_000_030cm"

# Extract OOB predictions for the training data
soildata[, pred_noleak := model_noleak$predictions]

# Compute overall OOB statistics for SOC stocks in t/ha
round(error_statistics(
  observed = soildata[, carbono_gm2_qmap] / 100,
  predicted = soildata[, pred_noleak] / 100
), 2)
#             me   mae     mse  rmse  mec slope
# predicted 1.04 15.63 1107.99 33.29 0.58  1.04

# Compute OOB statistics for the deepest layer of each profile
round(error_statistics(
  observed = soildata[is_deepest_layer == 1, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1, pred_noleak] / 100
), 2)
#              me   mae     mse  rmse  mec slope
# predicted -1.07 17.27 1481.04 38.48 0.54  1.19

# Compute OOB statistics for the deepest layer of each profile for each biome
# Amazonia
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Amazonia > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Amazonia > 0, pred_noleak] / 100
), 2)
#             me   mae    mse  rmse  mec slope
# predicted -0.1 16.11 734.05 27.09 0.25  1.02

# Caatinga
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Caatinga > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Caatinga > 0, pred_noleak] / 100
), 2)
#            me   mae    mse  rmse  mec slope
# predicted 2.2 10.73 294.02 17.15 0.26  0.71

# Cerrado
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Cerrado > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Cerrado > 0, pred_noleak] / 100
), 2)
#              me   mae    mse  rmse  mec slope
# predicted -0.84 13.89 1372.9 37.05 0.27  1.03

# Mata_Atlantica
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Mata_Atlantica > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Mata_Atlantica > 0, pred_noleak] / 100
), 2)
#              me  mae     mse  rmse  mec slope
# predicted -2.53 22.6 2029.01 45.04 0.65  1.24

# Pampa
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Pampa > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Pampa > 0, pred_noleak] / 100
), 2)
#             me   mae    mse  rmse  mec slope
# predicted 0.08 10.75 537.67 23.19 0.51  1.02

# Pantanal
round(error_statistics(
  observed = soildata[is_deepest_layer == 1 & Pantanal > 0, carbono_gm2_qmap] / 100,
  predicted = soildata[is_deepest_layer == 1 & Pantanal > 0, pred_noleak] / 100
), 2)
#              me   mae   mse  rmse  mec slope
# predicted -0.36 13.08 352.8 18.78 0.58  0.98

# Cross-validation #################################################################################
# Create groups of samples based on the 'dataset_id'. The groups will be composed of the
# original samples and their spatial and temporal replicas. The 'dataset_id' column contains the
# original sample ID, and the 'trep' suffix indicates that the sample is a temporal replica.
# The goal is to create groups that include all original samples and their replicas, so that when we
# create cross-validation folds, we can ensure that all replicas of a sample are excluded from the
# training set when the original sample is assigned to a validation fold. This prevents data leakage
# and avoids overly optimistic results.
# Note that some samples may not have replicas, in which case they will be assigned to a group by
# themselves.

# Step 2. Create grouped 5-fold assignments
# Use the same grouped strategy as PSD models: assign folds at group level so all records from the
# same group stay in the same fold.
create_folds <- function(group_ids, nfold = 5L) {
  group_ids <- unique(group_ids)
  n_groups <- length(group_ids)

  if (n_groups == 0L) {
    return(data.table::data.table(group_id = integer(), fold_id = integer()))
  }

  if (!is.numeric(nfold) || length(nfold) != 1L || is.na(nfold) || nfold < 2L) {
    stop("'nfold' must be a single integer >= 2")
  }
  nfold <- as.integer(nfold)

  # Shuffle groups before round-robin fold assignment for balanced folds.
  group_ids <- sample(group_ids, n_groups)
  fold_id <- rep(seq_len(nfold), length.out = n_groups)

  data.table::data.table(group_id = group_ids, fold_id = fold_id)
}
str(create_folds)

set.seed(1984)
fold_dt <- create_folds(unique_groups, nfold = 5L)
fold_map <- fold_dt$fold_id
names(fold_map) <- as.character(fold_dt$group_id)
soildata[, fold_id := fold_map[as.character(group_id)]]

# Add columns to store out-of-fold predictions
soildata[, pred_cv := NA_real_]

# Step 3. Fit one model per fold and predict held-out fold
fold_values <- sort(unique(soildata$fold_id))
random_seed <- 1984
t0 <- Sys.time()
for (f in fold_values) {
  cat(sprintf("Fold: %d of %d\n", f, length(fold_values)))
  train_dt <- soildata[
    fold_id != f,
    !c(
      "dataset_id", "group_id", "fold_id", "is_deepest_layer",
      "pred_gee", "pred_noleak", "pred_cv", ".geo"
    )
  ]
  test_dt <- soildata[
    fold_id == f,
    !c(
      "dataset_id", "group_id", "fold_id", "is_deepest_layer",
      "pred_gee", "pred_noleak", "pred_cv", ".geo"
    )
  ]

  if (nrow(train_dt) == 0L || nrow(test_dt) == 0L) {
    next
  }

  set.seed(random_seed)
  soc_model_cv <- ranger::ranger(
    formula = carbono_gm2_qmap ~ .,
    data = train_dt,
    num.trees = num_trees,
    mtry = mtry,
    min.node.size = min_node_size,
    max.depth = max_depth,
    num.threads = parallel::detectCores() - 1,
    verbose = TRUE
  )

  pred_cv <- predict(soc_model_cv, data = test_dt)$predictions

  soildata[fold_id == f, pred_cv := pred_cv]
}
print(Sys.time() - t0)

# Check if all rows received out-of-fold predictions
print(soildata[is.na(pred_cv), .N])

# Save cross-validation results to disk
file_path <- paste0("res/tab/", collection, "_soc_model_cross_validation.csv")
data.table::fwrite(soildata, file = file_path, sep = "\t")

