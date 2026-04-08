# title: MapBiomas Soil
# subtitle: 19b. Validation of the PSD Model
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2026
# description: This script performs two tasks. First, it trains a gradient boosting machine (GBM)
# model for each target variable and depth window using the `gbm` package in R. The training process
# is logged, and key statistics about the models are saved for later analysis. Second, it performs
# 5-fold cross-validation with grouped folds to avoid leakage among replicated samples. The CV 
# predictions are saved for later evaluation of the model performance.
rm(list = ls())

# 1. Set up the environment ========================================================================
rm(list = ls())

# Source helper functions
source("src/00_helper_functions.r")

# Load required packages
if (!requireNamespace("gbm", quietly = TRUE)) {
  install.packages("gbm")
}

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

# 2.2 Prepare data for PSD modeling ----------------------------------------------------------------
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

# 3. Global model training =========================================================================
# Train models for each target variable and depth window (3 x 10 = 30 models). The training is
# performed using the gbm package in R, which implements gradient boosting machines. We try to
# mimic the training process used in Google Earth Engine as closely as possible, given the
# differences in implementation and flexibility between the two platforms. The goal is to log the
# training process and save some key statistics about the models for later analysis.
# https://haifengl.github.io/api/java/smile/regression/GradientTreeBoost.Options.html
# https://developers.google.com/earth-engine/apidocs/ee-classifier-smilegradienttreeboost

# 3.1 Set model hyperparameters --------------------------------------------------------------------
# These hyperparameters were obtained from the previous step of hyperparameter tuning and used
# to train the ee.Classifier.smileGradientTreeBoost model used for prediction in Google Earth
# Engine.
numberOfTrees <- 400L
shrinkage <- 0.01
samplingRate <- 0.632
maxNodes <- 25L
nodeSize <- 5L
loss <- "laplace" # LeastAbsoluteDeviation

# 3.2 Set targets ----------------------------------------------------------------------------------
# Target variables
target_variable <- c("log_areia1p_argila1p", "log_esqueleto1p_argila1p", "log_silte1p_argila1p")

# Target depths
target_depth <- seq(5, 95, by = 10)
target_window <- 5 # target depth - target window <= profundidade <= target depth + target window

# 3.3 Train models ---------------------------------------------------------------------------------
# Train models for each target variable and depth window (3 x 10 = 30 models)
trained_models <- list()

model_log <- data.table::data.table(
  model_id = character(), # unique identifier for the model, e.g., "log_areia1p_argila1p_d05"
  target_variable = character(), # e.g., "log_areia1p_argila1p"
  target_depth = integer(), # e.g., 5, 15, ..., 95
  n_samples = integer(), # number of samples used for training the model
  elapsed_sec = numeric(), # time taken to train the model in seconds
  best_iter_oob = integer(), # best iteration based on OOB error
  train_loss_best = numeric(), # training loss at the best iteration (lowest is better)
  oobag_improve_best = numeric(), # OOB improvement at the best iteration (highest is better)
  oobag_improve_total = numeric() # total OOB improvement across all iterations (highest is better)
)
# Loop through each target variable and depth window, train the model, and log the results
for (v in target_variable) {
  for (d in target_depth) {
    # Depth slice: d - target_window <= profundidade <= d + target_window
    idx <- soildata$profundidade >= (d - target_window) & soildata$profundidade <= (d + target_window)
    train_dt <- soildata[idx]

    # Skip if no data in the current depth window
    if (nrow(train_dt) == 0L) {
      warning(sprintf("Skipping %s at depth %d cm: no samples.", v, d))
      next
    }

    # Avoid leakage across PSD targets and remove identifiers
    cols_to_drop <- intersect(c("dataset_id", "group_id", setdiff(target_variable, v)), names(train_dt))
    if (length(cols_to_drop) > 0L) {
      train_dt <- train_dt[, !..cols_to_drop]
    }

    fml <- stats::as.formula(paste(v, "~ ."))
    set.seed(2021) # for reproducibility
    t0 <- Sys.time()
    fit <- gbm::gbm(
      formula = fml,
      data = train_dt,
      distribution = loss,
      n.trees = numberOfTrees,
      shrinkage = shrinkage,
      bag.fraction = samplingRate,
      train.fraction = 1.0,
      interaction.depth = maxNodes,
      n.minobsinnode = nodeSize,
      verbose = TRUE
    )
    elapsed <- as.numeric(difftime(Sys.time(), t0, units = "secs"))

    # Generalization error statistics (OOB)
    oob_vec <- fit$oobag.improve
    if (!is.null(oob_vec) && any(is.finite(oob_vec))) {
      best_iter_oob <- as.integer(gbm::gbm.perf(fit, method = "OOB", plot.it = FALSE))
      oob_vec_clean <- ifelse(is.finite(oob_vec), oob_vec, 0)
      oob_cum <- cumsum(oob_vec_clean) # cumulative OOB improvement across iterations

      train_loss_best <- fit$train.error[best_iter_oob]
      oobag_improve_best <- oob_cum[best_iter_oob] # OOB improvement at the best iteration
      oobag_improve_total <- oob_cum[length(oob_cum)] # total OOB improvement across all iterations
    } else {
      best_iter_oob <- NA_integer_
      train_loss_best <- NA_real_
      oobag_improve_best <- NA_real_
      oobag_improve_total <- NA_real_
    }
    # Log the model training results
    model_id <- sprintf("%s_d%02d", v, d)

    # Keep trained models available in memory for later inspection/export.
    trained_models[[model_id]] <- fit

    model_log <- rbind(
      model_log,
      data.table::data.table(
        model_id = model_id,
        target_variable = v,
        target_depth = as.integer(d),
        n_samples = nrow(train_dt),
        elapsed_sec = elapsed,
        best_iter_oob = best_iter_oob,
        train_loss_best = train_loss_best,
        oobag_improve_best = oobag_improve_best,
        oobag_improve_total = oobag_improve_total
      )
    )
    cat(sprintf(
      "Trained %-35s | n=%6d | %.2f s | best_iter=%3s | train_loss=%.6f\n",
      model_id, nrow(train_dt), elapsed,
      ifelse(is.na(best_iter_oob), "NA", as.character(best_iter_oob)),
      ifelse(is.na(train_loss_best), NaN, train_loss_best)
    ))
  }
}
print(model_log)

# 3.4 Write the trainning log to disk --------------------------------------------------------------
log_file_path <- paste0("res/tab/", collection, "_psd_gbm_model_log.csv")
data.table::fwrite(model_log, log_file_path)

# 3.5 Compute variable importance for each model ---------------------------------------------------
var_importance_list <- list()
for (model_id in names(trained_models)) {
  fit <- trained_models[[model_id]]
  if (!is.null(fit)) {
    # Use gbm summary to compute relative influence per predictor.
    vi <- gbm::summary.gbm(fit, plotit = FALSE)
    if (!is.null(vi) && nrow(vi) > 0L) {
      var_importance <- data.table::data.table(
        model_id = model_id,
        variable = vi$var,
        relative_influence = vi$rel.inf
      )
      var_importance_list[[model_id]] <- var_importance
    }
  }
}
if (length(var_importance_list) == 0L) {
  var_importance_dt <- data.table::data.table(
    model_id = character(),
    variable = character(),
    relative_influence = numeric()
  )
} else {
  var_importance_dt <- data.table::rbindlist(var_importance_list, use.names = TRUE, fill = TRUE)
}
var_importance_file_path <- paste0("res/tab/", collection, "_psd_gbm_variable_importance.csv")
data.table::fwrite(var_importance_dt, var_importance_file_path)

# Get the five most important variables for each model
top_vars_dt <- var_importance_dt[
  order(model_id, -relative_influence)
][
  , head(.SD, 5L),
  by = model_id
]
sort(top_vars_dt[, table(variable)], decreasing = TRUE)
# The top five most important variables across all models were clay_000_030cm (30 occurrences), 
# sand_000_030cm (20 occurrences), profundidade (18 occurrences), silt_000_030cm (17 occurrences), 
# Distance_to_rock_v33 (13 occurrences), elevation (12 occurrences), NEOSSOLO_LITOLICO 
# (9 occurrences), Distance_to_sand_v33 (8 occurrences), koppen_l2_Am (7 occurrences),
# Thinsols (5 occurrences), sedimentares (3 occurrences), cerrado_sedimentos (2 occurrences),
# Ferralsols (2 occurrences), Sandysols (2 occurrences), Argisols (1 occurrence),
# Pantanal (1 occurrence).
#     clay_000_030cm       sand_000_030cm         profundidade 
#                 30                   20                   18 
#     silt_000_030cm Distance_to_rock_v33            elevation 
#                 17                   13                   12 
#  NEOSSOLO_LITOLICO Distance_to_sand_v33         koppen_l2_Am 
#                  9                    8                    7 
#           Thinsols         sedimentares   cerrado_sedimentos 
#                  5                    3                    2 
#         Ferralsols            Sandysols             Argisols 
#                  2                    2                    1 
#           Pantanal 
#                  1

# 4. Five-fold cross-validation ====================================================================
# We will run a 5-fold cross-validation to evaluate the performance of the 30 models. The folds will
# be created based on the grouping variable 'group_id'. This grouping variable accounts for the
# presence of replicated samples (replicas are grouped with their original sample) and occurence of
# multiple layers per soil profile (layers of the same profile are grouped together). This way, we
# ensure that all samples from the same group (replica or profile) are either in the training set or
# in the test set.

# 4.1 Create grouping variable 'group_id' ----------------------------------------------------------
# The 'dataset_id' column contains the original sample ID and, in some cases, the 'clay-copy-'
# prefix indicating that the sample is a replica of the original sample, which is identified by the
# original sample ID without the 'clay-copy-' prefix. Layers of the same soil profile already have
# the same 'dataset_id', so they are naturally grouped together.
# Check sample replicas
soildata[grepl("clay-copy", dataset_id), dataset_id]
# Set grouping variable
soildata[, group_id := gsub("^((clay-copy-)+)", "", dataset_id)]
soildata[, group_id := as.integer(as.factor(group_id))]
# Check the number of unique groups
unique_groups <- unique(soildata$group_id)
num_groups <- length(unique_groups)
print(num_groups)
# 14514
dim(soildata)
# 57452   132
if (FALSE) {
  View(soildata[, .(group_id, dataset_id, profundidade)])
}

# 4.2 Create folds based on 'group_id' -------------------------------------------------------------
# Folds need to be crated on a target depth basis as the number of samples varies across depth
# windows. We will create a list of data.tables, one for each target depth, containing the fold
# assignments for each group_id. This way, we can easily merge the fold assignments back to
# the original data when we subset it for each target variable and depth window during model training
# and evaluation.

# Create balanced fold assignments for a vector of group IDs.
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

  # Shuffle groups (reproducible because set.seed is called before this function).
  group_ids <- sample(group_ids, n_groups)
  fold_id <- rep(seq_len(nfold), length.out = n_groups)

  data.table::data.table(group_id = group_ids, fold_id = fold_id)
}

set.seed(2021) # for reproducibility
folds_list <- list()
for (d in target_depth) {
  # Depth slice: d - target_window <= profundidade <= d + target_window
  idx <- soildata$profundidade >= (d - target_window) & soildata$profundidade <= (d + target_window)
  dt_depth <- soildata[idx]
  # Get unique group_ids for the current depth window
  unique_groups_depth <- unique(dt_depth$group_id)
  # Create folds for the current depth window
  folds_list[[as.character(d)]] <- create_folds(unique_groups_depth, nfold = 5)
}
# Check the fold assignments for one of the depth windows
print(folds_list[["5"]])

# 4.3 Cross-validation loop ------------------------------------------------------------------------
# Run CV by depth first, then by target variable, so folds are created only once per depth window.
# Keep intermediate outputs in long format and cast to wide at export time so the three
# target predictions from the same sample/layer are side-by-side.
cv_chunks <- vector("list", length(target_depth) * length(target_variable))
chunk_id <- 0L

t0 <- Sys.time()
for (d in target_depth) {
  # Depth block: subset data to the current depth window.
  idx <- soildata$profundidade >= (d - target_window) & soildata$profundidade <= (d + target_window)
  dt_depth <- soildata[idx]

  if (nrow(dt_depth) == 0L) {
    warning(sprintf("Skipping depth %d cm: no samples.", d))
    next
  }

  fold_dt <- folds_list[[as.character(d)]]
  if (is.null(fold_dt) || nrow(fold_dt) == 0L) {
    warning(sprintf("Skipping depth %d cm: no fold assignments.", d))
    next
  }

  # Fold block: map precomputed group-level folds to sample rows.
  fold_map <- fold_dt$fold_id
  names(fold_map) <- as.character(fold_dt$group_id)
  dt_depth[, fold_id := fold_map[as.character(group_id)]]
  dt_depth <- dt_depth[!is.na(fold_id)]

  if (nrow(dt_depth) == 0L) {
    warning(sprintf("Skipping depth %d cm: all rows have missing fold_id.", d))
    next
  }

  for (v in target_variable) {
    # Target block: keep rows where the current target is available.
    dt_v <- dt_depth[!is.na(get(v))]

    if (nrow(dt_v) == 0L) {
      warning(sprintf("Skipping %s at depth %d cm: target has only missing values.", v, d))
      next
    }

    # Feature block: keep only columns required for model fitting and CV output.
    cols_model <- setdiff(names(dt_v), c("dataset_id", "group_id", target_variable))
    cols_keep <- unique(c("dataset_id", "profundidade", "fold_id", v, cols_model))
    dt_v <- dt_v[, ..cols_keep]

    dt_v[, pred_cv := NA_real_]
    fold_values <- sort(unique(dt_v$fold_id))

    model_cols <- setdiff(names(dt_v), c("dataset_id", "profundidade", "fold_id", "pred_cv"))

    for (f in fold_values) {
      # Fold iteration block: train on k-1 folds and predict the held-out fold.
      train_model_dt <- dt_v[fold_id != f, ..model_cols]
      test_model_dt <- dt_v[fold_id == f, ..model_cols]

      if (nrow(train_model_dt) == 0L || nrow(test_model_dt) == 0L) {
        next
      }

      set.seed(2021)
      fit_cv <- gbm::gbm(
        formula = stats::as.formula(paste(v, "~ .")),
        data = train_model_dt,
        distribution = loss,
        n.trees = numberOfTrees,
        shrinkage = shrinkage,
        bag.fraction = samplingRate,
        train.fraction = 1.0,
        interaction.depth = maxNodes,
        n.minobsinnode = nodeSize,
        verbose = FALSE
      )

      pred <- stats::predict(
        fit_cv,
        newdata = test_model_dt, n.trees = numberOfTrees, type = "response"
      )
      dt_v[fold_id == f, pred_cv := pred]

      rm(fit_cv, train_model_dt, test_model_dt, pred)
    }

    dt_eval <- dt_v[!is.na(pred_cv)]
    if (nrow(dt_eval) == 0L) {
      warning(sprintf("Skipping %s at depth %d cm: no CV predictions.", v, d))
      next
    }

    # Output block: append predictions using merge/export keys plus metadata.
    chunk_id <- chunk_id + 1L
    cv_chunks[[chunk_id]] <- dt_eval[, .(
      dataset_id,
      profundidade,
      target_variable = v,
      target_depth = as.integer(d),
      fold_id,
      predicted = pred_cv
    )]

    cat(sprintf(
      "CV %s_d%02d | n=%6d | predicted=%6d\n",
      v, d, nrow(dt_v), nrow(dt_eval)
    ))
  }
}
elapsed_cv <- as.numeric(difftime(Sys.time(), t0, units = "hours"))
cat(sprintf("Total CV time: %.2f hours\n", elapsed_cv))

# Combine CV outputs from all chunks, keeping only the rows with predictions, and cast to wide format
if (chunk_id == 0L) {
  cv_predictions <- data.table::data.table(
    dataset_id = character(),
    profundidade = numeric(),
    target_variable = character(),
    target_depth = integer(),
    fold_id = integer(),
    predicted = numeric()
  )
  cv_predictions_wide <- data.table::data.table(
    dataset_id = character(),
    profundidade = numeric(),
    target_depth = integer(),
    fold_id = integer()
  )
  for (v in target_variable) {
    cv_predictions_wide[, (paste0("pred_", v)) := numeric()]
  }
} else {
  cv_predictions <- data.table::rbindlist(cv_chunks[seq_len(chunk_id)], use.names = TRUE, fill = TRUE)

  cv_predictions_wide <- data.table::dcast(
    cv_predictions,
    dataset_id + profundidade + target_depth + fold_id ~ target_variable,
    value.var = "predicted"
  )
  data.table::setnames(
    cv_predictions_wide,
    old = target_variable,
    new = paste0("pred_", target_variable),
    skip_absent = TRUE
  )
  data.table::setorder(cv_predictions_wide, target_depth, dataset_id, profundidade, fold_id)
}
# Check the CV predictions
dim(cv_predictions_wide)
# 72205     7
str(cv_predictions_wide)

# 4.4 Handle duplicated predictions ----------------------------------------------------------------
# Some records are included in two depth windows and thus have two predictions for the same target
# variable. These are records that sit on the edge of the depth windows, e.g., a record with
# profundidade = 10 cm will be included in the depth windows centered at 5 cm and 15 cm. In these
# cases, we will keep the prediction from the uppermost depth window, i.e., the one with the lowest
# target_depth value.
cv_predictions_wide_dedup <- cv_predictions_wide[
  order(dataset_id, profundidade, target_depth, fold_id)
][
  , .SD[1L],
  by = .(dataset_id, profundidade)
]
dim(cv_predictions_wide_dedup)
# 57452     7

# 4.5 Write CV outputs -----------------------------------------------------------------------------
cv_pred_file_path <- paste0("res/tab/", collection, "_psd_gbm_cross_validation_raw.csv")
data.table::fwrite(cv_predictions_wide_dedup, cv_pred_file_path)
