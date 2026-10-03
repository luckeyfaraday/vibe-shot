$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Load the real DPI setup and functions without starting an interactive capture.
$sourcePath = Join-Path $PSScriptRoot '../src/capture-windows.ps1'
$source = Get-Content -LiteralPath $sourcePath -Raw
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
$lastFunction = $ast.EndBlock.Statements |
  Where-Object { $_ -is [System.Management.Automation.Language.FunctionDefinitionAst] } |
  Select-Object -Last 1
. ([scriptblock]::Create($source.Substring(0, $lastFunction.Extent.EndOffset))) -Mode region -OutputPath unused

# Deliver client-pixel mouse events to the production handlers on a hidden form.
# No desktop input, visible overlay, or clipboard changes are needed for this test.
Add-Type -ReferencedAssemblies System.Windows.Forms, System.Drawing @'
using System.Drawing;
using System.Windows.Forms;

public class CaptureTestForm : Form
{
    public Point Start;
    public Point End;

    public new DialogResult ShowDialog()
    {
        OnMouseDown(new MouseEventArgs(MouseButtons.Left, 1, Start.X, Start.Y, 0));
        OnMouseMove(new MouseEventArgs(MouseButtons.Left, 0, End.X, End.Y, 0));
        OnMouseUp(new MouseEventArgs(MouseButtons.Left, 1, End.X, End.Y, 0));
        return DialogResult;
    }
}
'@

function New-SelectionForm {
  param([string]$Message)
  $form = New-Object CaptureTestForm
  $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
  $form.Bounds = New-Object System.Drawing.Rectangle($script:originX, $script:originY, 1200, 900)
  $form.Start = $script:dragStart
  $form.End = $script:dragEnd
  # Create the HWND so PointToScreen uses the same DPI context as the selector.
  [void]$form.Handle
  return $form
}

$outputPath = Join-Path ([System.IO.Path]::GetTempPath()) ('vibeshot-test-' + [guid]::NewGuid() + '.png')
$snapshot = New-Object System.Drawing.Bitmap(1200, 900)
$graphics = [System.Drawing.Graphics]::FromImage($snapshot)
try {
  $graphics.Clear([System.Drawing.Color]::Magenta)
  $graphics.FillRectangle([System.Drawing.Brushes]::Lime, 400, 300, 500, 400)
  $snapshot.SetPixel(400, 300, [System.Drawing.Color]::Red)
  $snapshot.SetPixel(899, 699, [System.Drawing.Color]::Blue)

  # Include nonzero and negative desktop origins, and all four drag directions.
  foreach ($origin in @(@(0, 0), @(200, 100), @(-1200, -900))) {
    $script:originX = $origin[0]
    $script:originY = $origin[1]
    foreach ($drag in @(@(400, 300, 900, 700), @(900, 700, 400, 300), @(900, 300, 400, 700), @(400, 700, 900, 300))) {
      $script:dragStart = New-Object System.Drawing.Point($drag[0], $drag[1])
      $script:dragEnd = New-Object System.Drawing.Point($drag[2], $drag[3])
      $bounds = Select-Region
      $expected = New-Object System.Drawing.Rectangle(($origin[0] + 400), ($origin[1] + 300), 500, 400)
      if ($bounds -ne $expected) { throw "Selected $bounds; expected $expected" }

      $snapshotBounds = New-Object System.Drawing.Rectangle($origin[0], $origin[1], 1200, 900)
      Save-BitmapArea -Snapshot $snapshot -SnapshotBounds $snapshotBounds -Bounds $bounds -Path $outputPath
      $saved = [System.Drawing.Bitmap]::FromFile($outputPath)
      try {
        if (($saved.Width -ne 500) -or ($saved.Height -ne 400)) { throw 'Saved image dimensions changed' }
        if ($saved.GetPixel(0, 0).ToArgb() -ne [System.Drawing.Color]::Red.ToArgb()) { throw 'Crop starts at the wrong pixel' }
        if ($saved.GetPixel(499, 399).ToArgb() -ne [System.Drawing.Color]::Blue.ToArgb()) { throw 'Crop ends at the wrong pixel' }
        if ($saved.GetPixel(250, 200).ToArgb() -ne [System.Drawing.Color]::Lime.ToArgb()) { throw 'Crop contains the wrong area' }
      } finally {
        $saved.Dispose()
      }
    }
  }
} finally {
  $graphics.Dispose()
  $snapshot.Dispose()
  if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath }
}

Write-Output 'Capture coordinate checks passed'
