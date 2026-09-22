"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function testMeta() {
    const token = process.env.META_ACCESS_TOKEN?.trim();
    const phoneId = process.env.META_PHONE_NUMBER_ID?.trim();
    console.log('Phone ID:', phoneId);
    console.log('Token starts with:', token?.slice(0, 15));
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '21658477271',
            type: 'text',
            text: { body: '🟢 Test de connexion Meta WhatsApp : Le nouveau Token est actif et opérationnel !' }
        })
    });
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
}
testMeta();
//# sourceMappingURL=test-token.js.map