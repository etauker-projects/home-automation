# Home Automation - Health Data Module
Contains scripts for parsing data CSVs and exporting them in format to allow importing into influx DB.


## Import Examples
References: 
- https://docs.influxdata.com/influxdb/cloud/write-data/developer-tools/line-protocol/


Steps:
1. download CSV from health service and place in `./data` dir
2. use scripts (in `./src` directory) to parse data and map to desired format
3. save the generated file to influx config volume
4. execture the following command from machine hosting docker container

```sh
docker exec -it influxdb influx write --precision ms -b {bucket} -f {config-dir-inside-container}/{path-to-file} --format lp

# examples
docker exec -it influxdb influx write --precision ms -b glucose-monitoring -f /var/lib/influxdb2/import/glucose-data_2023-12-21.txt --format lp
```
