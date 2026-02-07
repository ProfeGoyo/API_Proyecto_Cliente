const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors()); 
app.use(express.json());

// 1. PRIMERO: Configuramos la conexión
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// 2. SEGUNDO: Función para crear la tabla
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alumnos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100),
        edad INT,
        curso VARCHAR(50)
      );
    `);
    console.log("Tabla 'alumnos' verificada/creada.");
  } catch (err) {
    console.error("Error al crear la tabla:", err);
  }
};

// 3. TERCERO: Función de conexión con reintento (usando 'pool' ya definido)
const connectWithRetry = () => {
  console.log('Intentando conectar a la base de datos...');
  pool.query('SELECT 1')
    .then(() => {
      console.log('¡Conectado a PostgreSQL con éxito!');
      initDb(); // Una vez conectado, creamos la tabla
    })
    .catch(err => {
      console.error('La DB no está lista, reintentando en 5 segundos...');
      setTimeout(connectWithRetry, 5000); // Reintento
    });
};

// Arrancamos el proceso de conexión
connectWithRetry();

// --- RUTAS API REST ---

app.get('/alumnos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM alumnos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error al obtener alumnos");
  }
});

app.post('/alumnos', async (req, res) => {
  try {
    const { nombre, edad, curso } = req.body;
    const result = await pool.query(
      'INSERT INTO alumnos (nombre, edad, curso) VALUES ($1, $2, $3) RETURNING *',
      [nombre, edad, curso]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).send("Error al insertar alumno");
  }
});

app.put('/alumnos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, edad, curso } = req.body;
    await pool.query(
      'UPDATE alumnos SET nombre=$1, edad=$2, curso=$3 WHERE id=$4',
      [nombre, edad, curso, id]
    );
    res.send("Alumno actualizado");
  } catch (err) {
    res.status(500).send("Error al actualizar alumno");
  }
});

app.delete('/alumnos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM alumnos WHERE id = $1', [req.params.id]);
    res.send("Alumno eliminado");
  } catch (err) {
    res.status(500).send("Error al eliminar alumno");
  }
});

app.listen(3000, () => {
  console.log('Servidor API escuchando en el puerto 3000');
});