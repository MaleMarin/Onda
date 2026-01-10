"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Endpoint principal
app.post('/onda', async (req, res) => {
    const body = req.body;
    if (!body.message) {
        return res.status(400).json({ error: 'message es obligatorio' });
    }
    const eje = body.eje ?? 'general';
    const replyText = `👋 Soy Onda (${eje}). Recibí tu mensaje: “${body.message}”. ` +
        `Por ahora esta es una respuesta de prueba desde el backend.`;
    return res.json({
        replyText,
        meta: {
            eje,
            canal: body.canal ?? 'desconocido',
            userId: body.userId ?? null
        }
    });
});
// Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Onda backend escuchando en http://localhost:${PORT}`);
});
