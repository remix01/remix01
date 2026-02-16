import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function syncDatabase() {
  try {
    console.log('🔄 Starting database sync...\n');
    
    // Run prisma db push
    console.log('Running: npx prisma db push');
    const { stdout: pushOutput, stderr: pushError } = await execAsync('npx prisma db push');
    
    if (pushOutput) console.log(pushOutput);
    if (pushError) console.error(pushError);
    
    console.log('\n✅ Database schema synced successfully!');
    console.log('✅ Prisma Client generated!');
    
  } catch (error) {
    console.error('❌ Error syncing database:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

syncDatabase();
