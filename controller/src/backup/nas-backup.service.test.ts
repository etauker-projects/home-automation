/**
 * Simple test to demonstrate semaphore-based concurrency limiting
 * in NasBackupService.
 * 
 * This is a manual test/demo - run with: ts-node nas-backup.service.test.ts
 */

import { NasBackupService } from './nas-backup.service';
import type { BackupResult } from './backup.interfaces';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

async function setupTestFiles(sourceDir: string, count: number): Promise<void> {
  await rm(sourceDir, { recursive: true, force: true });
  await mkdir(sourceDir, { recursive: true });
  
  for (let i = 0; i < count; i++) {
    const filePath = path.join(sourceDir, `test-file-${i}.txt`);
    await writeFile(filePath, `Test content ${i}\n`.repeat(100));
  }
  
  console.log(`✓ Created ${count} test files in ${sourceDir}`);
}

async function cleanupTestDirs(...dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    await rm(dir, { recursive: true, force: true });
  }
}

async function testConcurrencyLimit() {
  const sourceDir = '/tmp/backup-test-source';
  const nasDir = '/tmp/backup-test-nas';
  
  console.log('\n=== Testing Semaphore-Based Concurrency Limiting ===\n');
  
  try {
    // Setup
    await setupTestFiles(sourceDir, 10);
    await rm(nasDir, { recursive: true, force: true });
    await mkdir(nasDir, { recursive: true });
    
    // Create service with max 2 concurrent backups
    const service = new NasBackupService(sourceDir, nasDir, {
      maxConcurrentBackups: 2,
      retries: 1,
      retryDelayMs: 100,
    });
    
    // Track concurrent executions
    let currentConcurrent = 0;
    let maxConcurrent = 0;
    const startTimes: Record<string, number> = {};
    
    // Monkey-patch to track concurrency (for demo purposes)
    const originalCopyAndVerify = (service as any).copyAndVerify.bind(service);
    (service as any).copyAndVerify = async function(sourceFile: string) {
      const fileName = path.basename(sourceFile);
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      startTimes[fileName] = Date.now();
      
      console.log(`  [${new Date().toISOString().split('T')[1].slice(0, -1)}] ⚡ START ${fileName} (concurrent: ${currentConcurrent})`);
      
      try {
        return await originalCopyAndVerify(sourceFile);
      } finally {
        const duration = Date.now() - startTimes[fileName];
        currentConcurrent--;
        console.log(`  [${new Date().toISOString().split('T')[1].slice(0, -1)}] ✓ END   ${fileName} (took ${duration}ms, concurrent now: ${currentConcurrent})`);
      }
    };
    
    // Start timer
    const startTime = Date.now();
    
    // Call backupFile directly multiple times concurrently
    const files = Array.from({ length: 10 }, (_, i) => 
      path.join(sourceDir, `test-file-${i}.txt`)
    );
    
    console.log('Starting 10 concurrent backupFile() calls with maxConcurrentBackups=2...\n');
    
    const results = await Promise.all(
      files.map(file => service.backupFile(file))
    );
    
    const duration = Date.now() - startTime;
    
    // Results
    console.log('\n=== Test Results ===');
    console.log(`✓ Total files backed up: ${results.length}`);
    console.log(`✓ Max concurrent operations observed: ${maxConcurrent}`);
    console.log(`✓ Expected max concurrent: 2`);
    console.log(`✓ Total duration: ${duration}ms`);
    console.log(`\n${maxConcurrent <= 2 ? '✅ PASS' : '❌ FAIL'}: Concurrency limit respected!`);
    
    // Cleanup
    await cleanupTestDirs(sourceDir, nasDir);
    
  } catch (err) {
    console.error('Test failed:', err);
    await cleanupTestDirs(sourceDir, nasDir);
    throw err;
  }
}

// Run test if executed directly
if (require.main === module) {
  testConcurrencyLimit()
    .then(() => {
      console.log('\n✓ Test completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n✗ Test failed:', err);
      process.exit(1);
    });
}
