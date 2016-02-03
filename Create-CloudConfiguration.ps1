#
# Use this file to create a cloud configuration according to you setenv.cmd file
#
# Examples:
# .\Create-CloudConfiguration.ps1 -setenvPath .\setenv.cloud.cmd -roleNames "ScoringWorker,QueryIDs,DocParser" -configTemplatePath .\ServiceConfiguration.Template.cscfg -configOutputPath .\Pipeline\ServiceConfiguration.Cloud.cscfg -definitionTemplatePath .\ServiceDefinition.Template.csdef -definitionOutputPath .\Pipeline\ServiceDefinition.csdef
# .\Create-CloudConfiguration.ps1 -setenvPath .\setenv.local.cmd -roleNames "ScoringWorker,QueryIDs,DocParser" -configTemplatePath .\ServiceConfiguration.Template.cscfg -configOutputPath .\Pipeline\ServiceConfiguration.Local.cscfg -definitionTemplatePath .\ServiceDefinition.Template.csdef -definitionOutputPath .\Pipeline\ServiceDefinition.csdef

param($setenvPath, $roleNames, $configTemplatePath, $configOutputPath, $definitionTemplatePath, $definitionOutputPath)

[xml]$config = Get-Content $configTemplatePath
[xml]$definition = Get-Content $definitionTemplatePath

Get-Content $setenvPath | ? { $_.trim() -ne "" } | % {
  $name = $_.substring(4, $_.indexOf('=') - 4);
  $value = $_.substring($_.indexOf('=') + 1);
  
  # Setting in config file
  $childNode = $config.CreateElement("Setting");
  $childNode.SetAttribute("name", $name);
  $childNode.SetAttribute("value", $value);
  $temp = $config.ServiceConfiguration.Role.ConfigurationSettings.AppendChild($childNode);
  
  # Setting in definition file
  
  # Config path in definition file
  $roles | % {

	$roleName = $_
	$roleNode = $definition.ServiceDefinition.WorkerRole | ? { $_.name -eq $roleName }

	$childNode = $definition.CreateElement("Setting");
	$childNode.SetAttribute("name", $name);
	$temp = $roleNode.ConfigurationSettings.AppendChild($childNode);


	$childNode = $definition.CreateElement("Variable");
	$childNode.SetAttribute("name", $name);
	$roleInstanceNode = $definition.CreateElement("RoleInstanceValue");
	$roleInstanceNode.SetAttribute("xpath", "/RoleEnvironment/CurrentInstance/ConfigurationSettings/ConfigurationSetting[@name='$name']/@value");
	$temp = $childNode.AppendChild($roleInstanceNode);
	$temp = $roleNode.Runtime.Environment.AppendChild($childNode);
  }
}

$roles = $roleNames.Split(',');
$configRoleTemplate = $config.ServiceConfiguration.Role;
$temp = $config.ServiceConfiguration.RemoveChild($configRoleTemplate);
$roles | % {
  $roleNode = $configRoleTemplate.Clone();
  $roleNode.SetAttribute("name", $_.trim());
  $temp = $config.ServiceConfiguration.AppendChild($roleNode);
}

# Config: Making sure written file is indented
$sb = New-Object System.Text.StringBuilder
$sw = New-Object System.IO.StringWriter($sb)
$writer = New-Object System.Xml.XmlTextWriter($sw)
$writer.Formatting = [System.Xml.Formatting]::Indented
$config.Save($writer)
$writer.Close()
$sw.Dispose()

$sb.ToString().Replace(" xmlns=`"`"", "") > $configOutputPath

# Definition: Making sure written file is indented
$sb = New-Object System.Text.StringBuilder
$sw = New-Object System.IO.StringWriter($sb)
$writer = New-Object System.Xml.XmlTextWriter($sw)
$writer.Formatting = [System.Xml.Formatting]::Indented
$definition.Save($writer)
$writer.Close()
$sw.Dispose()

$sb.ToString().Replace(" xmlns=`"`"", "") > $definitionOutputPath