const mongoose = require('mongoose');
const { AIService } = require('./modules/ai/ai.service');
const { OpenAICompatibleProvider } = require('./modules/ai/providers/openai-compatible.provider');
require('dotenv').config({path: '../.env'});

mongoose.connect('mongodb://localhost:27017/medical-ai').then(async () => {
  const db = mongoose.connection.db;
  const conv = await db.collection('conversations').find({}).sort({ updatedAt: -1 }).limit(1).toArray();
  const c = conv[0];
  
  const aiService = new AIService(new OpenAICompatibleProvider());
  console.log('Running getSuggestion for conversation', c._id);
  const result = await aiService.getSuggestion(c.tenantId.toString(), c._id.toString());
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(0);
}).catch(console.error);
