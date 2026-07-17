param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('region', 'window', 'screen')]
  [string]$Mode,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class VibeShotNativeMethods
{
    [StructLayout(LayoutKind.Sequential)]
    public struct Point
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();

    [DllImport("user32.dll")]
    public static extern IntPtr SetProcessDpiAwarenessContext(IntPtr value);

    [DllImport("user32.dll")]
    public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);

    [DllImport("user32.dll")]
    public static extern uint GetDpiForWindow(IntPtr window);

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(Point point);

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr window, uint flags);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr window, out Rect rect);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(
        IntPtr window,
        int attribute,
        out Rect value,
        int valueSize
    );
}
'@

$dpiAwarenessSet = $false
try {
  # PowerShell may already have process-level DPI state, so prefer a thread
  # context for the selector UI and its screen-copy operations.
  $dpiAwarenessSet = [VibeShotNativeMethods]::SetThreadDpiAwarenessContext([IntPtr](-4)) -ne [IntPtr]::Zero
} catch {}
if (-not $dpiAwarenessSet) {
  try {
    $dpiAwarenessSet = [VibeShotNativeMethods]::SetProcessDpiAwarenessContext([IntPtr](-4)) -ne [IntPtr]::Zero
  } catch {}
}
if (-not $dpiAwarenessSet) {
  [void][VibeShotNativeMethods]::SetProcessDPIAware()
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function New-SelectionForm {
  param([string]$Message)

  $virtualScreen = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $form = New-Object System.Windows.Forms.Form
  $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
  $form.Bounds = $virtualScreen
  $form.BackColor = [System.Drawing.Color]::Black
  $form.Opacity = 0.28
  $form.TopMost = $true
  $form.ShowInTaskbar = $false
  $form.KeyPreview = $true
  $form.Cursor = [System.Windows.Forms.Cursors]::Cross

  $label = New-Object System.Windows.Forms.Label
  $label.AutoSize = $true
  $label.Padding = New-Object System.Windows.Forms.Padding(12, 8, 12, 8)
  $label.BackColor = [System.Drawing.Color]::Black
  $label.ForeColor = [System.Drawing.Color]::White
  $label.Font = New-Object System.Drawing.Font('Segoe UI', 11)
  $label.Text = $Message

  $cursorScreen = [System.Windows.Forms.Screen]::FromPoint([System.Windows.Forms.Cursor]::Position)
  $label.Location = New-Object System.Drawing.Point(
    ($cursorScreen.Bounds.Left - $virtualScreen.Left + 18),
    ($cursorScreen.Bounds.Top - $virtualScreen.Top + 18)
  )
  $form.Controls.Add($label)
  return $form
}

function ConvertTo-PhysicalFormPoint {
  param(
    [System.Windows.Forms.Form]$Form,
    [System.Drawing.Point]$Point
  )

  # Windows PowerShell's WinForms host can report mouse coordinates scaled by
  # the display DPI even when screen bounds use physical pixels.
  $dpi = [VibeShotNativeMethods]::GetDpiForWindow($Form.Handle)
  if ($dpi -eq 0) { $dpi = 96 }
  $scale = 96.0 / $dpi
  return New-Object System.Drawing.Point(
    [Math]::Round($Point.X * $scale),
    [Math]::Round($Point.Y * $scale)
  )
}

function Select-Region {
  $form = New-SelectionForm 'Drag to capture a region  |  Esc to cancel'
  $script:startPoint = $null
  $script:currentPoint = $null
  $script:selectedBounds = $null

  $form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
      $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
      $form.Close()
    }
  })
  $form.Add_MouseDown({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
      $script:startPoint = $_.Location
      $script:currentPoint = $_.Location
      $form.Invalidate()
    }
  })
  $form.Add_MouseMove({
    if ($null -ne $script:startPoint) {
      $script:currentPoint = $_.Location
      $form.Invalidate()
    }
  })
  $form.Add_Paint({
    if (($null -eq $script:startPoint) -or ($null -eq $script:currentPoint)) { return }
    $left = [Math]::Min($script:startPoint.X, $script:currentPoint.X)
    $top = [Math]::Min($script:startPoint.Y, $script:currentPoint.Y)
    $width = [Math]::Abs($script:startPoint.X - $script:currentPoint.X)
    $height = [Math]::Abs($script:startPoint.Y - $script:currentPoint.Y)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
    try {
      $_.Graphics.DrawRectangle($pen, $left, $top, $width, $height)
    } finally {
      $pen.Dispose()
    }
  })
  $form.Add_MouseUp({
    if (($null -eq $script:startPoint) -or ($_.Button -ne [System.Windows.Forms.MouseButtons]::Left)) { return }
    $startPoint = ConvertTo-PhysicalFormPoint $form $script:startPoint
    $endPoint = ConvertTo-PhysicalFormPoint $form $_.Location
    $left = [Math]::Min($startPoint.X, $endPoint.X)
    $top = [Math]::Min($startPoint.Y, $endPoint.Y)
    $width = [Math]::Abs($startPoint.X - $endPoint.X)
    $height = [Math]::Abs($startPoint.Y - $endPoint.Y)
    if (($width -lt 2) -or ($height -lt 2)) {
      $script:startPoint = $null
      $script:currentPoint = $null
      $form.Invalidate()
      return
    }
    $script:selectedBounds = New-Object System.Drawing.Rectangle(
      ($form.Left + $left),
      ($form.Top + $top),
      $width,
      $height
    )
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
  })

  $result = $form.ShowDialog()
  $form.Dispose()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
  return $script:selectedBounds
}

function Get-SelectedWindowBounds {
  $form = New-SelectionForm 'Click a window to capture  |  Esc to cancel'
  $script:windowPoint = $null

  $form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
      $form.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
      $form.Close()
    }
  })
  $form.Add_MouseClick({
    if ($_.Button -ne [System.Windows.Forms.MouseButtons]::Left) { return }
    $clickPoint = ConvertTo-PhysicalFormPoint $form $_.Location
    $script:windowPoint = New-Object System.Drawing.Point(
      ($form.Left + $clickPoint.X),
      ($form.Top + $clickPoint.Y)
    )
    $form.Hide()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 80
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
  })

  $result = $form.ShowDialog()
  $form.Dispose()
  if (($result -ne [System.Windows.Forms.DialogResult]::OK) -or ($null -eq $script:windowPoint)) {
    return $null
  }

  $point = New-Object VibeShotNativeMethods+Point
  $point.X = $script:windowPoint.X
  $point.Y = $script:windowPoint.Y
  $window = [VibeShotNativeMethods]::WindowFromPoint($point)
  if ($window -eq [IntPtr]::Zero) { return $null }
  $window = [VibeShotNativeMethods]::GetAncestor($window, 2)

  $rect = New-Object VibeShotNativeMethods+Rect
  $dwmResult = [VibeShotNativeMethods]::DwmGetWindowAttribute(
    $window,
    9,
    [ref]$rect,
    [System.Runtime.InteropServices.Marshal]::SizeOf($rect)
  )
  if ($dwmResult -ne 0) {
    if (-not [VibeShotNativeMethods]::GetWindowRect($window, [ref]$rect)) { return $null }
  }

  return New-Object System.Drawing.Rectangle(
    $rect.Left,
    $rect.Top,
    ($rect.Right - $rect.Left),
    ($rect.Bottom - $rect.Top)
  )
}

function New-ScreenBitmap {
  param([System.Drawing.Rectangle]$Bounds)

  if (($Bounds.Width -lt 1) -or ($Bounds.Height -lt 1)) {
    throw 'The screen capture area is empty.'
  }

  $bitmap = New-Object System.Drawing.Bitmap(
    $Bounds.Width,
    $Bounds.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen(
      $Bounds.Location,
      [System.Drawing.Point]::Empty,
      $Bounds.Size,
      [System.Drawing.CopyPixelOperation]::SourceCopy
    )
  } catch {
    $bitmap.Dispose()
    throw
  } finally {
    $graphics.Dispose()
  }
  return $bitmap
}

function Save-BitmapArea {
  param(
    [System.Drawing.Bitmap]$Snapshot,
    [System.Drawing.Rectangle]$SnapshotBounds,
    [System.Drawing.Rectangle]$Bounds,
    [string]$Path
  )

  $relativeBounds = New-Object System.Drawing.Rectangle(
    ($Bounds.Left - $SnapshotBounds.Left),
    ($Bounds.Top - $SnapshotBounds.Top),
    $Bounds.Width,
    $Bounds.Height
  )
  $bitmapBounds = New-Object System.Drawing.Rectangle(0, 0, $Snapshot.Width, $Snapshot.Height)
  $sourceBounds = [System.Drawing.Rectangle]::Intersect($relativeBounds, $bitmapBounds)
  if (($sourceBounds.Width -lt 1) -or ($sourceBounds.Height -lt 1)) {
    throw 'The selected capture area is outside the desktop.'
  }

  $bitmap = New-Object System.Drawing.Bitmap(
    $sourceBounds.Width,
    $sourceBounds.Height,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.DrawImage(
      $Snapshot,
      (New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $bitmap.Height)),
      $sourceBounds,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$snapshotBounds = if ($Mode -eq 'screen') {
  [System.Windows.Forms.Screen]::FromPoint([System.Windows.Forms.Cursor]::Position).Bounds
} else {
  [System.Windows.Forms.SystemInformation]::VirtualScreen
}
$snapshot = New-ScreenBitmap $snapshotBounds
$cancelled = $false
try {
  $bounds = switch ($Mode) {
    'region' { Select-Region }
    'window' { Get-SelectedWindowBounds }
    'screen' { $snapshotBounds }
  }
  if ($null -eq $bounds) {
    $cancelled = $true
  } else {
    Save-BitmapArea -Snapshot $snapshot -SnapshotBounds $snapshotBounds -Bounds $bounds -Path $OutputPath
  }
} finally {
  $snapshot.Dispose()
}

if ($cancelled) { exit 2 }
