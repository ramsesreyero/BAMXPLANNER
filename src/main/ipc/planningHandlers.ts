import { ipcMain } from 'electron'
import { initDB } from '../database'

export function registerPlanningHandlers() {
  ipcMain.handle('planning:get-suggestions', async (_, date: string) => {
    const db = initDB()
    const dayName = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(new Date(date))
    
    const columns = db.prepare("PRAGMA table_info(colonies)").all() as any[]
    const hasRecoveryFee = columns.some(c => c.name === 'recovery_fee')
    
    const coloniesQuery = hasRecoveryFee 
      ? "SELECT id, name, collection_point as address, 'Colonia' as type, lat, lng, recovery_fee FROM colonies WHERE preferred_day LIKE ?"
      : "SELECT id, name, collection_point as address, 'Colonia' as type, lat, lng, 0 as recovery_fee FROM colonies WHERE preferred_day LIKE ?"
    
    const colonies = db.prepare(coloniesQuery).all(`%${dayName}%`)
    const institutions = db.prepare("SELECT id, name, address, 'Institución' as type, lat, lng FROM institutions WHERE fixed_day LIKE ?").all(`%${dayName}%`)
    const supermarkets = db.prepare("SELECT id, name, address, 'Supermercado' as type, lat, lng, is_foreign FROM supermarkets WHERE collection_days LIKE ?").all(`%${dayName}%`)
    
    return [...colonies, ...institutions, ...supermarkets]
  })

  ipcMain.handle('planning:create-route', async (_, routeData: any) => {
    const db = initDB()
    const stmt = db.prepare(
      'INSERT INTO routes (date, truck_id, driver_id, type, status) VALUES (?, ?, ?, ?, ?)'
    )
    const info = stmt.run(
      routeData.date,
      routeData.truck_id,
      routeData.driver_id,
      routeData.type,
      'Pendiente'
    )
    return info.lastInsertRowid
  })

  ipcMain.handle('planning:add-stop', async (_, stopData: any) => {
    const db = initDB()
    const stmt = db.prepare(
      'INSERT INTO route_stops (route_id, stop_type, stop_id, sequence_order) VALUES (?, ?, ?, ?)'
    )
    return stmt.run(
      stopData.route_id,
      stopData.stop_type,
      stopData.stop_id,
      stopData.sequence_order
    )
  })

  ipcMain.handle('planning:seed-data', async () => {
    const db = initDB()
    
    const transaction = db.transaction(() => {
      db.exec('PRAGMA foreign_keys = OFF;');

      db.prepare('DELETE FROM route_stops').run();
      db.prepare('DELETE FROM routes').run();
      db.prepare('DELETE FROM colonies').run();
      db.prepare('DELETE FROM beneficiaries').run();
      db.prepare('DELETE FROM institutions').run();
      db.prepare('DELETE FROM supermarkets').run();
      db.prepare('DELETE FROM trucks').run();
      db.prepare('DELETE FROM drivers').run();

      db.exec('PRAGMA foreign_keys = ON;');

      const insertDriver = db.prepare('INSERT INTO drivers (name, available_days, max_hours_per_day) VALUES (?, ?, ?)');
      insertDriver.run('Juan', 'Lunes,Martes,Miercoles,Jueves,Viernes,Sabado', 10);
      insertDriver.run('Pedro Gomez', 'Lunes,Martes,Miercoles,Jueves,Viernes,Sabado', 8);

      const insertTruck = db.prepare('INSERT INTO trucks (name, capacity_kg, capacity_volume, insurance_policy, type) VALUES (?, ?, ?, ?, ?)');
      insertTruck.run('Unidad Pesada BAMX (Grande)', 3000, 2500, 'POL-001-BAMX', 'Camión');
      insertTruck.run('Unidad Ligera 01', 1200, 1000, 'POL-002-LIG', 'Camioneta');

      const insertColony = db.prepare('INSERT INTO colonies (name, type, pantry_count, collection_point, frequency, preferred_day, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      
      const realColonies = [
        { name: 'Col. Nueva Era', lat: 27.4815, lng: -99.5585 },
        { name: 'Col. Villas de San Miguel', lat: 27.4770, lng: -99.5790 },
        { name: 'Col. El Campanario', lat: 27.4712, lng: -99.6192 },
        { name: 'Col. Blanca Navidad', lat: 27.4850, lng: -99.6000 },
        { name: 'Col. Voluntad y Trabajo 2', lat: 27.4950, lng: -99.5600 },
        { name: 'Col. Alianza', lat: 27.4900, lng: -99.5300 },
        { name: 'Col. Solidaridad', lat: 27.5000, lng: -99.5400 },
        { name: 'Col. Benito Juarez', lat: 27.4500, lng: -99.5200 },
        { name: 'Col. Guerrero', lat: 27.4870, lng: -99.5080 }
      ];

      realColonies.forEach((c, i) => {
        insertColony.run(c.name, 'Urbana', 40 + (i * 5), 'Direccion ' + c.name, 'Quincenal', 'Lunes-Martes', c.lat, c.lng);
      });
      insertColony.run('Pueblo Rural KM 40', 'Rural', 100, 'Carretera Nacional KM 40', 'Mensual', 'Sabado', 27.12, -99.45);

      const insertBeneficiary = db.prepare('INSERT INTO beneficiaries (name, address, folio, phone, pb, restriction_day, avg_delivery_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      
      const userList = [
        ["ESTHER NAVARRO","-","JESUS CARRANZA #2308","867-715-55-50","2","27.478495, -99.502016"],
        ["ARMANDO CONTRERAS","-","JOSEFA ORTIZ #1812 COL. PALACIOS","-","3","27.483628, -99.529717"],
        ["ANTONIO DIAZ GONZALEZ","-","AYUNTAMIENTO #30 COL. INFONAVIT","-","1","27.450250, -99.508854"],
        ["ROGELIO CASTILLO B.","-","PRIV. B1 EDIF. RIO BRAVO DEPTO 1","867 722 08 15","-","27.450591, -99.507749"],
        ["DELIA MALDONADO","-","OCAMPO 2414 COL. GUERRERO","867-304-93-56","1","27.477294, -99.506767"],
        ["IRMA GONZALEZ","-","MARCIAL CAVAZOS 422 COL. BUENA VISTA","-","2","27.496851, -99.544592"],
        ["JOSE ESCAMILLA M.","-","ENTREGA EN DOMICILIO ROXANA GARCIA","-","2","27.443888, -99.554567"],
        ["ROXANA GARCIA E.","-","COZUMEL #1034 COL. FRESNOS","-","4","27.443888, -99.554567"],
        ["OSVALDO AMENEZCUA","-","HOUSTON # 1381 COL. VILLAS DE ORADEL","867-179-59-13","2","27.470349, -99.613861"],
        ["JORGE RAUL REYES J.","BALARE-ESN0001119","F. CANTU SUR # 73 COL. INFONAVIT","-","1","27.444072, -99.515257"],
        ["RUBEN JUAREZ MACHUCA","-","AV. 20 DE NOVIEMBRE # 2908","867-188-55-65","1","27.472603, -99.498128"],
        ["JOSE MANUEL PUENTE","BALARE-ESN0001691","SANTA BRIGIDA # 711 V. SN MIGUEL","867 721 16 90","3","27.478497, -99.581225"],
        ["ITZABEL BALMILLA LARA","-","PRIVADA 11 A # 1 COL. NUEVA ERA","867 307 60 97","1","27.502804, -99.566371"],
        ["SANTA MAGDALENA C.","BALARE-ESN0002405","AV. COMONFORT 2618 COL. GUERRERO","867-213-76-41","1","27.476483, -99.511055"],
        ["JORGE CAMPOS","-","LAGUNA DEL CARMEN # 704 V. LAGO","-","-","27.447512, -99.578641"],
        ["EUGENIO ROMERO PIZARRO","-","HEROE DE NACATAZ #306 VIVEROS","-","-","27.487122, -99.491325"],
        ["MERCEDEZ LUNA ZAMORA","BALARE-ESN0001795","CALLE COAHUILA #705 RIVERAS","867 752 93 37","1","27.493215, -99.497120"],
        ["CONCEPCION PUENTES L.","-","SAN BRUNO #3734 FRACC. SAN AGUSTIN","867 330 18 21","1","27.442880, -99.584120"],
        ["AMALIA LOPEZ MADRID","-","SAN BRUNO #3734 FRACC. SAN AGUSTIN","-","1","27.442880, -99.584120"],
        ["SABINO HERNANDEZ L.","BALARE-ESN0001646","AYUTLA # 119 COL. BENITO JUAREZ","867 717 41 57","2","27.464531, -99.531204"],
        ["MARIA LUISA LIÑAN S.","BALARE-ESN0001078","COMANCHES #21 RES. VIVEROS","867 719 36 28","2","27.484210, -99.489150"],
        ["GLORIA MARGARITA LOPEZ","-","JUAN ALVAREZ #5413 COL. MIRADOR","867 267 21 22","2","27.484912, -99.544830"],
        ["MARIA DEL SOCORRO C.","BALARE-ESN0001649","GUATEMALA # 2022","867 100 41 14","3","27.478950, -99.517840"],
        ["ERNESTO RODRIGUEZ M.","BALARE-ESN0001991","PRIVADA MINA # 727","8672475268","1","27.488310, -99.499140"],
        ["MARIA IRMA ORNELAS","BALARE-ESN0002035","LOS COMANCHES # 14","867 714 00 39","1","27.484050, -99.488890"],
        ["JULIA ESMERALDA ROMERO","BALARE-ESN0002070","MADERO # 407 COL. VIVEROS","-","5","27.489214, -99.493120"],
        ["RAMON VAZQUEZ AREVALO","BALARE-ESN0001236","ARTICULO 22 # 1014 TOBOGANES","8671192585","2","27.513512, -99.599230"],
        ["LUCILA QUINTERO ORTIZ","BALARE-ESN0002142","ARTEAGA # 702 COL. VIVEROS","867 142 28 25","2","27.489950, -99.495210"],
        ["RENE CISNEROS VELA","-","ROBLES #208 VALLES DEL PARAISO","-","2","27.442110, -99.526540"],
        ["JAVIER CORTEZ CASTILLO","BALARE-ESN0001079","JESUS CARRANZA #2712","NO TIENE","1","27.475120, -99.502840"],
        ["LEOBARDO HUERTA H.","BALARE-ESN0002306","GALAPAGOS # 633 LOS FRESNOS","-","2","27.441530, -99.558120"],
        ["HERCULANO ALBERTO V.","BALARE-ESN0001670","CALLE 22 # 311 VALLES ANAHUAC","-","3","27.531210, -99.610540"],
        ["FRANCISCO SANCHEZ","BALARE-ESN0002426","MINA # 1715","867 246 09 54","1","27.487840, -99.510230"],
        ["MARIA GUADALUPE R.","-","PINOS # 111 COL. VALLE DEL PARAISO","867 168 93 04","1","27.442560, -99.527120"],
        ["CYNTHIA PATRICIA M.","BALARE-ESN0002477","JOSE DE ESCANDON # 2510","867 196 90 76","2","27.472130, -99.510520"],
        ["PABLO VAZQUEZ URIBE","BALARE-ESN0002014","MEDELLIN # 8513 COL. LA SANDIA","-","4","27.430120, -99.539840"],
        ["MARIA MAGDALENA PEREZ","BALARE-ESN0002485","JOSE DE ESCANDON # 2610","867 463 90 81","1","27.472150, -99.511840"],
        ["ENRIQUE SALVADOR DIAZ","BALARE-ESN0002299","RIO SAN FRANCISCO # 1303","-","1","27.510820, -99.563120"]
      ];

      userList.forEach((row) => {
        const [name, folio, address, phone, pb, coords] = row;
        const [latStr, lngStr] = coords.split(',').map(c => c.trim());
        
        insertBeneficiary.run(
          name,
          address,
          folio === '-' ? '' : folio,
          phone === '-' ? '' : phone,
          pb === '-' ? '' : pb,
          'Ninguna',
          15,
          parseFloat(latStr),
          parseFloat(lngStr)
        );
      });

      const insertInst = db.prepare('INSERT INTO institutions (name, address, fixed_day, estimated_kg, delivery_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insertInst.run('Asilo Santa Anita', 'Calle Iturbide', 'Miercoles', 200, 30, 27.4952, -99.5101);
      insertInst.run('Comedor Bethesda', 'Sector Poniente', 'Viernes', 150, 45, 27.4800, -99.5580);

      const insertSuper = db.prepare('INSERT INTO supermarkets (name, address, collection_days, avg_volume, loading_time, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insertSuper.run('HEB Av. Reforma', 'Av. Reforma #4400', 'Lunes-Sabado', 300, 40, 27.4647, -99.5229);
      insertSuper.run('Soriana Reforma', 'Blvd. Reforma', 'Lunes-Sabado', 250, 30, 27.4570, -99.5135);

      // Inyectar configuracion de CEDIS
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cedis_address', 'C. Iturbide 1407, San José, 88230 Nuevo Laredo, Tamps.')
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cedis_coords', '27.477850806886945, -99.49498391012905')
    })

    transaction()
    return { success: true }
  })

  ipcMain.handle('planning:save-monthly-plan', async (_, { plan, startDate, endDate }: { plan: any[], startDate: string, endDate: string }) => {
    const db = initDB()
    const insertRoute = db.prepare(
      'INSERT INTO routes (date, truck_id, driver_id, type, status) VALUES (?, ?, ?, ?, ?)'
    )
    const insertStop = db.prepare(
      'INSERT INTO route_stops (route_id, stop_type, stop_id, sequence_order) VALUES (?, ?, ?, ?)'
    )

    console.log('--- planning:save-monthly-plan ---');
    console.log('StartDate:', startDate, 'EndDate:', endDate);
    console.log('Days in plan:', plan?.length);

    const transaction = db.transaction((dailyRosters: any[]) => {
      if (startDate && endDate) {
        console.log('Cleaning existing routes...');
        db.prepare(`
          DELETE FROM route_stops 
          WHERE route_id IN (SELECT id FROM routes WHERE date BETWEEN ? AND ?)
        `).run(startDate, endDate)
        db.prepare('DELETE FROM routes WHERE date BETWEEN ? AND ?').run(startDate, endDate)
      }

      console.log('Inserting new daily rosters...');
      for (const daily of dailyRosters) {
        if (daily.truckA.stops.length > 0) {
          const infoA = insertRoute.run(daily.date, daily.truckA.truckId, daily.truckA.driverId, 'Entrega', 'Pendiente')
          daily.truckA.stops.forEach((stop: any, idx: number) => {
            let dbType = 'Colonia'
            if (stop.type === 'supermarket') dbType = 'Supermercado'
            else if (stop.type === 'institution') dbType = 'Institución'
            else if (stop.type === 'beneficiary') dbType = 'Beneficiario'
            insertStop.run(infoA.lastInsertRowid, dbType, stop.id, idx + 1)
          })
        }
        if (daily.truckB.stops.length > 0) {
          const infoB = insertRoute.run(daily.date, daily.truckB.truckId, daily.truckB.driverId, 'Entrega', 'Pendiente')
          daily.truckB.stops.forEach((stop: any, idx: number) => {
            let dbType = 'Colonia'
            if (stop.type === 'supermarket') dbType = 'Supermercado'
            else if (stop.type === 'institution') dbType = 'Institución'
            else if (stop.type === 'beneficiary') dbType = 'Beneficiario'
            insertStop.run(infoB.lastInsertRowid, dbType, stop.id, idx + 1)
          })
        }
      }
    })

    try {
      transaction(plan)
      console.log('Plan saved successfully');
      return { success: true }
    } catch (error) {
      console.error('Error saving plan:', error);
      throw error;
    }
  })

  ipcMain.handle('planning:get-routes', async (_, date: string) => {
    const db = initDB()
    const routes = db
      .prepare(
        'SELECT r.*, t.name as truck_name, d.name as driver_name FROM routes r LEFT JOIN trucks t ON r.truck_id = t.id LEFT JOIN drivers d ON r.driver_id = d.id WHERE r.date = ? ORDER BY r.id DESC'
      )
      .all(date)

    for (const route of routes as any[]) {
      const rawStops = db
        .prepare('SELECT * FROM route_stops WHERE route_id = ? ORDER BY sequence_order')
        .all(route.id)
      
      const detailedStops: any[] = []
      for (const stop of rawStops as any[]) {
        let details: any = null
        if (stop.stop_type === 'Colonia') {
          details = db.prepare('SELECT * FROM colonies WHERE id = ?').get(stop.stop_id) || {}
          if (details.pantry_count !== undefined) details.volume = details.pantry_count
        } else if (stop.stop_type === 'Institución') {
          details = db.prepare('SELECT * FROM institutions WHERE id = ?').get(stop.stop_id) || {}
          if (details.estimated_kg !== undefined) details.volume = details.estimated_kg
        } else if (stop.stop_type === 'Supermercado') {
          details = db.prepare('SELECT * FROM supermarkets WHERE id = ?').get(stop.stop_id) || {}
          if (details.avg_volume !== undefined) details.volume = details.avg_volume
        } else if (stop.stop_type === 'Beneficiario') {
          details = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(stop.stop_id) || {}
        }

        detailedStops.push({
          ...stop,
          stop_name: details ? details.name : `Desconocido (${stop.stop_id})`,
          recovery_fee: details?.recovery_fee || 0,
          is_foreign: details?.is_foreign || 0,
          volume: details?.volume || 0,
          lat: details?.lat || 0,
          lng: details?.lng || 0
        })
      }
      route.stops = detailedStops
    }
    return routes
  })

  ipcMain.handle('planning:get-month-summary', async (_, { year, month }) => {
    try {
      const db = initDB()
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      console.log(`Fetching summary for ${startDate} to ${endDate}`)
      
      const summary = db.prepare(`
        SELECT 
          r.date,
          COUNT(DISTINCT r.id) as routes_count,
          COALESCE(SUM(col.recovery_fee), 0) as total_recovery,
          COALESCE(SUM(
            CASE 
              WHEN rs.stop_type = 'Colonia' THEN COALESCE(col.pantry_count, 10)
              WHEN rs.stop_type = 'Institución' THEN COALESCE(inst.estimated_kg, 100)
              WHEN rs.stop_type = 'Supermercado' THEN COALESCE(sup.avg_volume, 50)
              WHEN rs.stop_type = 'Beneficiario' THEN 1
              ELSE 0 
            END
          ), 0) as total_volume
        FROM routes r
        LEFT JOIN route_stops rs ON r.id = rs.route_id
        LEFT JOIN colonies col ON rs.stop_type = 'Colonia' AND rs.stop_id = col.id
        LEFT JOIN institutions inst ON rs.stop_type = 'Institución' AND rs.stop_id = inst.id
        LEFT JOIN supermarkets sup ON rs.stop_type = 'Supermercado' AND rs.stop_id = sup.id
        WHERE r.date BETWEEN ? AND ?
        GROUP BY r.date
      `).all(startDate, endDate)
      
      console.log('Summary result count:', summary.length)
      return summary
    } catch (err) {
      console.error('CRITICAL ERROR in get-month-summary:', err)
      return []
    }
  })

  ipcMain.handle('planning:get-month-plan', async (_, { year, month }) => {
    const db = initDB()
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const routes = db.prepare(`
      SELECT r.*, t.name as truck_name, d.name as driver_name 
      FROM routes r 
      LEFT JOIN trucks t ON r.truck_id = t.id 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      WHERE r.date BETWEEN ? AND ?
    `).all(startDate, endDate) as any[]

    const rosters: any[] = []
    
    // Crear un mapa de dias en el mes
    const numDays = lastDay
    for (let i = 1; i <= numDays; i++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      rosters.push({
        date,
        truckA: { stops: [] },
        truckB: { stops: [] }
      })
    }

    for (const route of routes) {
      const dayIdx = parseInt(route.date.split('-')[2]) - 1
      if (dayIdx < 0 || dayIdx >= rosters.length) continue;

      const stops = db.prepare('SELECT * FROM route_stops WHERE route_id = ? ORDER BY sequence_order').all(route.id) as any[]
      const detailedStops: any[] = []
      
      for (const stop of stops) {
        let details: any = null
        if (stop.stop_type === 'Colonia') {
          details = db.prepare('SELECT * FROM colonies WHERE id = ?').get(stop.stop_id)
        } else if (stop.stop_type === 'Institución') {
          details = db.prepare('SELECT * FROM institutions WHERE id = ?').get(stop.stop_id)
        } else if (stop.stop_type === 'Supermercado') {
          details = db.prepare('SELECT * FROM supermarkets WHERE id = ?').get(stop.stop_id)
        } else if (stop.stop_type === 'Beneficiario') {
          details = db.prepare('SELECT * FROM beneficiaries WHERE id = ?').get(stop.stop_id)
        }

        detailedStops.push({
          id: stop.stop_id,
          name: details ? details.name : `Punto ${stop.stop_id}`,
          type: stop.stop_type.toLowerCase() === 'supermercado' ? 'supermarket' : 
                stop.stop_type.toLowerCase() === 'institución' ? 'institution' :
                stop.stop_type.toLowerCase() === 'beneficiario' ? 'beneficiary' : 'colony',
          lat: details?.lat || 0,
          lng: details?.lng || 0
        })
      }

      // Asignar al camion A o camion B segun capacidad o el orden actual
      // Esto es una reconstruccion, se llenan conforme llegan
      if (rosters[dayIdx].truckA.stops.length === 0) {
        rosters[dayIdx].truckA = { 
          stops: detailedStops, 
          truckId: route.truck_id, 
          driverId: route.driver_id,
          truckName: route.truck_name,
          driverName: route.driver_name
        }
      } else {
        rosters[dayIdx].truckB = { 
          stops: detailedStops, 
          truckId: route.truck_id, 
          driverId: route.driver_id,
          truckName: route.truck_name,
          driverName: route.driver_name
        }
      }
    }

    return { 
      days: rosters,
      monthName: new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' })
    }
  })

  ipcMain.handle('planning:get-available-months', async () => {
    const db = initDB()
    return db.prepare(`
      SELECT DISTINCT 
        strftime('%Y-%m', date) as monthId,
        strftime('%Y', date) as year,
        strftime('%m', date) as month
      FROM routes 
      ORDER BY date DESC
    `).all()
  })

  ipcMain.handle('planning:getRecentActivities', async () => {
    const db = initDB()
    try {
      const latestRoutes = db.prepare("SELECT ('Ruta programada para ' || date) as text, 'Hace poco' as time, 'CheckCircle2' as icon FROM routes ORDER BY id DESC LIMIT 5").all()
      const latestColonies = db.prepare("SELECT ('Nueva colonia: ' || name) as text, 'Reciente' as time, 'MapPin' as icon FROM colonies ORDER BY id DESC LIMIT 2").all()
      const latestTrucks = db.prepare("SELECT ('Unidad registrada: ' || name) as text, 'Reciente' as time, 'Truck' as icon FROM trucks ORDER BY id DESC LIMIT 2").all()
      
      const activities = [...latestRoutes, ...latestColonies, ...latestTrucks]
      return activities.length > 0 ? activities : [
        { text: 'Sistema iniciado', time: 'Ahora', icon: 'Settings' }
      ]
    } catch (e) {
      return [{ text: 'Inicia tu primera actividad', time: '-', icon: 'Clock' }]
    }
  })

}
