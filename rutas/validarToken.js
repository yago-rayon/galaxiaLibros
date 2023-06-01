// Importar token JWT
const jwt = require('jsonwebtoken');

// Middleware para validar JWT (rutas protegidas)
const validarToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado' })
    }
    try {
        const validar = jwt.verify(token, process.env.TOKEN_SECRET);
        req.usuario = validar;
        next(); // continuamos
    } catch (error) {
        res.status(400).json({ error: error, mensaje: 'Token no válido' });
    }
}

module.exports = validarToken;