import { Hono } from 'jsr:hono@4';
import { cors } from 'jsr:hono/cors';
import { logger } from 'jsr:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * Minimal Deno declaration so TypeScript doesn't error in environments
 * that don't provide the Deno types at compile time.
 */
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger(console.log));

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check
app.get('/make-server-9c20aedf/health', (c) => {
  return c.json({ status: 'ok', message: 'Server is running' });
});

// ===== TUTORS ENDPOINTS =====

// Get all tutors
app.get('/make-server-9c20aedf/tutors', async (c) => {
  try {
    const tutors = await kv.getByPrefix('tutor:');
    return c.json({ tutors });
  } catch (error) {
    console.log('Error fetching tutors:', error);
    return c.json({ error: 'Failed to fetch tutors', details: String(error) }, 500);
  }
});

// Get single tutor
app.get('/make-server-9c20aedf/tutors/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tutor = await kv.get(`tutor:${id}`);
    
    if (!tutor) {
      return c.json({ error: 'Tutor not found' }, 404);
    }
    
    return c.json({ tutor });
  } catch (error) {
    console.log('Error fetching tutor:', error);
    return c.json({ error: 'Failed to fetch tutor', details: String(error) }, 500);
  }
});

// Create tutor
app.post('/make-server-9c20aedf/tutors', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, username, password } = body;
    
    if (!name || !email || !phone || !username || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const id = Date.now().toString();
    const tutor = {
      id,
      name,
      email,
      phone,
      username,
      password,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`tutor:${id}`, tutor);
    
    return c.json({ tutor }, 201);
  } catch (error) {
    console.log('Error creating tutor:', error);
    return c.json({ error: 'Failed to create tutor', details: String(error) }, 500);
  }
});

// Update tutor
app.put('/make-server-9c20aedf/tutors/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingTutor = await kv.get(`tutor:${id}`);
    if (!existingTutor) {
      return c.json({ error: 'Tutor not found' }, 404);
    }
    
    const updatedTutor = {
      ...existingTutor,
      ...body,
      id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`tutor:${id}`, updatedTutor);
    
    return c.json({ tutor: updatedTutor });
  } catch (error) {
    console.log('Error updating tutor:', error);
    return c.json({ error: 'Failed to update tutor', details: String(error) }, 500);
  }
});

// Delete tutor
app.delete('/make-server-9c20aedf/tutors/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`tutor:${id}`);
    
    return c.json({ message: 'Tutor deleted successfully' });
  } catch (error) {
    console.log('Error deleting tutor:', error);
    return c.json({ error: 'Failed to delete tutor', details: String(error) }, 500);
  }
});

// ===== PETS ENDPOINTS =====

// Get all pets
app.get('/make-server-9c20aedf/pets', async (c) => {
  try {
    const pets = await kv.getByPrefix('pet:');
    return c.json({ pets });
  } catch (error) {
    console.log('Error fetching pets:', error);
    return c.json({ error: 'Failed to fetch pets', details: String(error) }, 500);
  }
});

// Get pets by tutor
app.get('/make-server-9c20aedf/pets/tutor/:tutorId', async (c) => {
  try {
    const tutorId = c.req.param('tutorId');
    const allPets = await kv.getByPrefix('pet:');
    const tutorPets = allPets.filter((pet: any) => pet.tutorId === tutorId);
    
    return c.json({ pets: tutorPets });
  } catch (error) {
    console.log('Error fetching pets by tutor:', error);
    return c.json({ error: 'Failed to fetch pets', details: String(error) }, 500);
  }
});

// Get single pet
app.get('/make-server-9c20aedf/pets/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const pet = await kv.get(`pet:${id}`);
    
    if (!pet) {
      return c.json({ error: 'Pet not found' }, 404);
    }
    
    return c.json({ pet });
  } catch (error) {
    console.log('Error fetching pet:', error);
    return c.json({ error: 'Failed to fetch pet', details: String(error) }, 500);
  }
});

// Create pet
app.post('/make-server-9c20aedf/pets', async (c) => {
  try {
    const body = await c.req.json();
    const { name, species, breed, age, tutorName, tutorId, services, checkIn, checkOut } = body;
    
    if (!name || !species || !breed || !age || !tutorName || !tutorId || !services || !checkIn || !checkOut) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const id = (Date.now() + 1).toString();
    const pet = {
      id,
      name,
      species,
      breed,
      age,
      tutorName,
      tutorId,
      services,
      checkIn,
      checkOut,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`pet:${id}`, pet);
    
    return c.json({ pet }, 201);
  } catch (error) {
    console.log('Error creating pet:', error);
    return c.json({ error: 'Failed to create pet', details: String(error) }, 500);
  }
});

// Update pet
app.put('/make-server-9c20aedf/pets/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingPet = await kv.get(`pet:${id}`);
    if (!existingPet) {
      return c.json({ error: 'Pet not found' }, 404);
    }
    
    const updatedPet = {
      ...existingPet,
      ...body,
      id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`pet:${id}`, updatedPet);
    
    return c.json({ pet: updatedPet });
  } catch (error) {
    console.log('Error updating pet:', error);
    return c.json({ error: 'Failed to update pet', details: String(error) }, 500);
  }
});

// Delete pet
app.delete('/make-server-9c20aedf/pets/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`pet:${id}`);
    
    return c.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.log('Error deleting pet:', error);
    return c.json({ error: 'Failed to delete pet', details: String(error) }, 500);
  }
});

// ===== COMBINED REGISTRATION =====

app.post('/make-server-9c20aedf/register', async (c) => {
  try {
    const body = await c.req.json();
    const { tutor, pet } = body;
    
    // Validate tutor data
    if (!tutor?.name || !tutor?.email || !tutor?.phone || !tutor?.username || !tutor?.password) {
      return c.json({ error: 'Missing required tutor fields' }, 400);
    }
    
    // Validate pet data
    if (!pet?.name || !pet?.species || !pet?.breed || !pet?.age || !pet?.services || !pet?.checkIn || !pet?.checkOut) {
      return c.json({ error: 'Missing required pet fields' }, 400);
    }
    
    const tutorId = Date.now().toString();
    const petId = (Date.now() + 1).toString();
    
    const newTutor = {
      ...tutor,
      id: tutorId,
      createdAt: new Date().toISOString(),
    };
    
    const newPet = {
      ...pet,
      id: petId,
      tutorId,
      tutorName: tutor.name,
      createdAt: new Date().toISOString(),
    };
    
    // Save both to database
    await kv.mset([
      { key: `tutor:${tutorId}`, value: newTutor },
      { key: `pet:${petId}`, value: newPet },
    ]);
    
    return c.json({ tutor: newTutor, pet: newPet }, 201);
  } catch (error) {
    console.log('Error during registration:', error);
    return c.json({ error: 'Failed to register tutor and pet', details: String(error) }, 500);
  }
});

// ===== RTMP CONFIG ENDPOINTS =====

// Get RTMP configuration
app.get('/make-server-9c20aedf/rtmp/config', async (c) => {
  try {
    const config = await kv.get('rtmp:config');
    return c.json({ config: config || { serverUrl: 'rtmp://servidor.example.com/live' } });
  } catch (error) {
    console.log('Error fetching RTMP config:', error);
    return c.json({ error: 'Failed to fetch RTMP config', details: String(error) }, 500);
  }
});

// Update RTMP configuration
app.put('/make-server-9c20aedf/rtmp/config', async (c) => {
  try {
    const body = await c.req.json();
    const { serverUrl } = body;
    
    if (!serverUrl) {
      return c.json({ error: 'Missing serverUrl' }, 400);
    }
    
    const config = {
      serverUrl,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set('rtmp:config', config);
    
    return c.json({ config });
  } catch (error) {
    console.log('Error updating RTMP config:', error);
    return c.json({ error: 'Failed to update RTMP config', details: String(error) }, 500);
  }
});

// Get all camera streams
app.get('/make-server-9c20aedf/rtmp/cameras', async (c) => {
  try {
    const cameras = await kv.getByPrefix('camera:');
    return c.json({ cameras });
  } catch (error) {
    console.log('Error fetching cameras:', error);
    return c.json({ error: 'Failed to fetch cameras', details: String(error) }, 500);
  }
});

// Update camera stream key
app.put('/make-server-9c20aedf/rtmp/cameras/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const camera = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`camera:${id}`, camera);
    
    return c.json({ camera });
  } catch (error) {
    console.log('Error updating camera:', error);
    return c.json({ error: 'Failed to update camera', details: String(error) }, 500);
  }
});

// ===== AUTH ENDPOINT =====

// Simple authentication (for demo purposes)
app.post('/make-server-9c20aedf/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, userType } = body;
    
    if (!username || !password || !userType) {
      return c.json({ error: 'Missing credentials' }, 400);
    }
    
    // Admin login
    if (userType === 'admin') {
      const thisAdmin = await kv.getByPrefix('admin:');
      const admin = thisAdmin.find((a: any) => a.username === username && a.password === password);
      
      if (!admin) {
        return c.json({ error: 'Login ou Senha Inválidos' }, 401);
      }

      return c.json({ 
        user: { ...admin, userType: 'admin' },
        success: true 
      });
    }
    
    // Tutor login
    if (userType === 'tutor') {
      const tutors = await kv.getByPrefix('tutor:');
      const tutor = tutors.find((t: any) => t.username === username && t.password === password);
      
      if (!tutor) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }
      
      return c.json({ 
        user: { ...tutor, userType: 'tutor' },
        success: true 
      });
    }
    
    return c.json({ error: 'Tipo de usuário inválido' }, 400);
  } 
  catch (error) {
    console.log('Ocorreu um erro durante a validação:', error);
    app.onError((err: { message: any; }, c: { json: (arg0: { error: string; details: any; }, arg1: number) => any; }) => {
    console.error('Server error:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
});

// Use an exported fetch handler (compatible with many runtimes and removes
// the direct dependency on the global Deno object during compilation).
export default app.fetch;
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err: { message: any; }, c: { json: (arg0: { error: string; details: any; }, arg1: number) => any; }) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error', details: err.message }, 500);
});

Deno.serve(app.fetch);
