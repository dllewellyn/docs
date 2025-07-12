#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { glob } = require('glob');
const admin = require('firebase-admin');

/**
 * Script to process markdown files with front matter and sync to Firestore
 * 
 * This script:
 * 1. Scans for all .md and .mdx files in the repository
 * 2. Extracts front matter from each file
 * 3. Prepares data for Firestore storage
 * 4. Optionally syncs the data to Firestore
 */

class FrontMatterProcessor {
  constructor() {
    this.markdownFiles = [];
    this.frontMatterData = [];
    this.firebaseApp = null;
    this.db = null;
  }

  /**
   * Initialize Firebase Admin SDK
   * Requires FIREBASE_SERVICE_ACCOUNT_KEY environment variable or service account file
   */
  async initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (this.firebaseApp) {
        return;
      }

      // Try to get service account from environment variable
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Try to use default credentials or service account file
        console.log('No FIREBASE_SERVICE_ACCOUNT_KEY found. Trying default credentials...');
        console.log('Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable or ensure default credentials are available.');
        return false;
      }

      this.db = admin.firestore();
      console.log('✓ Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('✗ Failed to initialize Firebase:', error.message);
      return false;
    }
  }

  /**
   * Scan directory for markdown files
   */
  async scanMarkdownFiles() {
    try {
      console.log('Scanning for markdown files...');
      
      // Find all .md and .mdx files, excluding node_modules and .git
      const patterns = [
        '**/*.md',
        '**/*.mdx'
      ];
      
      const options = {
        ignore: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**'
        ]
      };

      for (const pattern of patterns) {
        const files = await glob(pattern, options);
        this.markdownFiles.push(...files);
      }

      // Remove duplicates
      this.markdownFiles = [...new Set(this.markdownFiles)];
      
      console.log(`✓ Found ${this.markdownFiles.length} markdown files`);
      return this.markdownFiles;
    } catch (error) {
      console.error('✗ Error scanning markdown files:', error.message);
      throw error;
    }
  }

  /**
   * Parse front matter from markdown files
   */
  async parseFrontMatter() {
    try {
      console.log('Parsing front matter from markdown files...');
      this.frontMatterData = [];

      for (const filePath of this.markdownFiles) {
        try {
          const fullPath = path.resolve(filePath);
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          
          // Parse front matter using gray-matter
          const parsed = matter(fileContent);
          
          const fileData = {
            filePath: filePath,
            fileName: path.basename(filePath),
            directory: path.dirname(filePath),
            frontMatter: parsed.data,
            content: parsed.content,
            isEmpty: parsed.isEmpty,
            hasContent: parsed.content.trim().length > 0,
            lastModified: fs.statSync(fullPath).mtime,
            size: fs.statSync(fullPath).size
          };

          this.frontMatterData.push(fileData);
          
          console.log(`  ✓ Processed: ${filePath}`);
          if (Object.keys(parsed.data).length > 0) {
            console.log(`    Front matter keys: ${Object.keys(parsed.data).join(', ')}`);
          }
        } catch (fileError) {
          console.error(`  ✗ Error processing ${filePath}:`, fileError.message);
        }
      }

      console.log(`✓ Parsed front matter from ${this.frontMatterData.length} files`);
      return this.frontMatterData;
    } catch (error) {
      console.error('✗ Error parsing front matter:', error.message);
      throw error;
    }
  }

  /**
   * Generate summary of front matter data
   */
  generateSummary() {
    console.log('\n=== FRONT MATTER SUMMARY ===');
    
    // Count files with front matter
    const filesWithFrontMatter = this.frontMatterData.filter(file => 
      Object.keys(file.frontMatter).length > 0
    );
    
    console.log(`Total files processed: ${this.frontMatterData.length}`);
    console.log(`Files with front matter: ${filesWithFrontMatter.length}`);
    console.log(`Files without front matter: ${this.frontMatterData.length - filesWithFrontMatter.length}`);

    // Collect all unique front matter keys
    const allKeys = new Set();
    filesWithFrontMatter.forEach(file => {
      Object.keys(file.frontMatter).forEach(key => allKeys.add(key));
    });

    console.log(`\nUnique front matter fields found: ${Array.from(allKeys).join(', ')}`);

    // Show files with front matter
    console.log('\n=== FILES WITH FRONT MATTER ===');
    filesWithFrontMatter.forEach(file => {
      console.log(`\n📄 ${file.filePath}`);
      console.log(`   ${JSON.stringify(file.frontMatter, null, 2).replace(/\n/g, '\n   ')}`);
    });

    return {
      totalFiles: this.frontMatterData.length,
      filesWithFrontMatter: filesWithFrontMatter.length,
      uniqueFields: Array.from(allKeys),
      data: this.frontMatterData
    };
  }

  /**
   * Sync data to Firestore
   */
  async syncToFirestore(collectionName = 'markdown_files') {
    if (!this.db) {
      console.log('⚠️  Firestore not initialized. Skipping sync.');
      return false;
    }

    try {
      console.log(`\nSyncing data to Firestore collection: ${collectionName}`);
      
      const batch = this.db.batch();
      let batchCount = 0;
      const maxBatchSize = 500; // Firestore batch limit

      for (const fileData of this.frontMatterData) {
        // Create document ID from file path (sanitized)
        const docId = fileData.filePath.replace(/[\/\\.]/g, '_');
        
        const docRef = this.db.collection(collectionName).doc(docId);
        
        // Prepare data for Firestore (remove functions and add timestamps)
        const firestoreData = {
          filePath: fileData.filePath,
          fileName: fileData.fileName,
          directory: fileData.directory,
          frontMatter: fileData.frontMatter,
          isEmpty: fileData.isEmpty,
          hasContent: fileData.hasContent,
          lastModified: admin.firestore.Timestamp.fromDate(fileData.lastModified),
          size: fileData.size,
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(docRef, firestoreData);
        batchCount++;

        // Commit batch if it reaches the limit
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          console.log(`✓ Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
      }

      // Commit remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✓ Committed final batch of ${batchCount} documents`);
      }

      console.log(`✓ Successfully synced ${this.frontMatterData.length} files to Firestore`);
      return true;
    } catch (error) {
      console.error('✗ Error syncing to Firestore:', error.message);
      return false;
    }
  }

  /**
   * Save data to JSON file for backup/review
   */
  async saveToFile(outputPath = 'frontmatter-data.json') {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        summary: this.generateSummary(),
        files: this.frontMatterData
      };

      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`✓ Data saved to ${outputPath}`);
      return true;
    } catch (error) {
      console.error('✗ Error saving to file:', error.message);
      return false;
    }
  }

  /**
   * Main processing function
   */
  async process(options = {}) {
    const {
      syncToFirestore = false,
      saveToFile = true,
      outputFile = 'frontmatter-data.json',
      collectionName = 'markdown_files'
    } = options;

    try {
      console.log('🚀 Starting front matter processing...\n');

      // Scan for markdown files
      await this.scanMarkdownFiles();

      // Parse front matter
      await this.parseFrontMatter();

      // Generate summary
      const summary = this.generateSummary();

      // Save to file if requested
      if (saveToFile) {
        await this.saveToFile(outputFile);
      }

      // Sync to Firestore if requested and possible
      if (syncToFirestore) {
        const firebaseInitialized = await this.initializeFirebase();
        if (firebaseInitialized) {
          await this.syncToFirestore(collectionName);
        }
      }

      console.log('\n✅ Processing completed successfully!');
      return summary;
    } catch (error) {
      console.error('\n❌ Processing failed:', error.message);
      throw error;
    }
  }
}

// CLI functionality
async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    syncToFirestore: args.includes('--sync-firestore'),
    saveToFile: !args.includes('--no-save'),
    outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'frontmatter-data.json',
    collectionName: args.find(arg => arg.startsWith('--collection='))?.split('=')[1] || 'markdown_files'
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node process-frontmatter.js [options]

Options:
  --sync-firestore     Sync data to Firestore (requires FIREBASE_SERVICE_ACCOUNT_KEY)
  --no-save           Don't save data to JSON file
  --output=FILE       Output JSON file name (default: frontmatter-data.json)
  --collection=NAME   Firestore collection name (default: markdown_files)
  --help, -h          Show this help message

Environment Variables:
  FIREBASE_SERVICE_ACCOUNT_KEY  JSON string of Firebase service account key

Examples:
  node process-frontmatter.js                    # Parse and save to JSON only
  node process-frontmatter.js --sync-firestore   # Parse and sync to Firestore
  node process-frontmatter.js --output=data.json # Save to custom file
`);
    process.exit(0);
  }

  const processor = new FrontMatterProcessor();
  
  try {
    await processor.process(options);
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic usage
module.exports = FrontMatterProcessor;

// Run as CLI if this file is executed directly
if (require.main === module) {
  main();
}