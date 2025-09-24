import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertComercializadoraSchema, insertPurchaseIntentSchema, insertProposalSchema } from "@shared/schema";
import { objectStorageService } from "./objectStorage";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import multer from "multer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "energia-livre-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Usuário não encontrado" });
        }

        if (!user.password) {
          return done(null, false, { message: "Usuário registrado via Google" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Senha incorreta" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Get the base URL from environment or construct it
    const getCallbackURL = () => {
      // Check if we're in production (NODE_ENV=production or has production domain)
      if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true') {
        // Use the production domain
        return "https://energymatch.replit.app/api/auth/google/callback";
      }
      // Check for Replit domains in request headers (will be set dynamically)
      if (process.env.REPLIT_DEV_DOMAIN) {
        return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
      }
      // Fallback for local development
      return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
    };

    const callbackURL = getCallbackURL();
    console.log("Google OAuth Callback URL:", callbackURL);
    console.log("Environment:", process.env.NODE_ENV === 'production' ? "Production" : "Development");
    console.log("GOOGLE_CLIENT_ID configured:", !!process.env.GOOGLE_CLIENT_ID);

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
        
        if (!email) {
          return done(new Error("No email provided by Google"), false);
        }

        const user = await storage.upsertUser({
          googleId: profile.id,
          email: email,
          name: name
        });

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }));
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "E-mail já cadastrado" });
      }

      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }

      const user = await storage.createUser(userData);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro no login" });
        }
        res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        phone: user.phone,
        documentType: user.documentType,
        documentNumber: user.documentNumber
      } 
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        // Still return success to avoid frontend hanging
        return res.json({ message: "Logout realizado com sucesso" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Google OAuth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", { 
        failureRedirect: "/auth?error=google_auth_failed" 
      })(req, res, next);
    },
    (req, res) => {
      console.log("Google OAuth callback successful, user:", req.user);
      const user = req.user as any;
      
      if (!user) {
        console.error("No user found after Google OAuth");
        return res.redirect("/auth?error=no_user_found");
      }
      
      // Redirect based on role
      switch (user.role) {
        case "admin":
          res.redirect("/admin-dashboard");
          break;
        case "comercializadora":
          res.redirect("/comercializadora-dashboard");
          break;
        default:
          res.redirect("/dashboard");
      }
    }
  );

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        phone: user.phone,
        documentType: user.documentType,
        documentNumber: user.documentNumber
      } 
    });
  });

  // Users management routes
  app.get("/api/users", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  });

  // Invoice upload route
  app.post("/api/upload-invoice", requireAuth, upload.single('invoice'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // For now, use temporary upload without organization (will be reorganized later)
      const userId = (req.user as any).id;
      const result = await objectStorageService.uploadPDFFromBuffer(
        req.file.originalname,
        req.file.buffer,
        userId,
        'temp', // temporary comercializadora ID
        new Date()
      );

      if (!result.success) {
        return res.status(500).json({ message: result.error || "Erro no upload" });
      }

      res.json({ 
        message: "Arquivo enviado com sucesso",
        filePath: result.path 
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download invoice route - handles both old and new path structures
  app.get("/api/invoices/:filePath(*)", requireAuth, async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      
      if (!privateDir) {
        return res.status(500).json({ message: "Storage não configurado" });
      }

      // For new hierarchical structure, filePath already contains the full path
      // For old structure, we need to prefix with "invoices/"
      let fullPath: string;
      if (filePath.startsWith('invoices/')) {
        // New hierarchical structure - filePath already contains full path
        fullPath = `${privateDir}/${filePath}`;
      } else {
        // Old structure - prefix with invoices/
        fullPath = `${privateDir}/invoices/${filePath}`;
      }

      const result = await objectStorageService.client.downloadAsBytes(fullPath);

      if (!result.ok || !result.value) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      // Extract filename for Content-Disposition header
      const filename = filePath.split('/').pop() || filePath;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(result.value);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Erro ao baixar arquivo" });
    }
  });

  // Purchase intents routes
  app.post("/api/purchase-intents", requireAuth, async (req, res) => {
    try {
      const intentData = insertPurchaseIntentSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      const intent = await storage.createPurchaseIntent(intentData);
      
      // If there's an invoice file, reorganize it to the proper folder structure
      if (intent.invoiceFilePath) {
        const reorganizeResult = await objectStorageService.reorganizeInvoiceFile(
          intent.invoiceFilePath,
          intent.userId,
          intent.comercializadoraId,
          intent.createdAt || new Date()
        );
        
        if (reorganizeResult.success && reorganizeResult.newPath) {
          // Update the intent with the new file path
          await storage.updatePurchaseIntentInvoicePath(intent.id, reorganizeResult.newPath);
          intent.invoiceFilePath = reorganizeResult.newPath;
        } else {
          console.warn("Failed to reorganize invoice file:", reorganizeResult.error);
          // Continue anyway - the file is still accessible, just not organized
        }
      }
      
      res.json(intent);
    } catch (error) {
      console.error("Create intent error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/purchase-intents", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      let intents;
      
      if (user.role === "admin" || user.role === "comercializadora") {
        intents = await storage.getPurchaseIntentsWithComercializadoras();
      } else {
        intents = await storage.getPurchaseIntentsWithComercializadorasByUserId(user.id);
      }
      
      res.json(intents);
    } catch (error) {
      console.error("Get intents error:", error);
      res.status(500).json({ message: "Erro ao buscar intenções" });
    }
  });

  app.patch("/api/purchase-intents/:id/response-status", requireAuth, async (req, res) => {
    try {
      const intentId = req.params.id;
      const { userReceivedResponse } = req.body;
      const user = req.user as any;
      
      // Verify that the intent belongs to the current user
      const intents = await storage.getPurchaseIntentsByUserId(user.id);
      const intent = intents.find(i => i.id === intentId);
      
      if (!intent) {
        return res.status(404).json({ message: "Intenção não encontrada" });
      }
      
      const success = await storage.updatePurchaseIntentResponseStatus(intentId, userReceivedResponse);
      
      if (success) {
        res.json({ message: "Status atualizado com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao atualizar status" });
      }
    } catch (error) {
      console.error("Update response status error:", error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  // Comercializadora routes
  app.post("/api/comercializadoras", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const comercializadoraData = insertComercializadoraSchema.parse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      const comercializadora = await storage.createComercializadora(comercializadoraData);
      res.json(comercializadora);
    } catch (error) {
      console.error("Create comercializadora error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/comercializadoras", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const comercializadoras = await storage.getAllComercializadoras();
      res.json(comercializadoras);
    } catch (error) {
      console.error("Get comercializadoras error:", error);
      res.status(500).json({ message: "Erro ao buscar comercializadoras" });
    }
  });

  app.get("/api/comercializadoras/approved", requireAuth, async (req, res) => {
    try {
      const comercializadoras = await storage.getApprovedComercializadoras();
      res.json(comercializadoras);
    } catch (error) {
      console.error("Get approved comercializadoras error:", error);
      res.status(500).json({ message: "Erro ao buscar comercializadoras aprovadas" });
    }
  });

  app.get("/api/comercializadoras/my-company", requireAuth, requireRole(["comercializadora"]), async (req, res) => {
    try {
      const currentUser = req.user as any;
      const comercializadora = await storage.getComercializadoraByUserId(currentUser.id);
      if (!comercializadora) {
        return res.status(404).json({ message: "Comercializadora não encontrada" });
      }
      res.json(comercializadora);
    } catch (error) {
      console.error("Get my company error:", error);
      res.status(500).json({ message: "Erro ao buscar dados da empresa" });
    }
  });

  app.put("/api/comercializadoras/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      const updateData = insertComercializadoraSchema.partial().parse(req.body);
      
      // Verificar se há dados para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização" });
      }
      
      const comercializadora = await storage.updateComercializadora(id, updateData);
      if (!comercializadora) {
        return res.status(404).json({ message: "Comercializadora não encontrada" });
      }
      
      res.json(comercializadora);
    } catch (error) {
      console.error("Update comercializadora error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/comercializadoras/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const id = req.params.id;
      const success = await storage.deleteComercializadora(id);
      
      if (!success) {
        return res.status(404).json({ message: "Comercializadora não encontrada" });
      }
      
      res.json({ message: "Comercializadora deletada com sucesso" });
    } catch (error) {
      console.error("Delete comercializadora error:", error);
      res.status(500).json({ message: "Erro ao deletar comercializadora" });
    }
  });

  // Proposals routes
  app.post("/api/proposals", requireAuth, requireRole(["comercializadora"]), async (req, res) => {
    try {
      const user = req.user as any;
      const comercializadora = await storage.getComercializadoraByUserId(user.id);
      
      if (!comercializadora) {
        return res.status(400).json({ message: "Comercializadora não encontrada" });
      }

      const proposalData = insertProposalSchema.parse({
        ...req.body,
        comercializadoraId: comercializadora.id
      });
      
      const proposal = await storage.createProposal(proposalData);
      res.json(proposal);
    } catch (error) {
      console.error("Create proposal error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/proposals/intent/:intentId", requireAuth, async (req, res) => {
    try {
      const proposals = await storage.getProposalsByIntentId(req.params.intentId);
      res.json(proposals);
    } catch (error) {
      console.error("Get proposals error:", error);
      res.status(500).json({ message: "Erro ao buscar propostas" });
    }
  });

  // User management routes (admin only)
  app.put("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const updateData = insertUserSchema.partial().parse(req.body);
      
      // Hash password if provided
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user as any;
      
      // Prevent admin from deleting themselves
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Você não pode deletar sua própria conta" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Erro ao deletar usuário" });
    }
  });

  // Affiliate link routes
  app.get("/api/affiliate/code/:comercializadoraId", requireAuth, requireRole(["comercializadora", "admin"]), async (req, res) => {
    try {
      const comercializadoraId = req.params.comercializadoraId;
      const currentUser = req.user as any;
      
      // Verify that comercializadora belongs to current user (unless admin)
      if (currentUser.role !== "admin") {
        const comercializadora = await storage.getComercializadoraByUserId(currentUser.id);
        if (!comercializadora || comercializadora.id !== comercializadoraId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      // Generate affiliate code (use comercializadora ID as base)
      const affiliateCode = Buffer.from(comercializadoraId).toString('base64url').substring(0, 8);
      const affiliateLink = `${req.protocol}://${req.get('host')}/purchase-intent?ref=${affiliateCode}`;
      
      res.json({ 
        affiliateCode, 
        affiliateLink,
        comercializadoraId 
      });
    } catch (error) {
      console.error("Get affiliate code error:", error);
      res.status(500).json({ message: "Erro ao gerar código de afiliado" });
    }
  });

  app.get("/api/affiliate/resolve/:code", async (req, res) => {
    try {
      const code = req.params.code;
      
      // Decode the affiliate code to get comercializadora ID
      try {
        const comercializadoraId = Buffer.from(code, 'base64url').toString();
        
        // Verify that comercializadora exists and is approved
        const comercializadora = await storage.getComercializadoraById(comercializadoraId);
        if (!comercializadora || !comercializadora.isApproved) {
          return res.status(404).json({ message: "Código de afiliado inválido" });
        }
        
        res.json({ 
          comercializadoraId: comercializadora.id,
          companyName: comercializadora.companyName 
        });
      } catch (decodeError) {
        return res.status(400).json({ message: "Código de afiliado inválido" });
      }
    } catch (error) {
      console.error("Resolve affiliate code error:", error);
      res.status(500).json({ message: "Erro ao resolver código de afiliado" });
    }
  });

  app.get("/api/affiliate/stats/:comercializadoraId", requireAuth, requireRole(["comercializadora", "admin"]), async (req, res) => {
    try {
      const comercializadoraId = req.params.comercializadoraId;
      const currentUser = req.user as any;
      
      // Verify that comercializadora belongs to current user (unless admin)
      if (currentUser.role !== "admin") {
        const comercializadora = await storage.getComercializadoraByUserId(currentUser.id);
        if (!comercializadora || comercializadora.id !== comercializadoraId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      const stats = await storage.getAffiliateStats(comercializadoraId);
      res.json(stats);
    } catch (error) {
      console.error("Get affiliate stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de afiliado" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  app.get("/api/admin/solicitations-tracking", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const tracking = await storage.getAdminSolicitationsTracking();
      res.json(tracking);
    } catch (error) {
      console.error("Get solicitations tracking error:", error);
      res.status(500).json({ message: "Erro ao buscar tracking de solicitações" });
    }
  });

  app.get("/api/admin/affiliate-tracking", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const tracking = await storage.getAdminAffiliateTracking();
      res.json(tracking);
    } catch (error) {
      console.error("Get affiliate tracking error:", error);
      res.status(500).json({ message: "Erro ao buscar tracking de afiliados" });
    }
  });

  app.get("/api/admin/weekly-activity", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const activities = await storage.getWeeklyActivity();
      res.json(activities);
    } catch (error) {
      console.error("Get weekly activity error:", error);
      res.status(500).json({ message: "Erro ao buscar movimentações da semana" });
    }
  });

  // API para registrar novo acesso a parceiro
  app.post("/api/partner-accesses/register", requireAuth, async (req, res) => {
    try {
      const { comercializadoraId, companyName } = req.body;
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!comercializadoraId) {
        return res.status(400).json({ message: "ID da comercializadora é obrigatório" });
      }

      const now = new Date();
      const accessId = `${comercializadoraId}_${Date.now()}`;
      
      // Verificar se já existe um acesso sem resposta
      const existingAccesses = await storage.getUserPartnerAccesses(userId);
      const existingWithoutResponse = existingAccesses.find((a: any) => 
        a.comercializadoraId === comercializadoraId && !a.receivedResponse
      );
      
      if (existingWithoutResponse) {
        // Atualizar acesso existente
        await storage.syncPartnerAccess({
          userId,
          comercializadoraId,
          accessId: existingWithoutResponse.accessId,
          firstAccess: existingWithoutResponse.firstAccess,
          lastAccess: now,
          receivedResponse: false,
        });
      } else {
        // Criar novo acesso
        await storage.syncPartnerAccess({
          userId,
          comercializadoraId,
          accessId,
          firstAccess: now,
          lastAccess: now,
          receivedResponse: false,
        });
      }
      
      res.json({ message: "Acesso registrado com sucesso" });
    } catch (error) {
      console.error("Register partner access error:", error);
      res.status(500).json({ message: "Erro ao registrar acesso" });
    }
  });

  // API para buscar partner accesses do usuário
  app.get("/api/user-partner-accesses", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const accesses = await storage.getUserPartnerAccesses(userId);
      res.json(accesses);
    } catch (error) {
      console.error("Get user partner accesses error:", error);
      res.status(500).json({ message: "Erro ao buscar acessos de parceiros" });
    }
  });

  // API para atualizar status de resposta de partner access
  app.patch("/api/user-partner-access-status", requireAuth, async (req, res) => {
    try {
      const { comercializadoraId, accessId, receivedResponse } = req.body;
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!comercializadoraId || typeof receivedResponse !== 'boolean') {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      // Extrair o ID real da comercializadora se tiver timestamp
      let realComercializadoraId = comercializadoraId;
      if (comercializadoraId.includes('_')) {
        realComercializadoraId = comercializadoraId.split('_')[0];
      }

      // Usar accessId se disponível, senão usar comercializadoraId
      const idToUpdate = accessId || comercializadoraId;
      
      const success = await storage.updatePartnerAccessResponseStatusByAccessId(userId, realComercializadoraId, idToUpdate, receivedResponse);
      
      if (success) {
        res.json({ message: "Status atualizado com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao atualizar status" });
      }
    } catch (error) {
      console.error("Update partner access status error:", error);
      res.status(500).json({ message: "Erro ao atualizar status de resposta" });
    }
  });

  // API para sincronizar dados do localStorage com o banco
  app.post("/api/sync-partner-accesses", requireAuth, async (req, res) => {
    try {
      const { accesses } = req.body; // Array de partner selections do localStorage
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!accesses || !Array.isArray(accesses)) {
        return res.status(400).json({ message: "Dados de acesso inválidos" });
      }

      const syncedAccesses = [];
      
      for (const access of accesses) {
        try {
          // Validar se o acesso é válido
          if (!access.comercializadoraId && !access.id) {
            console.warn(`Pulando acesso sem ID válido:`, access);
            continue;
          }
          
          // Extrair o ID real da comercializadora (remover timestamp se houver)
          let realComercializadoraId = access.comercializadoraId || access.id;
          if (realComercializadoraId.includes('_')) {
            // Se tem underscore, pegar só a primeira parte (ID real)
            realComercializadoraId = realComercializadoraId.split('_')[0];
          }
          
          const syncData = {
            userId,
            comercializadoraId: realComercializadoraId, // ID real da comercializadora
            accessId: access.accessId || access.id, // ID único do acesso (pode ter timestamp)
            firstAccess: new Date(access.firstAccess),
            lastAccess: new Date(access.lastAccess),
            receivedResponse: access.receivedResponse || false,
          };
          
          const synced = await storage.syncPartnerAccess(syncData);
          syncedAccesses.push(synced);
        } catch (error) {
          console.error(`Erro ao sincronizar acesso ${access.id}:`, error);
          // Continua com os outros acessos
        }
      }

      res.json({ 
        message: "Sincronização concluída",
        synced: syncedAccesses.length,
        total: accesses.length 
      });
    } catch (error) {
      console.error("Sync partner accesses error:", error);
      res.status(500).json({ message: "Erro ao sincronizar acessos de parceiros" });
    }
  });

  // Database environment info route (Admin only)
  app.get("/api/admin/database-info", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const { config } = await import("./config/database-schema");
      res.json({
        environment: config.environment,
        schema: config.schema,
        isProduction: config.isProduction,
        isDevelopment: config.environment === 'development',
        connectionConfigured: !!config.connectionString,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Database info error:", error);
      res.status(500).json({ message: "Erro ao obter informações do banco" });
    }
  });

  // Database synchronization routes (Admin only)
  app.get("/api/admin/export-data", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const exportData = await storage.exportAllData();
      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ message: "Erro ao exportar dados" });
    }
  });

  app.post("/api/admin/import-data", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const result = await storage.importData(req.body);
      res.json(result);
    } catch (error) {
      console.error("Import data error:", error);
      res.status(500).json({ message: "Erro ao importar dados" });
    }
  });

  app.post("/api/admin/sync-from-production", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      // This would typically fetch data from production API
      // For now, we'll simulate it with the provided data
      const productionData = req.body;
      
      if (!productionData || !productionData.users) {
        return res.status(400).json({ message: "Dados de produção inválidos" });
      }

      const result = await storage.importData(productionData);
      res.json({
        message: "Sincronização concluída",
        ...result
      });
    } catch (error) {
      console.error("Sync from production error:", error);
      res.status(500).json({ message: "Erro na sincronização" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
