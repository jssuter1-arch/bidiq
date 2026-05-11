import app from './app';
import { supabaseAdmin } from './utils/supabase';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function ensureBuckets() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'property-documents');
  if (!exists) {
    await supabaseAdmin.storage.createBucket('property-documents', { public: false, fileSizeLimit: 52428800 });
    console.log('Created storage bucket: property-documents');
  }
}

ensureBuckets().catch((err) => console.warn('Bucket init warning:', err.message));

app.listen(PORT, () => {
  console.log(`BidIQ API listening on port ${PORT}`);
});
