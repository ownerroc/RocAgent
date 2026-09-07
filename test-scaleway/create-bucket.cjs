require('dotenv').config({ path: '../.env' });

const Scaleway = require('@scaleway/sdk-client');

const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

async function createBucket() {
  const apiToken = process.env.SCW_SECRET_KEY;
  const accessKeyId = process.env.SCW_ACCESS_KEY;
  const projectId = process.env.SCW_DEFAULT_PROJECT_ID; // fallback to default project ID
  console.log('DEBUG ENV', { accessKeyId, apiToken, projectId });
  
  console.log('🎯 Creating Object Storage Bucket...\n');
  console.log('Config:', { 
    region: 'fr-par', 
    projectId: projectId?.substring(0, 8) + '...' 
  });
  
  // Initialize S3 client
  const s3 = new S3Client({
    region: 'fr-par',
    endpoint: 'https://s3.fr-par.scw.cloud',
    credentials: {
      accessKeyId: projectId, // Scaleway uses project ID as access key
      secretAccessKey: apiToken,
    },
  });
  
  const bucketName = `rocsystem-test-${Date.now()}`;
  
  try {
    const command = new CreateBucketCommand({
      Bucket: bucketName,
      ACL: 'private',
    });
    
    const result = await s3.send(command);
    console.log('✅ Bucket Created Successfully!');
    console.log('📦 Bucket Name:', bucketName);
    console.log('🌍 Region: fr-par');
    console.log('\n📋 S3 Endpoint: https://s3.fr-par.scw.cloud');
    
    return { success: true, bucketName, location: result.Location };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('📝 Status:', error.$metadata);
    }
    return { success: false, error: error.message };
  }
}

createBucket().then(result => {
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});