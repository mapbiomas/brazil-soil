# title: MapBiomas Soil
# subtitle: 28. Select SOC Model Hyperparameters and Assess OOB Model Performance
# author: Alessandro Samuel-Rosa and Taciara Zborowski Horst
# date: 2025
rm(list = ls())

# Source helper functions
source("src/00_helper_functions.r")

# Set MapBiomas Soil Collection
collection <- "c3"

# Read data from disk ##############################################################################
file_path <- "data/25_soildata.txt"
soildata <- data.table::fread(file_path, sep = "\t", na.strings = c("", "NA", "NaN"))
# Check the data
dim(soildata)
# 32433   147
sort(colnames(soildata))

# Prepare data for modeling ########################################################################

# Drop problematic covariates
covars2drop <- c(    
  "mb_edges", "koppen_l1_B", "koppen_l2_Bs", "Water_40y_recurrence"
)
soildata <- soildata[, !..covars2drop]
# Check the data
dim(soildata)
# 32433   146

# Weak importance covariates on GEE
# carbono_gm2: LUVISSOLO, VERTISSOLO, koppen_l3_Cwa, latossolo_metamorficas, pampa_sedimentos,
#   pantanal_plintossolo, plutonicas, raso_plutonica
# carbono_gm2_qmap: Reconcavo_Tucano_Jatoba_Provincia, VERTISSOLO, latossolo_metamorficas,
#   longitudinal_curvature, pampa_sedimentos, plutonicas, raso_plutonica
# Drop agreeing covariates
covars2drop <- c(
  "VERTISSOLO", "latossolo_metamorficas",
  "pampa_sedimentos", "plutonicas", "raso_plutonica"
)
soildata <- soildata[, !..covars2drop]
# Check the data
dim(soildata)
# 32433   159

# Select model hyperparameters #####################################################################
sort(colnames(soildata))

# Prepare grid of hyperparameters
# num.trees, mtry, min.node.size and max.depth
num_trees <- c(200, 300, 400)
mtry <- c(16, 24, 32)
min_node_size <- c(2, 3, 4)
max_depth <- c(30, 40)
hyperparameters <- expand.grid(num_trees, mtry, min_node_size, max_depth)
colnames(hyperparameters) <- c("num_trees", "mtry", "min_node_size", "max_depth")
print(hyperparameters)

# Fit ranger model testing different hyperparameters
# (this takes about 15 minutes to run)
t0 <- Sys.time()
hyper_results <- data.table::data.table()
for (i in 1:nrow(hyperparameters)) {
  print(hyperparameters[i, ])
  set.seed(1984)
  model <- ranger::ranger(
    formula = carbono_gm2 ~ .,
    data = soildata[, !c("id", "year", "carbono_gm2_qmap")],
    num.trees = hyperparameters$num_trees[i],
    mtry = hyperparameters$mtry[i],
    min.node.size = hyperparameters$min_node_size[i],
    max.depth = hyperparameters$max_depth[i],
    replace = TRUE,
    verbose = TRUE
  )
  observed <- soildata[, carbono_gm2]
  predicted <- model$predictions
  error <- observed - predicted
  residual <- mean(observed) - observed
  me <- mean(error)
  mae <- mean(abs(error))
  mse <- mean(error^2)
  rmse <- sqrt(mse)
  nse <- 1 - mse / mean(residual^2)
  slope <- coef(lm(observed ~ predicted))[2]
  hyper_results <- rbind(hyper_results, data.table::data.table(
    num_trees = hyperparameters$num_trees[i],
    mtry = hyperparameters$mtry[i],
    min_node_size = hyperparameters$min_node_size[i],
    max_depth = hyperparameters$max_depth[i],
    me = me,
    mae = mae,
    rmse = rmse,
    nse = nse,
    slope = slope
  ))
}
Sys.time() - t0

# Export the results to a TXT file
file_path <- paste0("res/tab/", collection, "_soc_hyperparameter_tuning.txt")
data.table::fwrite(hyper_results, file_path, sep = "\t")
if (FALSE) {
  # Read the results from disk
  hyper_results <- data.table::fread(file_path, sep = "\t")
}

# Assess results
# What is the Spearman correlation between hyperparameters and model performance metrics?
correlation <- round(cor(hyper_results, method = "spearman"), 2)
file_path <- paste0("res/tab/", collection, "_soc_hyperparameter_correlation.txt")
data.table::fwrite(correlation, file_path, sep = "\t")
print(correlation[1:4, 5:9])

# Sort the results by RMSE
hyper_results <- hyper_results[order(rmse)]

# Select the best hyperparameters
# Among smallest `rmse`, select the hyperparameters with the smallest `num_trees`.
# Then select the hyperparameters with the largest `nse`.
# Then select the hyperparameters with the smallest `max_depth`.
# Then select the hyperparameters with the smallest `mtry`.
# Then select the hyperparameters with the largest `min_node_size`.
digits <- 2
hyper_best <- round(hyper_results, digits)
hyper_best <- hyper_best[rmse == min(rmse), ]
hyper_best <- hyper_best[nse == max(nse), ]
hyper_best <- hyper_best[num_trees == min(num_trees), ]
hyper_best <- hyper_best[max_depth == min(max_depth), ]
hyper_best <- hyper_best[mtry == min(mtry), ]
hyper_best <- hyper_best[min_node_size == max(min_node_size), ]
print(hyper_best)

# Hard code the best hyperparameters for the model
hyper_best <- data.frame(num_trees = 400, mtry = 24, min_node_size = 2, max_depth = 40)

# Fit the best model
t0 <- Sys.time()
set.seed(2001)
soc_model <- ranger::ranger(
  formula = carbono_gm2 ~ .,
  data = soildata[, !c("dataset_id", "year", "carbono_gm2_qmap")],
  # Use the best hyperparameters
  num.trees = hyper_best$num_trees,
  mtry = hyper_best$mtry,
  min.node.size = hyper_best$min_node_size,
  max.depth = hyper_best$max_depth,
  importance = "impurity",
  replace = TRUE,
  verbose = TRUE
)
Sys.time() - t0
print(soc_model)
# OOB prediction error (MSE): 6226074
# R squared (OOB): 0.7608669

# Compute regression model statistics and write to disk
soc_model_stats <- error_statistics(soildata[, carbono_gm2], soc_model$predictions)
file_path <- paste0("res/tab/", collection, "_soc_model_statistics.txt")
data.table::fwrite(soc_model_stats, file_path, sep = "\t")
print(round(soc_model_stats, 2))

# Write model parameters to disk
write.table(capture.output(print(soc_model))[6:15],
  file = paste0("res/tab/", collection, "_soc_model_parameters.txt"), sep = "\t", row.names = FALSE
)
if (FALSE) {
  # Read the model parameters from disk
  soc_model <- data.table::fread(paste0("res/tab/", collection, "_soc_model_parameters.txt"), sep = "\t")
  print(soc_model)
}

# Check absolute error
abs_error_tolerance <- soc_model_stats$rmse * 2
soildata[, predicted := round(soc_model$predictions)]
soildata[, abs_error := abs(carbono_gm2 - predicted)]
if (any(soildata[, abs_error] >= abs_error_tolerance)) {
  View(soildata[
    abs_error >= abs_error_tolerance,
    .(dataset_id, year, carbono_gm2, predicted, abs_error, IFN_index)
  ])
} else {
  print(paste0("All absolute errors are below ", abs_error_tolerance, " g/m^2."))
}

# Figure: Variable importance
importance <- sort(soc_model$variable.importance, decreasing = TRUE)
importance <- round(importance / max(importance) * 100) # Normalize to 1
num_vars <- length(importance)
vars_per_plot <- ceiling(num_vars/2)
num_plots <- ceiling(num_vars / vars_per_plot)
dev.off()
file_path <- paste0("res/fig/", collection, "_soc_model_variable_importance.png")
png(file_path, width = 480 * 3, height = 480 * 3, res = 72 * 2)
par(mar = c(5, 10, 2, 2), mfrow = c(1, num_plots))
xlim <- c(0, max(importance))
for (i in 1:num_plots) {
  start_idx <- (i - 1) * vars_per_plot + 1
  end_idx <- min(i * vars_per_plot, num_vars)
  barplot(
    rev(importance[start_idx:end_idx]),
    names.arg = rev(names(importance)[start_idx:end_idx]),
    las = 1,
    main = "",
    xlab = "Relative importance",
    ylab = "",
    col = "lightgray",
    border = "darkgray",
    cex.names = 0.7,
    cex.axis = 0.7,
    cex.lab = 0.7,
    horiz = TRUE,
    xlim = xlim
  )
}
mtext("Variable Importance: SOC stock Model",
  side = 3, line = -2, outer = TRUE, cex = 1, font = 1
)
dev.off()

# Figure: Plot fitted versus observed values
# Set color of points as a function of the absolute error, that is, abs(y - x). The absolute error
# ranges from 0 to 1.
color_breaks <- seq(0, ceiling(abs_error_tolerance / 1000), length.out = 6)
color_class <- cut(soildata[, abs_error / 1000], breaks = color_breaks, include.lowest = TRUE)
color_palette <- RColorBrewer::brewer.pal(length(color_breaks) - 1, "Purples")
xylim <- range(soildata[, carbono_gm2 / 1000])
dev.off()
file_path <- paste0("res/fig/", collection, "_soc_model_observed_versus_fitted.png")
png(file_path, width = 480 * 3, height = 480 * 3, res = 72 * 3)
par(mar = c(4, 4.5, 2, 2) + 0.1)
plot(
  y = soildata[, carbono_gm2 / 1000], x = soc_model$predictions / 1000,
  xlim = xylim, ylim = xylim,
  panel.first = grid(),
  pch = 21, bg = color_palette[as.numeric(color_class)],
  ylab = expression("Observed soil organic carbon stock, kg m"^-2),
  xlab = expression("Fitted soil organic carbon stock (OOB), kg m"^-2)
)
abline(0, 1)
legend("topleft", title = expression("Absolute error, kg m"^-2),
  legend = levels(color_class),
  pt.bg = color_palette, border = "white", box.lwd = 0, pch = 21
)
dev.off()





# Cross-validation #################################################################################
# Create groups groups of samples based on the 'dataset_id'. The groups will be composed of the
# original samples and their spatial and temporal replicas. The 'dataset_id' column contains the
# original sample ID, and the '-REP' suffix indicates that the sample is a spatial replica
# (temporal replicas have no suffix). The goal is to create groups that include all
# original samples and their replicas, so that when we create cross-validation folds, we can
# ensure that all replicas of a sample are excluded from the training set when the original sample
# is assigned to a validation fold. This prevents data leakage and avoids overly optimistic
# results. Note that some samples may not have replicas, in which case they will be
# assigned to a group by themselves.

# Step 1. Find all samples with '-REP' in the 'dataset_id' column, removing the string and
# everything after it. This will give us the original sample ID.
# Check sample replicas
soildata[grepl("-REP", dataset_id), .(dataset_id, year)]
# Create groups
soildata[, group_id := sub("-REP.*", "", dataset_id)]
soildata[, group_id := as.integer(as.factor(group_id))]
# Check the number of unique groups
num_groups <- length(unique(soildata$group_id))
print(num_groups)
# 4539
dim(soildata)
# 5319   77

# Step 2. Create folds for cross-validation using the 'group_id' column. We will use a 10-fold
# cross-validation strategy, ensuring that all replicas of a sample are excluded from the training
# set when the original sample is assigned to a validation fold. This is done using the
# `groupKFold` function from the caret package, which creates folds based on the groups.
# The `k` parameter specifies the number of folds, which is set to 10 in this case.
# The `index` parameter is set to the output of `groupKFold`,
# which contains the indices of the samples in each fold. This ensures that the folds are created
# based on the groups, and that all replicas of a sample are excluded from the training set.
# set.seed(random_seed)
# cv_folds <- caret::groupKFold(soildata$group_id, k = 10)
# rm(cv_folds)

# Add a column to store the cross-validation predictions
soildata[, predicted := as.numeric(NA)]

# Step 3. Fit the model using cross-validation
# We will loop over the folds and fit the model on each fold, using the training set
# and evaluating the model on the validation set. During predictions on the validation set, for
# each sample, we will save the predicted values of all trees and compute the median of the
# predictions. This will be the predicted value for that sample. The model will be fitted using the
# best hyperparameters obtained from the previous step. The model will be fitted using the
# `ranger` package, which is a fast implementation of random forests.
# This takes about 7 hours to run on a 4-core machine with 16 GB of RAM.
t0 <- Sys.time()
for (i in 1:num_groups) {
  print(paste0("Fold: ", i))
  # Get the training and validation sets row indexes
  # train_idx <- cv_folds[[i]]
  # valid_idx <- setdiff(seq_len(nrow(soildata)), train_idx)
  
  # Fit the model on the training set
  set.seed(random_seed)
  soc_model_cv <- ranger::ranger(
    formula = estoque ~ .,
    data = soildata[group_id != i, !c("dataset_id", "year", "group_id", "predicted")],
    num.trees = hyper_best$num_trees,
    mtry = hyper_best$mtry,
    min.node.size = hyper_best$min_node_size,
    max.depth = hyper_best$max_depth,
    verbose = TRUE
  )
  
  # Predict on the validation set
  pred <- predict(
    soc_model_cv,
    data = soildata[group_id == i, !c("dataset_id", "year", "group_id", "predicted")],
    predict.all = TRUE
  )$predictions
  soildata[group_id == i, predicted := apply(pred, 1, median)]
  # Round the predictions to the nearest integer
  soildata[group_id == i, predicted := round(predicted)]
}
Sys.time() - t0

# Save preditions to disk
soildata[, Amazonia := 1]
data.table::fwrite(soildata[, .(dataset_id, year, estoque, predicted)],
  file = "res/tab/soc_model01_predictions.txt", sep = "\t"
)
