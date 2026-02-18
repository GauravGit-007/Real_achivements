# start-dev.ps1

Write-Host "--- Elite Dashboard Dev Starter ---" -ForegroundColor Cyan

# Ports to check
$ports = @(3001, 5173)

Write-Host "Stopping existing processes on ports: $($ports -join ', ')..." -ForegroundColor Yellow

foreach ($port in $ports) {
    # Find processes using the port (both listening and established)
    $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($procIds) {
        foreach ($id in $procIds) {
            $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Killing process $($proc.ProcessName) (PID: $id) on port $port..." -ForegroundColor Gray
                Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
                # Give OS a millisecond to release the port
                Start-Sleep -Milliseconds 200
            }
        }
    } else {
        Write-Host "No process found on port $port." -ForegroundColor Gray
    }
}

# Wait a moment for ports to clear
Start-Sleep -Seconds 2

Write-Host "`nStarting Backend Server..." -ForegroundColor Green
# Start in a new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm start"

Write-Host "Starting Frontend Server..." -ForegroundColor Green
# Start in another new terminal window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host "`nAll systems are booting up! Check the new windows for logs." -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "Backend: http://localhost:3001" -ForegroundColor Gray
