# MapBiomas Soil Collection 2

## Description
Collection 2 focuses on mapping soil organic carbon stocks, particle size distribution, and texture across Brazil. This collection builds upon the initial methods and data used in the beta collection, incorporating improvements and additional data sources to enhance the accuracy and reliability of the soil property maps.

For detailed information about the data and modeling approach, please refer to the MapBiomas Soil [Algorithm Theoretical Basis Document (ATBD)](https://brasil.mapbiomas.org/metodo-mapbiomas-solo/).

## Objectives
* Provide the source code for annual maps of soil organic carbon stocks for the period 1985-2023.
* Provide the source code for static maps of particle size distribution and texture for the nominal year 1990, available for 10 cm depth increments between 0 and 30 cm.

## Subdirectories
This directory contains the following subdirectories:

* [carbon](./carbon/): Contains scripts for mapping soil organic carbon stocks.
* [texture](./texture/): Contains scripts for mapping soil particle size distribution (clay, silt, and sand) and texture.

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
   * Navigate to the `collection_02` directory:
     ```sh
     cd brazil-soil/collection_02
     ```

4. **Open the Scripts in GEE**:
   * Open the GEE Code Editor and create a new script.
   * Copy the contents of the desired script from the `carbon` or `texture` subdirectory into the GEE Code Editor.

5. **Run the Script**:
   * Follow the instructions provided in the script to run it and generate the desired maps.

6. **Adjust Parameters**:
   * If needed, adjust the parameters in the script to fit your specific requirements.

## Contact
For clarifications or to report issues/bugs, please contact: <contato@mapbiomas.org>

## License  
This repository is licensed under [INSERT LICENSE HERE].