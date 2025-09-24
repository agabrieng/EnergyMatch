import { users, comercializadoras, purchaseIntents, proposals, userPartnerAccesses, type User, type InsertUser, type Comercializadora, type InsertComercializadora, type PurchaseIntent, type InsertPurchaseIntent, type Proposal, type InsertProposal, type UserPartnerAccess, type InsertUserPartnerAccess } from "@shared/schema";
import { db } from "./db";
import { eq, count, sql, and } from "drizzle-orm";

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  upsertUser(userData: { googleId?: string; email: string; name: string }): Promise<User>;
  updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Comercializadora methods
  createComercializadora(insertComercializadora: InsertComercializadora): Promise<Comercializadora>;
  getAllComercializadoras(): Promise<Comercializadora[]>;
  getApprovedComercializadoras(): Promise<Comercializadora[]>;
  getComercializadoraByUserId(userId: string): Promise<Comercializadora | undefined>;
  getComercializadoraById(id: string): Promise<Comercializadora | undefined>;
  updateComercializadora(id: string, updateData: Partial<InsertComercializadora>): Promise<Comercializadora | undefined>;
  deleteComercializadora(id: string): Promise<boolean>;
  
  // Purchase Intent methods
  createPurchaseIntent(insertIntent: InsertPurchaseIntent): Promise<PurchaseIntent>;
  getAllPurchaseIntents(): Promise<PurchaseIntent[]>;
  getPurchaseIntentsByUserId(userId: string): Promise<PurchaseIntent[]>;
  updatePurchaseIntentInvoicePath(id: string, invoiceFilePath: string): Promise<boolean>;
  
  // Proposal methods
  createProposal(insertProposal: InsertProposal): Promise<Proposal>;
  getProposalsByIntentId(intentId: string): Promise<Proposal[]>;
  
  // Admin methods
  getAdminStats(): Promise<{ totalUsers: number; activeComercializadoras: number; monthlyTransactions: number }>;
  getAdminSolicitationsTracking(): Promise<any[]>;
  getAdminAffiliateTracking(): Promise<any[]>;
  
  // Affiliate methods
  getAffiliateStats(comercializadoraId: string): Promise<{ totalReferrals: number; monthlyReferrals: number; totalCommission: number }>;
  
  // Partner Access methods
  syncPartnerAccess(insertAccess: InsertUserPartnerAccess): Promise<UserPartnerAccess>;
  getUserPartnerAccesses(userId: string): Promise<UserPartnerAccess[]>;
  updatePartnerAccessResponseStatus(userId: string, comercializadoraId: string, receivedResponse: boolean): Promise<boolean>;
  updatePartnerAccessResponseStatusByAccessId(userId: string, comercializadoraId: string, accessId: string, receivedResponse: boolean): Promise<boolean>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(userData: { googleId?: string; email: string; name: string }): Promise<User> {
    // Try to find user by Google ID first, then by email
    let existingUser: User | undefined;
    
    if (userData.googleId) {
      existingUser = await this.getUserByGoogleId(userData.googleId);
    }
    
    if (!existingUser) {
      existingUser = await this.getUserByEmail(userData.email);
    }

    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          name: userData.name,
          googleId: userData.googleId,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return user;
    } else {
      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          googleId: userData.googleId,
          role: "user", // Default role for Google users
        })
        .returning();
      return user;
    }
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // First, check if user has a comercializadora associated
      const [comercializadora] = await db.select().from(comercializadoras).where(eq(comercializadoras.userId, id));
      
      if (comercializadora) {
        // Delete the comercializadora first
        await db.delete(comercializadoras).where(eq(comercializadoras.userId, id));
      }
      
      // Then delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Comercializadora methods
  async createComercializadora(insertComercializadora: InsertComercializadora): Promise<Comercializadora> {
    const [comercializadora] = await db
      .insert(comercializadoras)
      .values(insertComercializadora)
      .returning();
    return comercializadora;
  }

  async getAllComercializadoras(): Promise<Comercializadora[]> {
    return await db.select().from(comercializadoras);
  }

  async getApprovedComercializadoras(): Promise<Comercializadora[]> {
    return await db.select().from(comercializadoras).where(eq(comercializadoras.isApproved, true));
  }

  async getComercializadoraByUserId(userId: string): Promise<Comercializadora | undefined> {
    const [comercializadora] = await db.select().from(comercializadoras).where(eq(comercializadoras.userId, userId));
    return comercializadora || undefined;
  }

  async getComercializadoraById(id: string): Promise<Comercializadora | undefined> {
    const [comercializadora] = await db.select().from(comercializadoras).where(eq(comercializadoras.id, id));
    return comercializadora || undefined;
  }

  async updateComercializadora(id: string, updateData: Partial<InsertComercializadora>): Promise<Comercializadora | undefined> {
    const [comercializadora] = await db
      .update(comercializadoras)
      .set(updateData)
      .where(eq(comercializadoras.id, id))
      .returning();
    return comercializadora || undefined;
  }

  async deleteComercializadora(id: string): Promise<boolean> {
    try {
      const result = await db.delete(comercializadoras).where(eq(comercializadoras.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Delete comercializadora error:", error);
      throw error;
    }
  }

  // Purchase Intent methods
  async createPurchaseIntent(insertIntent: InsertPurchaseIntent): Promise<PurchaseIntent> {
    const [intent] = await db
      .insert(purchaseIntents)
      .values(insertIntent)
      .returning();
    
    // Automaticamente criar um novo acesso de parceiro para esta intenção
    const now = new Date();
    const newPartnerAccess: InsertUserPartnerAccess = {
      userId: insertIntent.userId,
      comercializadoraId: insertIntent.comercializadoraId,
      accessId: intent.id, // Usar o ID da intenção como accessId único
      firstAccess: now,
      lastAccess: now,
      receivedResponse: false,
    };
    
    try {
      await this.syncPartnerAccess(newPartnerAccess);
    } catch (error) {
      console.error('Erro ao criar acesso de parceiro para nova intenção:', error);
      // Não falhamos a criação da intenção por causa disso
    }
    
    return intent;
  }

  async getAllPurchaseIntents(): Promise<PurchaseIntent[]> {
    return await db.select().from(purchaseIntents);
  }

  async getPurchaseIntentsByUserId(userId: string): Promise<PurchaseIntent[]> {
    return await db.select().from(purchaseIntents).where(eq(purchaseIntents.userId, userId));
  }

  async updatePurchaseIntentInvoicePath(id: string, invoiceFilePath: string): Promise<boolean> {
    try {
      const result = await db
        .update(purchaseIntents)
        .set({ invoiceFilePath })
        .where(eq(purchaseIntents.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Update invoice path error:", error);
      return false;
    }
  }

  async updatePurchaseIntentResponseStatus(id: string, userReceivedResponse: boolean): Promise<boolean> {
    try {
      const result = await db
        .update(purchaseIntents)
        .set({ userReceivedResponse })
        .where(eq(purchaseIntents.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Update response status error:", error);
      return false;
    }
  }

  async getPurchaseIntentsWithComercializadoras(): Promise<any[]> {
    return await db
      .select({
        id: purchaseIntents.id,
        userId: purchaseIntents.userId,
        name: purchaseIntents.name,
        email: purchaseIntents.email,
        phone: purchaseIntents.phone,
        company: purchaseIntents.company,
        documentType: purchaseIntents.documentType,
        documentNumber: purchaseIntents.documentNumber,
        billValue: purchaseIntents.billValue,
        consumptionType: purchaseIntents.consumptionType,
        additionalInfo: purchaseIntents.additionalInfo,
        invoiceFilePath: purchaseIntents.invoiceFilePath,
        status: purchaseIntents.status,
        userReceivedResponse: purchaseIntents.userReceivedResponse,
        createdAt: purchaseIntents.createdAt,
        comercializadora: {
          id: comercializadoras.id,
          companyName: comercializadoras.companyName,
          email: comercializadoras.email,
        }
      })
      .from(purchaseIntents)
      .innerJoin(comercializadoras, eq(purchaseIntents.comercializadoraId, comercializadoras.id));
  }

  async getPurchaseIntentsWithComercializadorasByUserId(userId: string): Promise<any[]> {
    return await db
      .select({
        id: purchaseIntents.id,
        userId: purchaseIntents.userId,
        name: purchaseIntents.name,
        email: purchaseIntents.email,
        phone: purchaseIntents.phone,
        company: purchaseIntents.company,
        documentType: purchaseIntents.documentType,
        documentNumber: purchaseIntents.documentNumber,
        billValue: purchaseIntents.billValue,
        consumptionType: purchaseIntents.consumptionType,
        additionalInfo: purchaseIntents.additionalInfo,
        invoiceFilePath: purchaseIntents.invoiceFilePath,
        status: purchaseIntents.status,
        userReceivedResponse: purchaseIntents.userReceivedResponse,
        createdAt: purchaseIntents.createdAt,
        comercializadora: {
          id: comercializadoras.id,
          companyName: comercializadoras.companyName,
          email: comercializadoras.email,
        }
      })
      .from(purchaseIntents)
      .innerJoin(comercializadoras, eq(purchaseIntents.comercializadoraId, comercializadoras.id))
      .where(eq(purchaseIntents.userId, userId));
  }

  // Proposal methods
  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const [proposal] = await db
      .insert(proposals)
      .values(insertProposal)
      .returning();
    return proposal;
  }

  async getProposalsByIntentId(intentId: string): Promise<Proposal[]> {
    return await db.select().from(proposals).where(eq(proposals.intentId, intentId));
  }

  // Admin methods for tracking - busca TODAS as movimentações (partner accesses + purchase intents)
  async getAdminSolicitationsTracking(): Promise<any[]> {
    // Buscar intenções de compra normais
    const purchaseIntentsData = await db
      .select({
        intentId: purchaseIntents.id,
        userName: purchaseIntents.name,
        userEmail: purchaseIntents.email,
        company: purchaseIntents.company,
        billValue: purchaseIntents.billValue,
        intentStatus: purchaseIntents.status,
        receivedResponse: purchaseIntents.userReceivedResponse,
        createdAt: purchaseIntents.createdAt,
        comercializadoraId: purchaseIntents.comercializadoraId,
        comercializadoraName: comercializadoras.companyName,
        comercializadoraEmail: comercializadoras.email,
      })
      .from(purchaseIntents)
      .leftJoin(comercializadoras, eq(purchaseIntents.comercializadoraId, comercializadoras.id));

    // Buscar acessos via parceiros
    const partnerAccessData = await db
      .select({
        accessId: userPartnerAccesses.id,
        userName: users.name,
        userEmail: users.email,
        firstAccess: userPartnerAccesses.firstAccess,
        lastAccess: userPartnerAccesses.lastAccess,
        receivedResponse: userPartnerAccesses.receivedResponse,
        localAccessId: userPartnerAccesses.accessId,
        comercializadoraId: userPartnerAccesses.comercializadoraId,
        comercializadoraName: comercializadoras.companyName,
        comercializadoraEmail: comercializadoras.email,
        createdAt: userPartnerAccesses.createdAt,
      })
      .from(userPartnerAccesses)
      .leftJoin(users, eq(userPartnerAccesses.userId, users.id))
      .leftJoin(comercializadoras, eq(userPartnerAccesses.comercializadoraId, comercializadoras.id));

    // Combinar e formatar os resultados
    const allResults = [];

    // Adicionar intenções de compra normais
    for (const intent of purchaseIntentsData) {
      allResults.push({
        intentId: intent.intentId,
        userName: intent.userName,
        userEmail: intent.userEmail,
        company: intent.company,
        billValue: intent.billValue,
        intentStatus: intent.intentStatus,
        userReceivedResponse: intent.receivedResponse,
        intentCreatedAt: intent.createdAt,
        comercializadoraId: intent.comercializadoraId,
        comercializadora: intent.comercializadoraName ? {
          id: intent.comercializadoraId,
          companyName: intent.comercializadoraName,
          email: intent.comercializadoraEmail,
        } : null,
        proposalCount: 0, // TODO: contar propostas reais
        type: 'purchase_intent'
      });
    }

    // Adicionar acessos via parceiros
    for (const access of partnerAccessData) {
      allResults.push({
        intentId: access.accessId,
        userName: access.userName,
        userEmail: access.userEmail,
        company: null,
        billValue: null,
        intentStatus: 'active',
        userReceivedResponse: access.receivedResponse,
        intentCreatedAt: access.lastAccess,
        comercializadoraId: access.comercializadoraId,
        comercializadora: access.comercializadoraName ? {
          id: access.comercializadoraId,
          companyName: access.comercializadoraName,
          email: access.comercializadoraEmail,
        } : null,
        proposalCount: 0,
        accessData: {
          firstAccess: access.firstAccess,
          lastAccess: access.lastAccess,
          localAccessId: access.localAccessId,
        },
        type: 'partner_access'
      });
    }

    // Ordenar por data de criação (mais recente primeiro)
    return allResults.sort((a, b) => {
      const dateA = a.intentCreatedAt ? new Date(a.intentCreatedAt).getTime() : 0;
      const dateB = b.intentCreatedAt ? new Date(b.intentCreatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Buscar movimentações da semana atual
  async getWeeklyActivity(): Promise<any[]> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Sábado
    endOfWeek.setHours(23, 59, 59, 999);

    // Buscar acessos de parceiros da semana
    const partnerAccesses = await db
      .select({
        type: sql`'partner_access'`.as('type'),
        userName: users.name,
        userEmail: users.email,
        comercializadoraName: comercializadoras.companyName,
        date: userPartnerAccesses.lastAccess,
        details: sql`'Acesso a comercializadora'`.as('details')
      })
      .from(userPartnerAccesses)
      .leftJoin(users, eq(userPartnerAccesses.userId, users.id))
      .leftJoin(comercializadoras, eq(userPartnerAccesses.comercializadoraId, comercializadoras.id))
      .where(sql`${userPartnerAccesses.lastAccess} >= ${startOfWeek} AND ${userPartnerAccesses.lastAccess} <= ${endOfWeek}`)
      .orderBy(sql`${userPartnerAccesses.lastAccess} DESC`);

    // Buscar purchase intents da semana
    const purchaseIntentsWeek = await db
      .select({
        type: sql`'purchase_intent'`.as('type'),
        userName: purchaseIntents.name,
        userEmail: purchaseIntents.email,
        comercializadoraName: comercializadoras.companyName,
        date: purchaseIntents.createdAt,
        details: sql`CONCAT('R$ ', ${purchaseIntents.billValue})`.as('details')
      })
      .from(purchaseIntents)
      .leftJoin(comercializadoras, eq(purchaseIntents.comercializadoraId, comercializadoras.id))
      .where(sql`${purchaseIntents.createdAt} >= ${startOfWeek} AND ${purchaseIntents.createdAt} <= ${endOfWeek}`)
      .orderBy(sql`${purchaseIntents.createdAt} DESC`);

    // Combinar e ordenar todos os resultados
    const allActivities = [...partnerAccesses, ...purchaseIntentsWeek];
    return allActivities.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getAdminAffiliateTracking(): Promise<any[]> {
    return await db
      .select({
        intentId: purchaseIntents.id,
        userName: purchaseIntents.name,
        userEmail: purchaseIntents.email,
        billValue: purchaseIntents.billValue,
        intentStatus: purchaseIntents.status,
        userReceivedResponse: purchaseIntents.userReceivedResponse,
        intentCreatedAt: purchaseIntents.createdAt,
        targetComercializadora: comercializadoras.companyName,
        affiliateComercializadoraId: purchaseIntents.affiliateComercializadoraId,
        hasProposals: count(proposals.id),
      })
      .from(purchaseIntents)
      .leftJoin(comercializadoras, eq(purchaseIntents.comercializadoraId, comercializadoras.id))
      .leftJoin(proposals, eq(purchaseIntents.id, proposals.intentId))
      .where(sql`${purchaseIntents.affiliateComercializadoraId} IS NOT NULL`)
      .groupBy(
        purchaseIntents.id,
        purchaseIntents.name,
        purchaseIntents.email,
        purchaseIntents.billValue,
        purchaseIntents.status,
        purchaseIntents.userReceivedResponse,
        purchaseIntents.createdAt,
        comercializadoras.companyName,
        purchaseIntents.affiliateComercializadoraId
      )
      .orderBy(sql`${purchaseIntents.createdAt} DESC`);
  }

  // Database synchronization methods
  async exportAllData(): Promise<{
    users: any[];
    comercializadoras: any[];
    purchaseIntents: any[];
    proposals: any[];
    stats: any;
  }> {
    const [usersData, comercializadorasData, purchaseIntentsData, proposalsData] = await Promise.all([
      db.select().from(users),
      db.select().from(comercializadoras),
      db.select().from(purchaseIntents),
      db.select().from(proposals)
    ]);

    const stats = {
      totalUsers: usersData.length,
      totalComercializadoras: comercializadorasData.length,
      totalIntents: purchaseIntentsData.length,
      totalProposals: proposalsData.length,
      exportDate: new Date()
    };

    return {
      users: usersData,
      comercializadoras: comercializadorasData,
      purchaseIntents: purchaseIntentsData,
      proposals: proposalsData,
      stats
    };
  }

  async importData(data: {
    users: any[];
    comercializadoras: any[];
    purchaseIntents: any[];
    proposals: any[];
  }): Promise<{ success: boolean; imported: any; errors: string[] }> {
    const errors: string[] = [];
    const imported = {
      users: 0,
      comercializadoras: 0,
      purchaseIntents: 0,
      proposals: 0
    };

    try {
      // Import users (upsert to avoid conflicts)
      for (const user of data.users) {
        try {
          await db.insert(users).values(user).onConflictDoUpdate({
            target: users.id,
            set: {
              ...user,
              updatedAt: new Date()
            }
          });
          imported.users++;
        } catch (error) {
          errors.push(`Erro ao importar usuário ${user.email}: ${error}`);
        }
      }

      // Import comercializadoras
      for (const comercializadora of data.comercializadoras) {
        try {
          await db.insert(comercializadoras).values(comercializadora).onConflictDoUpdate({
            target: comercializadoras.id,
            set: {
              ...comercializadora,
              updatedAt: new Date()
            }
          });
          imported.comercializadoras++;
        } catch (error) {
          errors.push(`Erro ao importar comercializadora ${comercializadora.companyName}: ${error}`);
        }
      }

      // Import purchase intents
      for (const intent of data.purchaseIntents) {
        try {
          await db.insert(purchaseIntents).values(intent).onConflictDoUpdate({
            target: purchaseIntents.id,
            set: intent
          });
          imported.purchaseIntents++;
        } catch (error) {
          errors.push(`Erro ao importar intenção ${intent.id}: ${error}`);
        }
      }

      // Import proposals
      for (const proposal of data.proposals) {
        try {
          await db.insert(proposals).values(proposal).onConflictDoUpdate({
            target: proposals.id,
            set: proposal
          });
          imported.proposals++;
        } catch (error) {
          errors.push(`Erro ao importar proposta ${proposal.id}: ${error}`);
        }
      }

      return { success: true, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported, 
        errors: [...errors, `Erro geral na importação: ${error}`] 
      };
    }
  }

  async getAdminStats(): Promise<{ totalUsers: number; activeComercializadoras: number; monthlyTransactions: number }> {
    // Use Promise.all to run queries in parallel for better performance
    const [totalUsersResult, activeComercializadorasResult, monthlyTransactionsResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(comercializadoras).where(eq(comercializadoras.isApproved, true)),
      db.select({ count: count() }).from(proposals)
    ]);

    return {
      totalUsers: totalUsersResult[0].count,
      activeComercializadoras: activeComercializadorasResult[0].count,
      monthlyTransactions: monthlyTransactionsResult[0].count
    };
  }

  // Affiliate methods
  async getAffiliateStats(comercializadoraId: string): Promise<{ totalReferrals: number; monthlyReferrals: number; totalCommission: number }> {
    // Use Promise.all to run queries in parallel for better performance
    const [totalReferralsResult, monthlyReferralsResult] = await Promise.all([
      db.select({ count: count() }).from(purchaseIntents).where(eq(purchaseIntents.affiliateComercializadoraId, comercializadoraId)),
      db.select({ count: count() }).from(purchaseIntents).where(eq(purchaseIntents.affiliateComercializadoraId, comercializadoraId))
      // TODO: Add filter for current month when needed
    ]);

    return {
      totalReferrals: totalReferralsResult[0].count,
      monthlyReferrals: monthlyReferralsResult[0].count, // Using same for now, can be refined later
      totalCommission: totalReferralsResult[0].count * 100 // Example commission calculation
    };
  }

  // Partner Access methods
  async syncPartnerAccess(insertAccess: InsertUserPartnerAccess): Promise<UserPartnerAccess> {
    // Try to find existing access with same user + comercializadora + accessId
    const existing = await db
      .select()
      .from(userPartnerAccesses)
      .where(
        and(
          eq(userPartnerAccesses.userId, insertAccess.userId),
          eq(userPartnerAccesses.comercializadoraId, insertAccess.comercializadoraId),
          eq(userPartnerAccesses.accessId, insertAccess.accessId)
        )
      );

    if (existing.length > 0) {
      // Update existing access with new lastAccess time
      const [updated] = await db
        .update(userPartnerAccesses)
        .set({
          lastAccess: insertAccess.lastAccess,
          receivedResponse: insertAccess.receivedResponse || existing[0].receivedResponse,
          updatedAt: sql`now()`,
        })
        .where(eq(userPartnerAccesses.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new access record
      const [created] = await db
        .insert(userPartnerAccesses)
        .values(insertAccess)
        .returning();
      return created;
    }
  }

  async getUserPartnerAccesses(userId: string): Promise<any[]> {
    return await db
      .select({
        id: userPartnerAccesses.id,
        userId: userPartnerAccesses.userId,
        comercializadoraId: userPartnerAccesses.comercializadoraId,
        accessId: userPartnerAccesses.accessId,
        firstAccess: userPartnerAccesses.firstAccess,
        lastAccess: userPartnerAccesses.lastAccess,
        receivedResponse: userPartnerAccesses.receivedResponse,
        createdAt: userPartnerAccesses.createdAt,
        updatedAt: userPartnerAccesses.updatedAt,
        comercializadora: {
          id: comercializadoras.id,
          companyName: comercializadoras.companyName,
          email: comercializadoras.email,
        }
      })
      .from(userPartnerAccesses)
      .leftJoin(comercializadoras, eq(userPartnerAccesses.comercializadoraId, comercializadoras.id))
      .where(eq(userPartnerAccesses.userId, userId))
      .orderBy(sql`${userPartnerAccesses.lastAccess} DESC`);
  }

  async updatePartnerAccessResponseStatus(userId: string, comercializadoraId: string, receivedResponse: boolean): Promise<boolean> {
    try {
      const result = await db
        .update(userPartnerAccesses)
        .set({ 
          receivedResponse,
          updatedAt: sql`now()`,
        })
        .where(
          sql`${userPartnerAccesses.userId} = ${userId} 
              AND ${userPartnerAccesses.comercializadoraId} = ${comercializadoraId}`
        );
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status de resposta:', error);
      return false;
    }
  }

  async updatePartnerAccessResponseStatusByAccessId(userId: string, comercializadoraId: string, accessId: string, receivedResponse: boolean): Promise<boolean> {
    try {
      // Verificar se já está marcado como recebido
      const [existing] = await db
        .select()
        .from(userPartnerAccesses)
        .where(
          and(
            eq(userPartnerAccesses.userId, userId),
            eq(userPartnerAccesses.comercializadoraId, comercializadoraId),
            eq(userPartnerAccesses.accessId, accessId)
          )
        );
      
      // Se já recebeu resposta, não permitir reverter
      if (existing && existing.receivedResponse === true && receivedResponse === false) {
        console.warn('Tentativa de reverter status de resposta recebida bloqueada');
        return false;
      }
      
      const result = await db
        .update(userPartnerAccesses)
        .set({ 
          receivedResponse,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(userPartnerAccesses.userId, userId),
            eq(userPartnerAccesses.comercializadoraId, comercializadoraId),
            eq(userPartnerAccesses.accessId, accessId)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status de resposta por accessId:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();