# MapBiomas Brazil - Soil

## Description
This repository contains the scripts for mapping soil organic carbon stocks (annual), particle size distribution (static), and texture (static) across Brazil as part of the MapBiomas Soil project at 30-m spatial resolution with Landsat collections.

For detailed information about the data and modeling approach, please refer to the MapBiomas Soil [Algorithm Theoretical Basis Document (ATBD)](https://brasil.mapbiomas.org/metodo-mapbiomas-solo/).

## Prerequisites
* [Create an account](https://signup.earthengine.google.com/) on the Google Earth Engine platform.

## Installation
1. Clone this repository to your local workspace:
    ```sh
    git clone https://github.com/mapbiomas/brazil-soil.git
    ```
2. Navigate to the repository directory:
    ```sh
    cd brazil-soil
    ```

## Structure
The repository is organized in directories containing the code for each collection inside the toplevel directory [soil_30m_landsat](./soil_30m_landsat/).

* [Soil Collection 1-beta](./soil_30m_landsat/collection_01beta/): Contains the scripts for mapping soil organic carbon stocks (1985-2021)
* [Soil Collection 2-beta](./soil_30m_landsat/collection_02beta/): Contains the scripts for mapping soil organic carbon stocks (1985-2023, 0-30 cm) and soil particle size distribution and texture (0-30 cm)
* [Soil Collection 3](./soil_30m_landsat/collection_03/): In progress

## Usage
To learn how to use the code, please check the README file inside the collection of interest.

## Contact
For clarifications or to report issues/bugs, please contact <contato@mapbiomas.org>

## License
This repository is licensed under [INSERT LICENSE HERE].