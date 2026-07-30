' Runs concierge.ps1 with no visible window.
' Target of the "AtriumConcierge" logon scheduled task.
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run _
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "\concierge.ps1""", 0, False
