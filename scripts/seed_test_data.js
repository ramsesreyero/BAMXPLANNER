
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

// Path to the SQLite database in AppData/Roaming/banco-alimentos-planner
// (Standard Electron userData path on Windows)
const dbPath = join(homedir(), 'AppData', 'Roaming', 'banco-alimentos-planner', 'banco_alimentos.db');

console.log('Targeting database at:', dbPath);

const db = new Database(dbPath);

function seed() {
  console.log('Cleaning existing data for a fresh test environment...');
  db.prepare('DELETE FROM colonies').run();
  db.prepare('DELETE FROM beneficiaries').run();
  db.prepare('DELETE FROM institutions').run();
  db.prepare('DELETE FROM supermarkets').run();
  db.prepare('DELETE FROM trucks').run();
  db.prepare('DELETE FROM drivers').run();
  db.prepare('DELETE FROM routes').run();
  db.prepare('DELETE FROM route_stops').run();

  // 1. Seed Drivers
  console.log('Seeding Drivers...');
  const insertDriver = db.prepare('INSERT INTO drivers (name, available_days, max_hours_per_day) VALUES (?, ?, ?)');
  insertDriver.run('Juan el Experto', 'Lunes,Martes,Miercoles,Jueves,Viernes,Sabado', 10);
  insertDriver.run('Pedro Gomez', 'Lunes,Martes,Miercoles,Jueves,Viernes,Sabado', 8);

  // 2. Seed Trucks
  console.log('Seeding Trucks...');
  const insertTruck = db.prepare('INSERT INTO trucks (name, capacity_pantries, capacity_volume, type) VALUES (?, ?, ?, ?)');
  insertTruck.run('Unidad Pesada BAMX (Grande)', 500, 2500, 'Camión');
  insertTruck.run('Unidad Ligera 01', 200, 1000, 'Camioneta');

  // 3. Seed Colonies (9 Urban, 1 Rural)
  console.log('Seeding Colonies...');
  const insertColony = db.prepare('INSERT INTO colonies (name, type, pantry_count, collection_point, frequency, preferred_day, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  const urbanNames = ['Col. Alianza', 'Col. Solidaridad', 'Col. Benito Juarez', 'Col. Hidalgo', 'Col. Nueva Era', 'Col. Voluntad', 'Col. Guerrero', 'Col. Mirador', 'Col. Infonavit'];
  urbanNames.forEach((name, i) => {
    insertColony.run(name, 'Urbana', 40 + (i * 5), 'Direccion ' + name, 'Quincenal', 'Lunes-Martes', 27.48 + (i * 0.005), -99.51 - (i * 0.005));
  });
  insertColony.run('Pueblo Rural KM 40', 'Rural', 100, 'Carretera Nacional KM 40', 'Mensual', 'Sabado', 27.20, -99.45);

  // 4. Seed Beneficiaries (36 for Caridad)
  console.log('Seeding 36 Beneficiaries...');
  const insertBeneficiary = db.prepare('INSERT INTO beneficiaries (name, address, restriction_day, avg_delivery_time) VALUES (?, ?, ?, ?)');
  for (let i = 1; i <= 36; i++) {
    insertBeneficiary.run(`Beneficiario #${i}`, `Calle Falsa ${100 + i}`, 'Ninguna', 10);
  }

  // 5. Seed Institutions
  console.log('Seeding Institutions...');
  const insertInst = db.prepare('INSERT INTO institutions (name, address, fixed_day, estimated_kg, delivery_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertInst.run('Asilo San Jose', 'Av. Reforma 123', 'Miercoles', 200, 30, 27.47, -99.52);
  insertInst.run('Comedor Bethesda', 'Calle 15 de Junio', 'Viernes', 150, 45, 27.49, -99.50);

  // 6. Seed Supermarkets
  console.log('Seeding Supermarkets...');
  const insertSuper = db.prepare('INSERT INTO supermarkets (name, address, collection_days, avg_volume, loading_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertSuper.run('HEB Nuevo Laredo', 'Av. Guerrero', 'Lunes-Sabado', 300, 40, 27.485, -99.508);
  insertSuper.run('Soriana Reforma', 'Av. Reforma', 'Lunes-Sabado', 250, 30, 27.46, -99.525);
  insertSuper.run('OXXO Donaciones', 'Varios Puntos', 'Aleatorio', 50, 15, 27.45, -99.53);

  console.log('Seeding complete! Everything ready for Monthly Planning.');
}

seed();
db.close();
