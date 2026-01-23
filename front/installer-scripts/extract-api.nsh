; Custom NSIS script for ActoGraph
; Extracts the API node_modules ZIP using PowerShell for faster installation

!macro customInstall
  ; Display status message
  DetailPrint "Extracting API dependencies..."
  
  ; Store paths in registers (available in macros)
  StrCpy $R0 "$INSTDIR\resources\src-electron\extra-resources\api\api-node-modules.zip"
  StrCpy $R1 "$INSTDIR\resources\src-electron\extra-resources\api\dist"
  
  ; Check if ZIP exists
  IfFileExists $R0 0 skipExtract
    
    ; Create destination directory if it doesn't exist
    CreateDirectory $R1
    
    ; Use PowerShell to extract the ZIP (available on all modern Windows)
    ; -NoProfile: Faster startup
    ; -ExecutionPolicy Bypass: Allow script execution
    DetailPrint "Decompressing API modules (this may take a moment)..."
    
    ; Build the PowerShell command
    ; Use double quotes for NSIS string (so $R0/$R1 are interpolated)
    ; Use single quotes inside for PowerShell paths (handles spaces in paths)
    ; $\" is NSIS escape for double quote character
    nsExec::ExecToLog "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command $\"Expand-Archive -LiteralPath '$R0' -DestinationPath '$R1' -Force$\""
    Pop $0
    
    ; Check result (0 = success for nsExec, "error" = failed to execute)
    StrCmp $0 "error" extractFailed
    ; Non-error means success (exit code could be 0 or empty string)
    Goto extractSuccess
    
    extractSuccess:
      DetailPrint "API dependencies extracted successfully."
      ; Delete the ZIP file to save space
      Delete $R0
      Goto done
      
    extractFailed:
      DetailPrint "Warning: Failed to extract API dependencies (error: $0)"
      DetailPrint "The application may not work correctly."
      ; Don't delete ZIP on failure, might be useful for debugging
      Goto done
  
  skipExtract:
    DetailPrint "No API ZIP found, skipping extraction."
  
  done:
!macroend
