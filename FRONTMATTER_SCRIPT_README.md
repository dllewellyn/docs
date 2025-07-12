# Front Matter to CSV/JSON Processor

This script processes all markdown (.md and .mdx) files in the repository, extracts their YAML front matter headers, and exports the data to CSV and JSON formats for analysis.

## Features

- **Automatic Discovery**: Scans the entire repository for markdown files
- **Front Matter Parsing**: Extracts YAML front matter from each file using gray-matter
- **File Metadata**: Captures file path, size, modification date, and content structure
- **Multiple Export Formats**: JSON and CSV export options
- **GitHub Actions Integration**: Automated CSV generation with downloadable artifacts
- **Detailed Reporting**: Shows summary of files processed and front matter fields found

## Installation

```bash
npm install
```

## Usage

### Basic Usage (JSON + CSV export)
```bash
node process-frontmatter.js
```

### CSV Only
```bash
npm run process-frontmatter:csv
# or
node process-frontmatter.js --no-json
```

### Custom Options
```bash
# Custom output files
node process-frontmatter.js --output=my-data.json --csv=my-data.csv
```

# Skip JSON or CSV generation
node process-frontmatter.js --no-json          # Only CSV
node process-frontmatter.js --no-csv           # Only JSON
```

## NPM Scripts

- `npm run process-frontmatter`: Generate both JSON and CSV files
- `npm run process-frontmatter:csv`: Generate CSV file only

## Command Line Options

- `--no-json`: Skip saving data to JSON file
- `--no-csv`: Skip saving data to CSV file
- `--output=FILE`: Specify custom output JSON file name (default: frontmatter-data.json)
- `--csv=FILE`: Specify custom output CSV file name (default: frontmatter-data.csv)
- `--help`, `-h`: Show help message

## GitHub Actions Integration

The repository includes a GitHub Actions workflow (`.github/workflows/generate-frontmatter-csv.yml`) that automatically:

1. Runs the front matter processing script
2. Generates a CSV file with all front matter data
3. Uploads the CSV as a downloadable artifact
4. Triggers on push to main/master branches, pull requests, or manual dispatch

### Downloading the CSV

1. Go to the "Actions" tab in your GitHub repository
2. Find the latest "Generate Front Matter CSV" workflow run
3. Download the "frontmatter-data-csv" artifact
4. Extract the ZIP file to get the CSV

## Output Formats

### JSON Structure

The script generates a JSON file with the following structure:

```json
{
  "timestamp": "2025-07-12T08:11:05.488Z",
  "summary": {
    "totalFiles": 16,
    "filesWithFrontMatter": 14,
    "uniqueFields": ["title", "description", "icon", "openapi"]
  },
  "files": [
    {
      "filePath": "introduction.mdx",
      "fileName": "introduction.mdx",
      "directory": ".",
      "frontMatter": {
        "title": "Introduction",
        "description": "Welcome to the home of your new documentation"
      },
      "isEmpty": false,
      "hasContent": true,
      "lastModified": "2025-07-12T08:07:25.057Z",
      "size": 1646
    }
  ]
}
```

### CSV Structure

The CSV export includes:
- **File metadata columns**: `filePath`, `fileName`, `directory`, `lastModified`, `size`
- **Front matter columns**: One column for each unique front matter field found across all files
- **Empty cells**: Files without a particular front matter field will have empty values in that column

Example CSV headers: `filePath,fileName,directory,lastModified,size,title,description,icon,openapi`

This format is perfect for:
- Spreadsheet analysis (Excel, Google Sheets)
- Data analysis tools (R, Python pandas)
- Database imports
- Content auditing and reporting

## Programmatic Usage

```javascript
const FrontMatterProcessor = require('./process-frontmatter');

const processor = new FrontMatterProcessor();

// Process files and get summary
const summary = await processor.process({
  saveToFile: true,
  saveToCsv: true,
  outputFile: 'custom-output.json',
  csvFile: 'custom-data.csv'
});

console.log(summary);
```

## Error Handling

The script includes comprehensive error handling:

- Individual file processing errors don't stop the entire process
- Clear error messages and logging throughout the process

## Dependencies

- `gray-matter`: YAML front matter parsing
- `glob`: File system pattern matching
- `dotenv`: Environment variable loading (dev dependency)