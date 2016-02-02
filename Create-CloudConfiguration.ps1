#
# Use this file to create a cloud configuration according to you setenv.cmd file
#
# Example:
# .\Create-CloudConfiguration.ps1 -templatePath .\ServiceConfiguration.Template.cscfg -setenvPath .\setenv.cmd -roleNames "ScoringWorker,QueryIDs,DocParser" -outputPath .\Pipeline\ServiceConfiguration.Cloud1.cscfg
param($templatePath, $setenvPath, $roleNames, $outputPath)

[xml]$config = Get-Content $templatePath
Get-Content $setenvPath | % {
  $name = $_.substring(4, $_.indexOf('=') - 4);
  $value = $_.substring($_.indexOf('=') + 1);
  $childNode = $config.CreateElement("Setting");
  $childNode.SetAttribute("name", $name);
  $childNode.SetAttribute("value", $value);
  $config.ServiceConfiguration.Role.ConfigurationSettings.AppendChild($childNode);
}
$roles = $roleNames.Split(',');
$roleTemplate = $config.ServiceConfiguration.Role;
$config.ServiceConfiguration.RemoveChild($roleTemplate);
$roles | % {
  $roleNode = $roleTemplate.Clone();
  $roleNode.SetAttribute("name", $_.trim());
  $config.ServiceConfiguration.AppendChild($roleNode);
}

# Making sure written file is indented
$sb = New-Object System.Text.StringBuilder
$sw = New-Object System.IO.StringWriter($sb)
$writer = New-Object System.Xml.XmlTextWriter($sw)
$writer.Formatting = [System.Xml.Formatting]::Indented
$config.Save($writer)
$writer.Close()
$sw.Dispose()

$sb.ToString() > $outputPath