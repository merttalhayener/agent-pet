from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent
src = root / 'src'
p = json.loads((src / 'package.json').read_text())
target = root / 'artifacts' / f"codex-pet-panel-{p['version']}.vsix"
target.parent.mkdir(parents=True, exist_ok=True)
if not (src / 'bin' / 'codex-desktop-pet').is_file():
    raise SystemExit('Build the native helper first: python3 scripts/build-native.py')
manifest = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{p['name']}" Version="{p['version']}" Publisher="{p['publisher']}"/>
    <DisplayName>{p['displayName']}</DisplayName>
    <Description xml:space="preserve">{p['description']}</Description>
    <Tags>pet,codex,local</Tags><Categories>Other</Categories><GalleryFlags/>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.96.2"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="openai.chatgpt"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.EnabledApiProposals" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true"/>
    </Properties>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
  </Assets>
</PackageManifest>'''
types = '''<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="json" ContentType="application/json"/>
<Default Extension="cjs" ContentType="application/javascript"/>
<Default Extension="js" ContentType="application/javascript"/>
<Default Extension="css" ContentType="text/css"/>
<Default Extension="html" ContentType="text/html"/>
<Default Extension="md" ContentType="text/markdown"/>
<Default Extension="vsixmanifest" ContentType="text/xml"/>
</Types>'''
with ZipFile(target, 'w', ZIP_DEFLATED) as z:
    z.writestr('extension.vsixmanifest', manifest)
    z.writestr('[Content_Types].xml', types)
    for file in sorted(src.rglob('*')):
        if file.is_file():
            z.write(file, 'extension/' + str(file.relative_to(src)))
print(target)
print(f'{target.stat().st_size:,} bytes; no bundled pet assets')
