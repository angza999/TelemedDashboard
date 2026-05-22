$TaskName = "TelemedDashboard"
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Scheduled Task removed: $TaskName"
