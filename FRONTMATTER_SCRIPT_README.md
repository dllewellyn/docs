# Front Matter to Firestore Processor

This script processes all markdown (.md and .mdx) files in the repository, extracts their YAML front matter headers, and optionally syncs the data to a Firestore database.

## Features

- **Automatic Discovery**: Scans the entire repository for markdown files
- **Front Matter Parsing**: Extracts YAML front matter from each file using gray-matter
- **File Metadata**: Captures file path, size, modification date, and content structure
- **Firestore Integration**: Optional sync to Firebase Firestore database
- **JSON Export**: Saves processed data to JSON file for backup/review
- **Detailed Reporting**: Shows summary of files processed and front matter fields found

## Installation

```bash
npm install
```

## Usage

### Basic Usage (JSON export only)
```bash
node process-frontmatter.js
```

### Sync to Firestore
```bash
# Set your Firebase service account key
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Run with Firestore sync
node process-frontmatter.js --sync-firestore
```

### Custom Options
```bash
# Custom output file
node process-frontmatter.js --output=my-data.json

# Custom Firestore collection
node process-frontmatter.js --sync-firestore --collection=docs_metadata

# Don't save JSON file
node process-frontmatter.js --sync-firestore --no-save
```

## Command Line Options

- `--sync-firestore`: Enable syncing to Firestore (requires FIREBASE_SERVICE_ACCOUNT_KEY)
- `--no-save`: Skip saving data to JSON file
- `--output=FILE`: Specify custom output JSON file name (default: frontmatter-data.json)
- `--collection=NAME`: Specify Firestore collection name (default: markdown_files)
- `--help`, `-h`: Show help message

## Environment Variables

- `FIREBASE_SERVICE_ACCOUNT_KEY`: JSON string containing Firebase service account credentials

## Firestore Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Download the JSON file
4. Set the JSON content as the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

## Output Structure

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

## Firestore Document Structure

When syncing to Firestore, each document contains:

- `filePath`: Relative path to the file
- `fileName`: Name of the file
- `directory`: Directory containing the file
- `frontMatter`: Object containing all front matter fields
- `isEmpty`: Whether the front matter is empty
- `hasContent`: Whether the file has content beyond front matter
- `lastModified`: File modification timestamp
- `size`: File size in bytes
- `syncedAt`: Server timestamp when synced to Firestore

## Programmatic Usage

```javascript
const FrontMatterProcessor = require('./process-frontmatter');

const processor = new FrontMatterProcessor();

// Process files and get summary
const summary = await processor.process({
  syncToFirestore: true,
  saveToFile: true,
  outputFile: 'custom-output.json',
  collectionName: 'my_docs'
});

console.log(summary);
```

## Error Handling

The script includes comprehensive error handling:

- Individual file processing errors don't stop the entire process
- Firestore connection issues are handled gracefully
- Clear error messages and logging throughout the process

## Dependencies

- `gray-matter`: YAML front matter parsing
- `firebase-admin`: Firestore integration
- `glob`: File system pattern matching
- `dotenv`: Environment variable loading (dev dependency)