const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5002",
    "http://localhost:5003",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://nexonda-281084.web.app",
    "https://nexonda-281084.firebaseapp.com",
    "https://jleandro1984.github.io",
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});
const fetch = require("node-fetch"); // Caso queira usar futuramente
const {OAuth2Client} = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore(); 
const GEMINI_API_KEY = "AIzaSyCr2ZNU8qertO4ivtCdul4K7UvFfQJkuQA";

// Função HTTP exposta para o frontend
exports.askGemini = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Método não permitido");
    }

    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({error: "Prompt é obrigatório."});
    }

    console.log("Recebido prompt:", prompt);

    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          contents: [
            {
              parts: [{text: prompt}],
            },
          ],
        }),
      });

      const result = await geminiResponse.json();
      console.log("Resposta completa do Gemini API:", JSON.stringify(result, null, 2));

      if (!geminiResponse.ok) {
        console.error("Erro na API do Gemini:", result);
        return res.status(500).json({
          error: "Erro na API do Gemini",
          details: result.error || result,
        });
      }

      const reply = (
        result &&
        result.candidates &&
        result.candidates[0] &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts[0] &&
        result.candidates[0].content.parts[0].text
      ) ? result.candidates[0].content.parts[0].text : undefined;

      if (!reply || reply.trim() === "") {
        console.error("Resposta vazia do Gemini:", result);
        return res.status(500).json({
          error: "Resposta vazia do Gemini",
          details: result,
        });
      }

      console.log("Resposta processada:", reply);
      return res.status(200).json({reply});
    } catch (error) {
      console.error("Erro ao chamar Gemini:", error);
      return res.status(500).json({
        error: "Erro interno ao chamar o Gemini.",
        details: error.message,
      });
    }
  });
});

// Lazy initialization for OAuth2Client
let authClient;
const getAuthClient = () => {
  if (!authClient) {
    authClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return authClient;
};

// Função para validar o token do Google
async function validateGoogleToken(token) {
  try {
    const client = getAuthClient();
    // Verifica se é um token do Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("Token validado:", {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });

    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error("Erro ao validar token:", error);
    throw new Error("Token inválido");
  }
}

// Middleware para verificar autenticação
async function checkAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Token não fornecido");
    }

    const token = authHeader.split("Bearer ")[1];
    const userData = await validateGoogleToken(token);

    // Verifica se o usuário está autorizado
    const userDoc = await db.collection("authorizedUsers")
        .where("email", "==", userData.email)
        .get();

    if (userDoc.empty) {
      throw new Error("Usuário não autorizado");
    }

    // Adiciona os dados do usuário ao request
    req.user = userData;
    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    res.status(401).json({error: error.message});
  }
}

// Middleware CORS
const handleCors = (handler) => (req, res) => {
  return cors(req, res, () => handler(req, res));
};

// Middleware de autenticação real
const authenticateMiddleware = (handler) => async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("=== DEBUG AUTHENTICATE ===");
    console.log("Auth header recebido:", authHeader ? "Presente" : "Ausente");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Header de autorização inválido");
      return res.status(401).json({error: "Não autorizado"});
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("Token recebido:", token.substring(0, 20) + "...");

    try {
      const client = getAuthClient();
      // Verifica o token usando o OAuth2Client
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log("Token verificado com sucesso:", {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });

      // Verifica se o email está autorizado
      const authorizedUsersCollection = admin.firestore().collection("authorizedUsers");
      const userDoc = await authorizedUsersCollection
          .where("email", "==", payload.email)
          .get();

      console.log("Verificação de autorização:", {
        email: payload.email,
        encontrado: !userDoc.empty,
        total: userDoc.size,
      });

      if (userDoc.empty) {
        console.log("Usuário não autorizado:", payload.email);
        return res.status(401).json({error: "Usuário não autorizado"});
      }

      // Adiciona os dados do usuário ao request
      req.user = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isAdmin: userDoc.docs[0].data().isAdmin || false,
      };
      req.userId = payload.email; // Usando o email como ID do usuário

      console.log("=== FIM DEBUG AUTHENTICATE ===");
      return handler(req, res);
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return res.status(401).json({error: "Token inválido"});
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(401).json({error: "Erro na autenticação"});
  }
};

// Helper para contexto comum
const getContext = (req) => {
  console.log("=== DEBUG GETCONTEXT ===");
  //const db = admin.firestore();
  console.log("Firestore inicializado:", db ? "Sim" : "Não");

  const userId = req.userId || (req.user && req.user.email);
  console.log("UserId obtido:", userId);

  if (!userId) {
    console.error("Usuário não identificado no contexto");
    throw new Error("Usuário não autenticado");
  }

  console.log("=== FIM DEBUG GETCONTEXT ===");
  return {
    db,
    userId,
  };
};


// Inicio - Função para gerar Firebase Custom Token para usar no Storge
async function generateFirebaseCustomToken(uid) {
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    return customToken;
  } catch (error) {
    console.error("Erro criando custom token Firebase:", error);
    throw error;
  }
}

// Nova função HTTP para login com token Google e gerar Custom Token Firebase
exports.firebaseCustomToken = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  const idToken = req.body.idToken;
  if (!idToken) {
    return res.status(400).json({error: "idToken é obrigatório no body"});
  }

  try {
    // Verifica e decodifica o token Google
    const client = getAuthClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Verifica se usuário está autorizado no Firestore (sua coleção authorizedUsers)
    const authorizedUsersCollection = admin.firestore().collection("authorizedUsers");
    const userDoc = await authorizedUsersCollection.where("email", "==", payload.email).get();

    if (userDoc.empty) {
      return res.status(401).json({error: "Usuário não autorizado"});
    }

    // Usa o email como UID Firebase para simplificar (ou outro identificador único seu)
    const uid = payload.email;

    // Cria Custom Token Firebase
    const customToken = await generateFirebaseCustomToken(uid);

    return res.status(200).json({customToken});
  } catch (error) {
    console.error("Erro no endpoint firebaseCustomToken:", error);
    return res.status(401).json({error: "Token inválido ou erro interno"});
  }
}));
// Fim function


// --- API para obter total de visitantes da galeria ---
exports.getGalleryStats = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  //const db = admin.firestore();

  try {
    if (req.method === "GET") {
      // Buscar total de visitas únicas
      const insightsSnapshot = await db.collection("insights")
          .where("type", "==", "visit")
          .get();

      const totalVisitors = insightsSnapshot.size;

      // Buscar total de cliques/interações
      const clicksSnapshot = await db.collection("insights")
          .where("type", "==", "click")
          .get();

      const totalClicks = clicksSnapshot.size;

      return res.status(200).json({
        totalVisitors,
        totalClicks,
      });
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro ao buscar estatísticas da galeria:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
}));


// --- API pública para logos ---
exports.publicLogos = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  //const db = admin.firestore();
  const logosCollection = db.collection("logos");
  const insightsCollection = db.collection("insights");

  try {
    if (req.method === "GET") {
      const querySnapshot = await logosCollection.get();

      // Filtra apenas logos com contrato ativo
      const ativos = querySnapshot.docs.filter((doc) => {
        const data = doc.data();
        const endDate = new Date(data.endDate);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        return (
          data.contractActive === true &&
          !isNaN(endDate.getTime()) &&
          endDate >= today
        );
      });

      // Buscar cliques/interações para cada logo
      const clicksSnapshot = await insightsCollection
          .where("type", "==", "click")
          .get();

      // Criar mapa de cliques por clientFantasyName
      const clicksMap = new Map();
      clicksSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.clientFantasyName) {
          clicksMap.set(data.clientFantasyName, (clicksMap.get(data.clientFantasyName) || 0) + 1);
        }
      });

      const logos = ativos.map((doc) => {
        const data = doc.data();
        const showAddress = data.showAddressActive === true;
        const clientFantasyName = data.clientFantasyName || "";
        const clicks = clicksMap.get(clientFantasyName) || 0;

        return {
          id: doc.id,
          category: data.category || data.logoCategory || "",
          description: data.description || data.logoDescription || "",
          imageUrl: data.imageUrl || data.logoImageUrl || data.imagem || "",
          clientName: data.clientName || "",
          clientFantasyName: clientFantasyName,
          showAddress: showAddress,
          clientAddress: showAddress ? data.clientAddress || "" : "",
          clientNumber: showAddress ? data.clientNumber || "" : "",
          clientNeighborhood: showAddress ? data.clientNeighborhood || "" : "",
          clientCity: showAddress ? data.clientCity || "" : "",
          clientUf: showAddress ? data.clientUf || "" : "",
          clientCep: showAddress ? data.clientCep || "" : "",

          telephone: data.telephone || "",
          cellphone: data.cellphone || "",
          clientWhatsapp: data.clientWhatsapp || "",

          clientInstagramUrl: data.clientInstagramUrl || "",
          clientFacebookUrl: data.clientFacebookUrl || "",
          clientWebsite: data.clientWebsite || "",
          videoUrl: data.clientVideoUrl || data.videoUrl || "",

          clientLat: showAddress ? data.clientLat || "" : "",
          clientLng: showAddress ? data.clientLng || "" : "",

          openingHours: data.openingHours || null,

          planType: data.planType || "",
          createdAt: (data.createdAt && typeof data.createdAt.toDate === "function") ? data.createdAt.toDate() : null,
          clicks: clicks,
        };
      });

      return res.status(200).json(logos);
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro na API pública:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
}));

// --- API principal (logos) ---
exports.api = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(authenticateMiddleware(async (req, res) => {
  console.log("=== DEBUG API ===");
  console.log("Método da requisição:", req.method);
  console.log("Path da requisição:", req.path);

  // Configurar CORS headers explicitamente
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    console.log("Requisição OPTIONS, retornando 204");
    return res.status(204).send("");
  }

  const {db, userId} = getContext(req);
  console.log("Contexto obtido:", {userId});

  const logosCollection = db.collection("logos");
  console.log("Coleção logos referenciada");

  try {
    if (req.method === "GET") {
      console.log("Buscando logos para userId:", userId);

      // Primeiro, vamos listar todos os documentos para debug
      const allDocs = await logosCollection.get();
      console.log("Total de documentos na coleção:", allDocs.size);

      // Listar todos os documentos para debug
      allDocs.forEach((doc) => {
        const data = doc.data();
        console.log("Documento encontrado:", {
          id: doc.id,
          userId: data.userId,
          clientName: data.clientName,
          clientCNPJ: data.clientCNPJ,
        });
      });

      // Buscar documentos com o ID antigo
      const oldUserIdQuery = await logosCollection
          .where("userId", "==", "V2XEPB4jBMfC3HH2iyTZo7rg9Vb2")
          .get();

      console.log("Documentos encontrados com ID antigo:", oldUserIdQuery.size);

      // Atualizar documentos com o novo ID
      const updatePromises = oldUserIdQuery.docs.map((doc) => {
        console.log("Atualizando documento:", doc.id);
        return logosCollection.doc(doc.id).update({
          userId: userId,
        });
      });

      if (updatePromises.length > 0) {
        console.log("Atualizando documentos para novo userId");
        await Promise.all(updatePromises);
      }

      // Agora fazemos a consulta com o novo ID
      console.log("Fazendo consulta com novo userId:", userId);
      const querySnapshot = await logosCollection
          .where("userId", "==", userId)
          .get();

      console.log("Documentos encontrados para o usuário:", querySnapshot.size);

      const logos = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Processando documento:", {
          id: doc.id,
          userId: data.userId,
          clientName: data.clientName,
        });
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt && typeof data.createdAt.toDate === "function") ? data.createdAt.toDate() : null,
        };
      });

      console.log("Logos processados:", logos.length);
      console.log("=== FIM DEBUG API ===");
      return res.status(200).json(logos);
    }

    if (req.method === "POST") {
      const data = req.body;
      data.clientCNPJ = data.clientCNPJ ? data.clientCNPJ.trim() : data.clientCNPJ;
      data.clientName = data.clientName ? data.clientName.trim() : data.clientName;

      if (!data.clientCNPJ || !data.clientName || !data.imageUrl) {
        return res.status(400).json({error: "Campos obrigatórios faltando"});
      }

      data.userId = userId;
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();

      console.log("Dados para criação:", {
        userId: data.userId,
        clientCNPJ: data.clientCNPJ,
        clientName: data.clientName,
      });

      const cnpjExists = await logosCollection
          .where("userId", "==", userId)
          .where("clientCNPJ", "==", data.clientCNPJ)
          .get();

      if (!cnpjExists.empty) {
        return res.status(400).json({error: "CNPJ já cadastrado"});
      }

      const docRef = await logosCollection.add(data);
      console.log("Documento criado:", {
        id: docRef.id,
        userId: data.userId,
        clientCNPJ: data.clientCNPJ,
      });
      return res.status(201).json({id: docRef.id, message: "Logotipo criado com sucesso"});
    }

    if (req.method === "PUT") {
      const {id, ...data} = req.body;
      if (!id) {
        return res.status(400).json({error: "ID do logotipo não fornecido"});
      }

      const doc = await logosCollection.doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({error: "Logotipo não encontrado"});
      }

      await logosCollection.doc(id).update(data);
      return res.status(200).json({message: "Logotipo atualizado com sucesso"});
    }

    if (req.method === "DELETE") {
      const pathParts = req.path.split("/").filter(Boolean); // remove strings vazias
      const id = pathParts[pathParts.length - 1]; // último segmento da URL
      console.log("ID extraído da URL:", id);

      if (!id) {
        return res.status(400).json({error: "ID do logotipo não fornecido"});
      }

      const doc = await logosCollection.doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({error: "Logotipo não encontrado"});
      }

      await logosCollection.doc(id).delete();
      return res.status(200).json({message: "Logotipo deletado com sucesso"});
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro na API:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
})));

// --- Health check ---
exports.health = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// --- API contacts ---
exports.contacts = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(authenticateMiddleware(async (req, res) => {
  const {db, userId} = getContext(req);
  const contactsCollection = db.collection("contacts");

  try {
    if (req.method === "GET") {
      const snapshot = await contactsCollection.where("userId", "==", userId).get();
      const contacts = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      return res.status(200).json(contacts);
    }

    if (req.method === "POST") {
      const data = req.body;
      data.name = data.name ? data.name.trim() : data.name;
      data.email = data.email ? data.email.trim() : data.email;

      if (!data.name || !data.email) {
        return res.status(400).json({error: "Nome e email são obrigatórios"});
      }

      data.userId = userId;
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();

      const docRef = await contactsCollection.add(data);
      return res.status(201).json({id: docRef.id, message: "Contato criado com sucesso"});
    }

    if (req.method === "DELETE") {
      const {id} = req.body;
      if (!id) {
        return res.status(400).json({error: "ID do contato não fornecido"});
      }

      const doc = await contactsCollection.doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({error: "Contato não encontrado"});
      }

      await contactsCollection.doc(id).delete();
      return res.status(200).json({message: "Contato deletado com sucesso"});
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro em /contacts:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
})));

// --- API premiumAds ---
exports.premiumAds = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(authenticateMiddleware(async (req, res) => {
  const {db, userId} = getContext(req);
  console.log("=== DEBUG PREMIUM ADS ===");
  console.log("Contexto obtido para premiumAds:", {userId});

  const premiumAdsCollection = db.collection("premiumAds");
  console.log("Coleção premiumAds referenciada");

  try {
    if (req.method === "GET") {
      console.log("Buscando todas as propagandas...");

      // Buscar todos os documentos sem filtro
      const querySnapshot = await premiumAdsCollection.get();
      console.log("Total de documentos encontrados:", querySnapshot.size);

      const ads = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Processando documento:", {
          id: doc.id,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
        });

        // Função auxiliar para converter datas
        const convertDate = (date) => {
          if (!date) return null;
          if (typeof date === "string") return date;
          if (date instanceof Date) return date.toISOString();
          if (date && typeof date.toDate === "function") return date.toDate().toISOString();
          return date;
        };

        // Converter datas para ISO string
        const processedData = {
          id: doc.id,
          ...data,
          createdAt: convertDate(data.createdAt),
          startDate: convertDate(data.startDate),
          endDate: convertDate(data.endDate),
        };

        console.log("Dados processados:", processedData);
        return processedData;
      });

      console.log("Propagandas processadas:", ads.length);
      console.log("=== FIM DEBUG PREMIUM ADS ===");
      return res.status(200).json(ads);
    }

    if (req.method === "POST") {
      const data = req.body;
      console.log("Dados recebidos para criação:", data);

      // Validação dos campos obrigatórios
      const requiredFields = ["title", "description", "mediaType", "targetUrl", "clientCNPJ", "startDate", "endDate"];
      for (const field of requiredFields) {
        if (!data[field]) {
          console.log(`Campo obrigatório faltando: ${field}`);
          return res.status(400).json({error: `Campo ${field} é obrigatório`});
        }
      }

      // Validação das datas
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate > endDate) {
        return res.status(400).json({error: "Data de início não pode ser posterior à data de término"});
      }
      if (endDate < today) {
        return res.status(400).json({error: "Data de término não pode ser anterior à data atual"});
      }

      // Preparar dados para salvar
      const adData = {
        userId,
        isActive: true,
        clicks: 0,
        impressions: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startDate: admin.firestore.Timestamp.fromDate(startDate),
        endDate: admin.firestore.Timestamp.fromDate(endDate),
        ...data,
      };


      console.log("Dados para criação:", adData);

      const docRef = await premiumAdsCollection.add(adData);
      console.log("Documento criado:", {
        id: docRef.id,
        userId: adData.userId,
        title: adData.title,
      });
      return res.status(201).json({id: docRef.id, message: "Propaganda criada com sucesso"});
    }

    if (req.method === "PUT") {
      const {id, ...data} = req.body;
      if (!id) {
        return res.status(400).json({error: "ID da propaganda não fornecido"});
      }

      const doc = await premiumAdsCollection.doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({error: "Propaganda não encontrada"});
      }

      await premiumAdsCollection.doc(id).update(data);
      return res.status(200).json({message: "Propaganda atualizada com sucesso"});
    }

    if (req.method === "DELETE") {
      const {id} = req.body;
      if (!id) {
        return res.status(400).json({error: "ID da propaganda não fornecido"});
      }

      const doc = await premiumAdsCollection.doc(id).get();
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({error: "Propaganda não encontrada"});
      }

      await premiumAdsCollection.doc(id).delete();
      return res.status(200).json({message: "Propaganda deletada com sucesso"});
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro em /premiumAds:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
})));

// --- API authorized users ---
exports.authorizedUsers = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(authenticateMiddleware(async (req, res) => {
  try {
    console.log("Iniciando verificação de autorização...");


    // Verificar se o banco de dados está acessível
    try {
      await db.collection("_test").get();
      console.log("Conexão com Firestore OK");
    } catch (error) {
      console.error("Erro ao acessar Firestore:", error);
      return res.status(500).json({error: "Erro ao acessar banco de dados"});
    }

    const authorizedUsersCollection = db.collection("authorizedUsers");
    console.log("Coleção authorizedUsers referenciada");

    if (req.method === "GET") {
      // Verificar se o usuário está autorizado
      const userEmail = req.user.email;
      console.log("Verificando autorização para email:", userEmail);

      try {
        // Primeiro, vamos listar todos os documentos para debug
        console.log("Tentando buscar documentos...");
        const allDocs = await authorizedUsersCollection.get();
        console.log("Total de documentos na coleção:", allDocs.size);

        if (allDocs.empty) {
          console.log("Coleção está vazia");
          return res.status(403).json({error: "Nenhum usuário autorizado encontrado"});
        }

        allDocs.forEach((doc) => {
          const data = doc.data();
          console.log("Documento encontrado:", {
            id: doc.id,
            email: data.email,
            isAdmin: data.isAdmin,
            addedBy: data.addedBy,
            addedAt: data.addedAt,
          });
        });

        // Agora fazemos a consulta específica usando get() e filtrando no código
        const userDoc = allDocs.docs.find((doc) => {
          const data = doc.data();
          console.log("Comparando email:", {
            documento: data.email,
            usuario: userEmail,
            match: data.email === userEmail,
          });
          return data.email === userEmail;
        });

        console.log("Documento encontrado para o email:", userDoc ? "Sim" : "Não");

        if (!userDoc) {
          console.log("Nenhum documento encontrado para o email:", userEmail);
          return res.status(403).json({error: "Usuário não autorizado"});
        }

        // Se for admin, retorna lista completa
        const userData = userDoc.data();
        console.log("Dados do usuário encontrado:", userData);

        if (userData.isAdmin) {
          const users = allDocs.docs.map((doc) => ({id: doc.id, ...doc.data()}));
          return res.status(200).json(users);
        }

        // Se não for admin, retorna apenas o próprio usuário
        return res.status(200).json([{id: userDoc.id, ...userData}]);
      } catch (error) {
        console.error("Erro ao buscar documentos:", error);
        return res.status(500).json({error: "Erro ao buscar usuários autorizados"});
      }
    }

    if (req.method === "POST") {
      // Apenas admins podem adicionar usuários
      const userEmail = req.user.email;
      const adminDoc = await authorizedUsersCollection.where("email", "==", userEmail).get();

      if (adminDoc.empty || !adminDoc.docs[0].data().isAdmin) {
        return res.status(403).json({error: "Acesso negado"});
      }

      const {email, isAdmin = false} = req.body;
      if (!email) {
        return res.status(400).json({error: "Email é obrigatório"});
      }

      // Verificar se email já existe
      const existingUser = await authorizedUsersCollection.where("email", "==", email).get();
      if (!existingUser.empty) {
        return res.status(400).json({error: "Email já cadastrado"});
      }

      const docRef = await authorizedUsersCollection.add({
        email,
        isAdmin,
        addedBy: userEmail,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(201).json({id: docRef.id, message: "Usuário autorizado adicionado com sucesso"});
    }

    if (req.method === "DELETE") {
      // Apenas admins podem remover usuários
      const userEmail = req.user.email;
      const adminDoc = await authorizedUsersCollection.where("email", "==", userEmail).get();

      if (adminDoc.empty || !adminDoc.docs[0].data().isAdmin) {
        return res.status(403).json({error: "Acesso negado"});
      }

      const {id} = req.body;
      if (!id) {
        return res.status(400).json({error: "ID do usuário não fornecido"});
      }

      const doc = await authorizedUsersCollection.doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({error: "Usuário não encontrado"});
      }

      await authorizedUsersCollection.doc(id).delete();
      return res.status(200).json({message: "Usuário removido com sucesso"});
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro em /authorizedUsers:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
})));

// --- API pública para contatos ---
exports.publicContacts = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  // Configurar CORS headers explicitamente
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  //const db = admin.firestore();
  const contactsCollection = db.collection("contacts");

  try {
    if (req.method === "POST") {
      const data = req.body;
      data.name = data.name ? data.name.trim() : data.name;
      data.email = data.email ? data.email.trim() : data.email;

      if (!data.name || !data.email) {
        return res.status(400).json({error: "Nome e email são obrigatórios"});
      }

      data.createdAt = admin.firestore.FieldValue.serverTimestamp();

      const docRef = await contactsCollection.add(data);
      return res.status(201).json({id: docRef.id, message: "Contato criado com sucesso"});
    }

    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro na API pública de contatos:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
}));


// --- API pública para propagandas ---
exports.publicPremiumAds = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  // CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  //const db = admin.firestore();
  const premiumAdsCollection = db.collection("premiumAds");

  try {
    if (req.method === "GET") {
      const adsSnapshot = await premiumAdsCollection.get();
      const logosSnapshot = await db.collection("logos").get();

      // Mapeia CNPJs para dados de logotipo
      const logosMap = new Map();
      logosSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.clientCNPJ) {
          logosMap.set(data.clientCNPJ, data);
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0); // normaliza a data de hoje para comparação

      const ads = adsSnapshot.docs
          .map((doc) => {
            const adData = {id: doc.id, ...doc.data()};
            const logo = logosMap.get(adData.clientCNPJ) || {};

            // Validação: isActive e datas válidas
            if (!adData.isActive || !adData.startDate || !adData.endDate) {
              return null;
            }

            const startDate = new Date(adData.startDate);
            const endDate = new Date(adData.endDate);
            endDate.setHours(23, 59, 59, 999); // garante cobertura até o fim do dia

            const ativo = startDate <= today && endDate >= today;
            if (!ativo) return null;

            // Monta o objeto final do anúncio
            return {
              id: adData.id,
              title: adData.title || "",
              description: adData.description || "",
              mediaType: adData.mediaType || "",
              mediaUrl: adData.mediaUrl || "",
              targetUrl: adData.targetUrl || "",
              startDate: adData.startDate,
              endDate: adData.endDate,
              clicks: adData.clicks || 0,
              impressions: adData.impressions || 0,

              // Dados do logo (essenciais)
              imageUrl: logo.imageUrl || logo.logoImageUrl || logo.imagem || "",
              clientFantasyName: logo.clientFantasyName || "",
              clientName: logo.clientName || "",
              category: logo.category || logo.logoCategory || "",
              clientCity: logo.clientCity || "",
              clientUf: logo.clientUf || "",
              planType: logo.planType || "",
            };
          })
          .filter(Boolean); // remove nulos (anúncios inativos ou com datas inválidas)

      return res.status(200).json(ads);
    }
    if (req.method === "POST" && req.path.endsWith("/track")) {
      return (async () => {
        const {adId, type} = req.body;
        if (!adId || !type) {
          return res.status(400).json({error: "ID do anúncio e tipo são obrigatórios"});
        }

        const docRef = premiumAdsCollection.doc(adId);
        const doc = await docRef.get();

        if (!doc.exists) {
          return res.status(404).json({error: "Anúncio não encontrado"});
        }

        if (type === "click") {
          await docRef.update({
            clicks: admin.firestore.FieldValue.increment(1),
          });
        } else if (type === "impression") {
          await docRef.update({
            impressions: admin.firestore.FieldValue.increment(1),
          });
        }

        return res.status(200).json({message: "Evento registrado com sucesso"});
      })();
    }
    return res.status(405).json({error: "Método não permitido"});
  } catch (error) {
    console.error("Erro na API pública de propagandas:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
}));


// --- API de autenticação ---
exports.authenticate = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // Configurar headers CORS explicitamente
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    // Verifica se o header de autorização está presente
    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Token não encontrado no header");
      return res.status(401).json({error: "Token não fornecido"});
    }

    // Extrai o token
    const token = authHeader.split("Bearer ")[1];
    console.log("Token recebido:", token.substring(0, 20) + "...");

    try {
      const client = getAuthClient();
      // Verifica o token usando o OAuth2Client
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log("Token verificado com sucesso:", {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });

      // Verifica se o email está autorizado
      console.log("Verificando autorização para email:", payload.email);
      const authorizedUsersCollection = admin.firestore().collection("authorizedUsers");

      const userDoc = await authorizedUsersCollection
          .where("email", "==", payload.email)
          .get();

      console.log("Resultado da busca por email:", {
        email: payload.email,
        encontrado: !userDoc.empty,
        total: userDoc.size,
      });

      if (userDoc.empty) {
        console.log("Usuário não autorizado:", payload.email);
        return res.status(401).json({error: "Usuário não autorizado"});
      }

      // Retorna os dados do usuário
      const userData = userDoc.docs[0].data();
      console.log("Usuário autorizado:", {
        email: payload.email,
        isAdmin: userData.isAdmin,
      });

      return res.json({
        authorized: true,
        user: {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          isAdmin: userData.isAdmin || false,
        },
      });
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      return res.status(401).json({error: "Token inválido"});
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(500).json({error: "Erro na autenticação"});
  }
});

// --- API para listar usuários autorizados ---
exports.listAuthorizedUsers = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, (req, res) => {
  return cors(req, res, async () => {
    try {
      await checkAuth(req, res, async () => {
        //const db = admin.firestore();
        const usersSnapshot = await db.collection("authorizedUsers").get();

        const users = [];
        usersSnapshot.forEach((doc) => {
          users.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        res.json(users);
      });
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      res.status(500).json({error: "Erro interno do servidor. Por favor, tente novamente mais tarde."});
    }
  });
});

// --- Função para adicionar usuário autorizado
exports.addAuthorizedUser = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, (req, res) => {
  return cors(req, res, async () => {
    try {
      await checkAuth(req, res, async () => {
        const {email, name} = req.body;

        if (!email) {
          throw new Error("Email é obrigatório");
        }

        //const db = admin.firestore();
        await db.collection("authorizedUsers").add({
          email,
          name: name || email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({message: "Usuário autorizado com sucesso"});
      });
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      res.status(500).json({error: error.message});
    }
  });
});

// --- Função para remover usuário autorizado
exports.removeAuthorizedUser = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, (req, res) => {
  return cors(req, res, async () => {
    try {
      await checkAuth(req, res, async () => {
        const userId = req.params[0];

        if (!userId) {
          throw new Error("ID do usuário é obrigatório");
        }

        //const db = admin.firestore();
        await db.collection("authorizedUsers").doc(userId).delete();

        res.json({message: "Usuário removido com sucesso"});
      });
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      res.status(500).json({error: error.message});
    }
  });
});

// --- Função para inicializar o primeiro admin
exports.initializeAdmin = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, (req, res) => {
  return cors(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Token não fornecido");
      }

      const token = authHeader.split("Bearer ")[1];
      const userData = await validateGoogleToken(token);

      // Verifica se já existe algum usuário autorizado
      //const db = admin.firestore();
      const usersSnapshot = await db.collection("authorizedUsers").get();

      if (!usersSnapshot.empty) {
        throw new Error("Já existe um administrador inicializado");
      }

      // Adiciona o primeiro usuário como admin
      await db.collection("authorizedUsers").add({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        message: "Administrador inicializado com sucesso",
        user: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        },
      });
    } catch (error) {
      console.error("Erro ao inicializar admin:", error);
      res.status(500).json({error: error.message});
    }
  });
});

// --- API de verificação de autenticação ---
exports.checkAuth = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Token não fornecido");
      }

      const token = authHeader.split("Bearer ")[1];
      const userData = await validateGoogleToken(token);

      // Verifica se o usuário está autorizado
      //const db = admin.firestore();
      const userDoc = await db.collection("authorizedUsers")
          .where("email", "==", userData.email)
          .get();

      if (userDoc.empty) {
        throw new Error("Usuário não autorizado");
      }

      res.json({
        isAuthorized: true,
        user: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        },
      });
    } catch (error) {
      console.error("Erro na verificação de autenticação:", error);
      res.status(401).json({
        isAuthorized: false,
        error: error.message,
      });
    }
  });
});

// --- API para Insights (Cliques e Visitas) ---
exports.logInsight = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  // Permitir acesso de qualquer origem para esta função pública
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({error: "Método não permitido"});
  }

  //const db = admin.firestore();
  const insightsCollection = db.collection("insights");
  const {type, payload} = req.body;

  if (!type || !payload) {
    return res.status(400).json({error: "Tipo e payload são obrigatórios"});
  }

  try {
    const insightData = {
      type, // 'visit' ou 'click'
      timestamp: new Date().toISOString(),
      userAgent: req.get("User-Agent") || null,
      ...payload,
    };

    // Se for clique e tiver clientFantasyName, buscar o CNPJ no backend
    if (type === "click" && payload.clientFantasyName) {
      const logosSnapshot = await db.collection("logos")
          .where("clientFantasyName", "==", payload.clientFantasyName)
          .limit(1)
        .get();
      
      let logoData; 
      if (!logosSnapshot.empty) {
         logoData = logosSnapshot.docs[0].data();
        if (logoData.clientCNPJ) {
          insightData.clientCNPJ = logoData.clientCNPJ;
        }
      }
      // Remove clientCNPJ do payload se vier do front-end (por segurança)
      if (insightData.clientCNPJ && payload.clientCNPJ) {
        delete insightData.clientCNPJ;
        insightData.clientCNPJ = logoData.clientCNPJ;
      }
    }

    await insightsCollection.add(insightData);
    return res.status(200).json({success: true});
  } catch (error) {
    console.error("Erro ao registrar insight:", error);
    return res.status(500).json({error: "Erro interno do servidor"});
  }
}));

// --- API para rastrear eventos de anúncios (impressões e cliques) ---
exports.trackAdEvent = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") {
    return res.status(405).json({error: "Método não permitido"});
  }

  const {adId, eventType} = req.body; // eventType pode ser 'impression' ou 'click'

  if (!adId || !eventType) {
    return res.status(400).json({error: "adId e eventType são obrigatórios."});
  }

  if (eventType !== "impression" && eventType !== "click") {
    return res.status(400).json({error: "eventType inválido. Use \"impression\" ou \"click\"."});
  }

  //const db = admin.firestore();
  const adRef = db.collection("premiumAds").doc(adId);

  try {
    // Primeiro, verifica se o documento existe
    const adDoc = await adRef.get();
    if (!adDoc.exists) {
      return res.status(404).json({success: false, error: "Anúncio não encontrado."});
    }

    const fieldToIncrement = eventType === "impression" ? "impressions" : "clicks";

    // Usa increment com verificação de segurança
    await adRef.update({
      [fieldToIncrement]: admin.firestore.FieldValue.increment(1),
    });

    console.log(`Evento '${eventType}' registrado para o anúncio ${adId}`);
    return res.status(200).json({success: true, message: `Evento ${eventType} registrado.`});
  } catch (error) {
    console.error(`Erro ao registrar evento para o anúncio ${adId}:`, error);
    return res.status(500).json({success: false, error: "Erro interno do servidor."});
  }
}));

// --- API para rastrear cliques nos logos ---
exports.trackLogoClick = functions.https.onRequest({
  cors: true,
  maxInstances: 10,
}, handleCors(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") {
    return res.status(405).json({error: "Método não permitido"});
  }

  const {clientFantasyName} = req.body;

  if (!clientFantasyName) {
    return res.status(400).json({error: "clientFantasyName é obrigatório."});
  }

  //const db = admin.firestore();
  const insightsCollection = db.collection("insights");

  try {
    // Registra o clique diretamente (igual à propaganda)
    await insightsCollection.add({
      type: "click",
      clientFantasyName: clientFantasyName,
      timestamp: new Date().toISOString(),
      userAgent: req.get("User-Agent") || null,
    });

    console.log(`Clique registrado para o logo: ${clientFantasyName}`);
    return res.status(200).json({
      success: true,
      message: "Clique registrado com sucesso.",
    });
  } catch (error) {
    console.error(`Erro ao registrar clique para o logo ${clientFantasyName}:`, error);
    return res.status(500).json({success: false, error: "Erro interno do servidor."});
  }
}));
