/**
 * KAYA LEO — Supabase seed script
 * ===============================
 * Run AFTER the SQL migrations (001→004) and AFTER you have set env vars.
 *
 *   cd database/seeds
 *   npm install
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npm run seed
 *
 * What it does:
 *   1. Creates demo accounts (auth users + profiles via the DB trigger):
 *        amina@kayaleo.app  / kayaleo123   (verified HOST, 6 listings)
 *        baraka@kayaleo.app / kayaleo123   (HOST, 3 listings)
 *        admin@kayaleo.app  / kayaleo123   (ADMIN)
 *   2. Uploads the bundled seed photos to the `property-images` bucket.
 *   3. Inserts 9 approved sample properties + images + amenities.
 *
 * Safe to re-run: existing users/properties are updated, not duplicated.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// optional local .env
if (existsSync(join(__dirname, '.env'))) {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('✘ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (server-only key).');
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });
const PASSWORD = 'kayaleo123';
const img = (name) => join(__dirname, 'images', name);

async function upsertUser(email, full_name, phone, role) {
  // create or fetch auth user
  const list = await db.auth.admin.listUsers();
  let user = list.data?.users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✔ created auth user ${email}`);
  } else {
    console.log(`• auth user exists ${email}`);
  }
  // shape the profile
  const { error } = await db
    .from('profiles')
    .update({ full_name, phone, email, role, is_host: role === 'HOST', host_status: role === 'HOST' ? 'approved' : 'none', is_verified: role === 'HOST' })
    .eq('id', user.id);
  if (error) throw error;
  return user.id;
}

async function uploadImage(path, name) {
  const body = readFileSync(path);
  const storagePath = `seed/${name}`;
  const { error } = await db.storage
    .from('property-images')
    .upload(storagePath, body, { contentType: 'image/jpeg', upsert: true });
  if (error && !String(error.message).includes('The resource already exists')) throw error;
  const { data } = db.storage.from('property-images').getPublicUrl(storagePath);
  return { url: data.publicUrl, path: storagePath };
}

const AMENITIES = [
  'Wi-Fi', 'Parking', 'Maji (Water)', 'Umeme (Electricity)', 'Usalama (Security)',
  'Air conditioning', 'Kitchen', 'TV', 'Washing machine', 'Balcony', 'Garden',
  'Swimming pool', 'Generator', 'Solar power',
];

async function amenityIds(names) {
  const { data } = await db.from('amenities').select('id, name').in('name', names);
  const byName = new Map((data || []).map((a) => [a.name, a.id]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) {
    const { data: created, error } = await db.from('amenities').upsert(missing.map((name) => ({ name })), { onConflict: 'name' }).select('id, name');
    if (error) throw error;
    (created || []).forEach((a) => byName.set(a.name, a.id));
  }
  return names.map((n) => byName.get(n));
}

const seedProperties = [
  {
    slug: 'masaki-villa', host: 'amina',
    title: 'Nyumba ya kisasa',
    description: 'Nyumba ya kisasa yenye bwawa la kuogea na sehemu ya kupumzika ya paa, iko katikati ya Masaki ikiwa na mtazamo wa bahari. Ina vyumba vikubwa vya kulala, jiko la kisasa na eneo la maegesho ya magari 2.',
    type: 'HOUSE', price: 1200000, bedrooms: 3, bathrooms: 2, size: 200, furnished: true, featured: true,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Masaki', street: 'Haile Selassie Rd', landmark: 'Karibu na Slipway',
    lat: -6.8135, lng: 39.2855,
    amenities: ['Wi-Fi', 'Parking', 'Swimming pool', 'Usalama (Security)', 'Umeme (Electricity)', 'Maji (Water)', 'Air conditioning', 'Kitchen'],
    images: [['prop-masaki-1.jpg', 'EXTERIOR'], ['prop-masaki-2.jpg', 'LIVING_ROOM'], ['prop-upanga-1.jpg', 'BEDROOM']],
  },
  {
    slug: 'mikocheni-apartment', host: 'amina',
    title: 'Ghorofa ya kifahari',
    description: 'Ghorofa ya kisasa ya ghorofa mbili Mikocheni B, karibu na barabara kuu. Ina jukwaa la kibinafsi, jiko la wazi na eneo la kazi. Maji na umeme hazikatiki (backup tanki na generator).',
    type: 'APARTMENT', price: 950000, bedrooms: 2, bathrooms: 2, size: 120, furnished: true, featured: true,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Mikocheni', street: 'Msasani Rd', landmark: 'Karibu na Shoppers Plaza',
    lat: -6.7892, lng: 39.2741,
    amenities: ['Wi-Fi', 'Parking', 'Generator', 'Balcony', 'Umeme (Electricity)', 'Maji (Water)', 'Kitchen', 'TV'],
    images: [['prop-mikocheni-1.jpg', 'EXTERIOR'], ['prop-kariakoo-1.jpg', 'LIVING_ROOM'], ['prop-sinza-room-1.jpg', 'BEDROOM']],
  },
  {
    slug: 'sinza-family', host: 'amina',
    title: 'Nyumba ya familia',
    description: 'Nyumba kubwa ya familia Sinza A, yenye vyumba 4 vya kulala na bafu 3, bustani na eneo la wanyama watoto. Inafaa familia kubwa.',
    type: 'HOUSE', price: 1500000, bedrooms: 4, bathrooms: 3, size: 250, furnished: false, featured: true,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Sinza', street: 'Shekilango Rd', landmark: 'Karibu na Sinza Mori',
    lat: -6.7692, lng: 39.2311,
    amenities: ['Parking', 'Garden', 'Maji (Water)', 'Umeme (Electricity)', 'Usalama (Security)', 'Kitchen'],
    images: [['prop-sinza-1.jpg', 'EXTERIOR'], ['prop-mbezi-1.jpg', 'LIVING_ROOM']],
  },
  {
    slug: 'kariakoo-house', host: 'baraka',
    title: 'Nyumba ya kisasa Kariakoo',
    description: 'Nyumba ya vyumba 3 iliyokarabatiwa Kariakoo, dakika 5 kutoka soko kuu. Iko katika jengo la salama lenye usimamizi wa lango 24/7.',
    type: 'HOUSE', price: 850000, bedrooms: 3, bathrooms: 2, size: 150, furnished: false, featured: false,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Ilala', neighborhood: 'Kariakoo', street: 'Congo St', landmark: 'Karibu na Kariakoo Market',
    lat: -6.8235, lng: 39.2765,
    amenities: ['Usalama (Security)', 'Maji (Water)', 'Umeme (Electricity)', 'Kitchen'],
    images: [['prop-kariakoo-1.jpg', 'LIVING_ROOM']],
  },
  {
    slug: 'mbezi-apartment', host: 'baraka',
    title: 'Ghorofa ya kifahari Mbezi',
    description: 'Ghorofa ya wazi ya kimataifa Mbezi Beach, mtazamo mzuri wa kupumzika na hewa safi ya bahari. Daladala za kwenda mjini ziko karibu.',
    type: 'APARTMENT', price: 700000, bedrooms: 2, bathrooms: 1, size: 110, furnished: true, featured: false,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Mbezi', street: 'Mbezi Beach Rd', landmark: 'Karibu na Mbezi Beach',
    lat: -6.7886, lng: 39.2512,
    amenities: ['Wi-Fi', 'Balcony', 'Maji (Water)', 'Umeme (Electricity)', 'Solar power', 'Parking'],
    images: [['prop-mbezi-1.jpg', 'LIVING_ROOM']],
  },
  {
    slug: 'upanga-apartment', host: 'amina',
    title: 'Ghorofa ya kisasa Upanga',
    description: 'Ghorofa ya ghorofa ya 8 Upanga yenye lifti, mtazamo wa mji na bahari. Bwawa la kuogea la jengo na gym.',
    type: 'APARTMENT', price: 1100000, bedrooms: 3, bathrooms: 2, size: 160, furnished: true, featured: false,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Ilala', neighborhood: 'Upanga', street: 'United Nations Rd', landmark: 'Karibu na Golden Jubilee Towers',
    lat: -6.8062, lng: 39.2889,
    amenities: ['Wi-Fi', 'Swimming pool', 'Air conditioning', 'Generator', 'Usalama (Security)', 'Parking'],
    images: [['prop-upanga-1.jpg', 'BEDROOM']],
  },
  {
    slug: 'sinza-room', host: 'baraka',
    title: 'Chumba cha kupanga Sinza',
    description: 'Chumba safi na salama cha kupanga Sinza, bafu na choo cha ndani, maji ya kudumu na lango la usalama. Inafaa mwanafunzi au mfanyakazi.',
    type: 'ROOM', price: 250000, bedrooms: 1, bathrooms: 1, size: 25, furnished: false, featured: false,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Sinza', street: 'Kombo Rd', landmark: 'Karibu na Sinza Vatican',
    lat: -6.7723, lng: 39.2338,
    amenities: ['Maji (Water)', 'Umeme (Electricity)', 'Usalama (Security)'],
    images: [['prop-sinza-room-1.jpg', 'BEDROOM']],
  },
  {
    slug: 'bunju-house', host: 'amina',
    title: 'Nyumba ya kifahari Tegeta',
    description: 'Nyumba mpya ya vyumba 4 Tegeta kibele, eneo tulivu la makazi yenye bustani kubwa na maegesho ya magari 3.',
    type: 'HOUSE', price: 900000, bedrooms: 4, bathrooms: 2, size: 180, furnished: false, featured: true,
    region: 'Dar es Salaam', city: 'Dar es Salaam', district: 'Kinondoni', neighborhood: 'Bunju', street: 'Mwenge–Tegeta Rd', landmark: 'Karibu na Tegeta Darajani',
    lat: -6.7375, lng: 39.2296,
    amenities: ['Parking', 'Garden', 'Maji (Water)', 'Umeme (Electricity)', 'Usalama (Security)'],
    images: [['prop-bunju-1.jpg', 'EXTERIOR']],
  },
  {
    slug: 'arusha-house', host: 'baraka',
    title: 'Nyumba ya familia Arusha',
    description: 'Nyumba yenye bustani ya kupumzika Themi, Arusha, mtazamo wa Mlima Meru. Iko katika eneo tulivu la makazi dakika 10 kutoka mjini.',
    type: 'HOUSE', price: 800000, bedrooms: 3, bathrooms: 2, size: 170, furnished: true, featured: false,
    region: 'Arusha', city: 'Arusha', district: 'Arusha Mjini', neighborhood: 'Themi', street: 'Sokoine Rd', landmark: 'Karibu na Themi Living Plaza',
    lat: -3.3869, lng: 36.683,
    amenities: ['Garden', 'Parking', 'Wi-Fi', 'Maji (Water)', 'Umeme (Electricity)', 'Kitchen'],
    images: [['prop-arusha-1.jpg', 'EXTERIOR']],
  },
];

async function main() {
  console.log('🌱 Kaya Leo seed →', URL);

  // 1. users
  const amina = await upsertUser('amina@kayaleo.app', 'Amina Hassan', '+255 712 345 678', 'HOST');
  const baraka = await upsertUser('baraka@kayaleo.app', 'Baraka Okello', '+255 765 999 888', 'HOST');
  await upsertUser('admin@kayaleo.app', 'Msimamizi Kuu', '+255 700 000 001', 'ADMIN');
  await upsertUser('juma@kayaleo.app', 'Juma Mwinyi', '+255 754 111 222', 'USER');
  const hosts = { amina, baraka };

  // 2. amenities
  const allIds = await amenityIds(AMENITIES);
  console.log(`✔ amenities ensured (${allIds.length})`);

  // 3. properties
  for (const p of seedProperties) {
    const { data: existing } = await db.from('properties').select('id').eq('title', p.title).maybeSingle();
    const row = {
      host_id: hosts[p.host],
      title: p.title,
      description: p.description,
      property_type: p.type,
      status: 'approved',
      price_monthly: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      size_m2: p.size,
      furnished: p.furnished,
      max_occupants: 6,
      house_rules: 'Hakuna sherehe kubwa. Wageni waruhusiwa saa 6 asubuhi hadi saa 4 usiku.',
      latitude: p.lat,
      longitude: p.lng,
      country: 'Tanzania',
      region: p.region,
      city: p.city,
      district: p.district,
      neighborhood: p.neighborhood,
      street: p.street,
      landmark: p.landmark,
      is_featured: p.featured,
      reviewed_at: new Date().toISOString(),
    };
    let propertyId;
    if (existing) {
      propertyId = existing.id;
      await db.from('properties').update(row).eq('id', propertyId);
      await db.from('property_images').delete().eq('property_id', propertyId);
    } else {
      const { data, error } = await db.from('properties').insert(row).select('id').single();
      if (error) throw error;
      propertyId = data.id;
    }

    const imageRows = [];
    for (let i = 0; i < p.images.length; i++) {
      const [file, category] = p.images[i];
      const up = await uploadImage(img(file), `${p.slug}-${i}.jpg`);
      imageRows.push({
        property_id: propertyId,
        image_url: up.url,
        storage_path: up.path,
        category,
        sort_order: i,
        is_cover: i === 0,
      });
    }
    await db.from('property_images').insert(imageRows);

    const ids = await amenityIds(p.amenities);
    await db.from('property_amenities').upsert(ids.map((amenity_id) => ({ property_id: propertyId, amenity_id })));
    console.log(`✔ property "${p.title}" (${imageRows.length} photos)`);
  }

  console.log('\n🎉 Seed complete! Demo logins (kayaleo123):');
  console.log('   amina@kayaleo.app  (host) · baraka@kayaleo.app (host) · juma@kayaleo.app (renter) · admin@kayaleo.app (admin)');
}

main().catch((e) => {
  console.error('✘ seed failed:', e.message || e);
  process.exit(1);
});
