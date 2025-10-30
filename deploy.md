curl -O https://raw.githubusercontent.com/drpaulfarrow/PaulBit/main/docker-compose.azure.yml

az webapp config container set   --name monetizeplusapp   --resource-group MonetizePlusRG   --multicontainer-config-type compose   --multicontainer-config-file docker-compose.cloud.yml

