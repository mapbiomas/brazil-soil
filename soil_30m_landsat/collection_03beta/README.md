# MapBiomas Soil Collection 3 Beta

## Description
This directory contains scripts for modeling soil organic carbon stocks, particle size distribution, and texture across Brazil as part of the MapBiomas Soil project at 30-m spatial resolution with Landsat collections.

## Subdirectories
This directory contains the following subdirectories:

* [carbon](./carbon/): Contains scripts for modeling soil organic carbon stocks in space and time.
* [texture](./texture/): Contains scripts for modeling soil particle size distribution (clay, silt, and sand) and texture in space and depth to stoniness trasholds (50 and 90% vol).
* [covariate_export](./covariate_export/): Contains scripts for generating covariates used in the soil modeling process (exported).

## Usage
The code in this repository is designed to be run on the Google Earth Engine (GEE) Code Editor. Follow these steps to use the code:

1. **Create a Google Earth Engine Account**:
   * If you don't have an account, [create one here](https://signup.earthengine.google.com/).

2. **Access the GEE Code Editor**:
   * Go to the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).

3. **Clone the Repository**:
   * Clone this repository to your local workspace:
     ```sh
     git clone https://github.com/mapbiomas/brazil-soil.git
     ```
   * Navigate to the `collection_02beta` directory:
     ```sh
     cd brazil-soil/soil_30m_landsat/collection_02beta
     ```

4. **Open the Scripts in GEE**:
   * Open the GEE Code Editor and create a new script.
   * Copy the contents of the desired script from the `carbon`, `texture`, or `covariates` subdirectory into the GEE Code Editor.

5. **Run the Script**:
   * Follow the instructions provided in the script to run it and generate the desired maps.

6. **Adjust Parameters**:
   * If needed, adjust the parameters in the script to fit your specific requirements, including the relevant paths.

## Contact
For clarifications or to report issues/bugs, please contact: <contato@mapbiomas.org>

## License  
This repository is licensed under [INSERT LICENSE HERE].
