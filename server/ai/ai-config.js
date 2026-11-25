const integer=(name,fallback,min,max)=>Math.min(max,Math.max(min,Number.parseInt(process.env[name]||'',10)||fallback));
export function getAIConfig(){return {
 apiKey:process.env.OPENAI_API_KEY||'',model:process.env.OPENAI_MODEL||'gpt-5.4-mini',
 maxOutputTokens:integer('OPENAI_MAX_OUTPUT_TOKENS',1500,128,8000),chunks:integer('AI_RETRIEVAL_CHUNKS',6,1,8),
 maxContextChars:integer('AI_MAX_CONTEXT_CHARS',24000,4000,50000),maxQuestion:integer('AI_MAX_QUESTION_CHARS',2000,100,4000),
 rpm:integer('AI_REQUESTS_PER_MINUTE',12,1,60),concurrent:integer('AI_MAX_CONCURRENT',3,1,20),
 dailyRequests:integer('AI_MAX_DAILY_REQUESTS',500,1,5000),dailyTokens:integer('AI_DAILY_TOKEN_BUDGET',1000000,10000,10000000),
 timeout:integer('AI_TIMEOUT_MS',90000,5000,180000),ttl:integer('AI_SESSION_TTL_MS',1800000,60000,3600000),
 historyTurns:integer('AI_HISTORY_TURNS',4,0,8),maxSessions:integer('AI_MAX_SESSIONS',500,1,2000),
 projectId:process.env.FIREBASE_PROJECT_ID||'fleet-gravity-c5fd2',domains:(process.env.AI_ALLOWED_EMAIL_DOMAINS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
};}
