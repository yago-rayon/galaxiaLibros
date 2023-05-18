// Importar token JWT
const jwt = require('jsonwebtoken');

// Middleware para validar JWT (rutas protegidas)
const verificarToken = (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado' })
    }
    try {
        const verificar = jwt.verify(token, process.env.TOKEN_SECRET);
        req.usuario = verificar;
        next(); // continuamos
    } catch (error) {
        res.status(400).json({ error: error, mensaje: 'Token no válido' });
    }
}

module.exports = verificarToken;