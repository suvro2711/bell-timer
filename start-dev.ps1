# Load environment variables from .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        # Remove quotes if present
        $value = $value -replace "^'|'$", ""
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Set NODE_ENV
$env:NODE_ENV = "development"

# Start the server
npx tsx server/index.ts
