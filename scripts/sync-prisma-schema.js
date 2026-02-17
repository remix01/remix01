import { execSync } from 'child_process';

console.log('🔄 Syncing Prisma schema to database...');
console.log('This will create all tables defined in prisma/schema.prisma');

try {
  // Run prisma db push to sync schema without creating migrations
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  
  console.log('✅ Database schema synced successfully!');
  console.log('📊 Generating Prisma Client...');
  
  // Generate Prisma Client
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  
  console.log('✅ Prisma Client generated!');
  console.log('🎉 All done! Your database is ready.');
  
} catch (error) {
  console.error('❌ Error syncing database:', error.message);
  process.exit(1);
}
