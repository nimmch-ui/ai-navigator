import { type User, type InsertUser, type CommunityReport, type InsertCommunityReport, type Subscription } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface CloudUser {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Cloud Auth
  getCloudUser(id: string): Promise<CloudUser | undefined>;
  getCloudUserByUsername(username: string): Promise<CloudUser | undefined>;
  createCloudUser(username: string, passwordHash: string, passwordSalt: string): Promise<CloudUser>;
  
  // Community Reports
  getCommunityReports(): Promise<CommunityReport[]>;
  getCommunityReport(id: string): Promise<CommunityReport | undefined>;
  createCommunityReport(report: InsertCommunityReport): Promise<CommunityReport>;
  voteOnReport(reportId: string, voterId: string, voteType: 'confirm' | 'reject'): Promise<CommunityReport | undefined>;
  getLastReportTime(reporterId: string): Promise<number | undefined>;
  cleanupExpiredReports(): Promise<void>;
  
  // Subscriptions
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: Subscription): Promise<Subscription>;
  updateSubscription(userId: string, subscription: Partial<Subscription>): Promise<Subscription | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cloudUsers: Map<string, CloudUser>;
  private communityReports: Map<string, CommunityReport>;
  private reporterLastReportTime: Map<string, number>;
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.users = new Map();
    this.cloudUsers = new Map();
    this.communityReports = new Map();
    this.reporterLastReportTime = new Map();
    this.subscriptions = new Map();
    
    // Cleanup expired reports every 5 minutes
    setInterval(() => this.cleanupExpiredReports(), 5 * 60 * 1000);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getCloudUser(id: string): Promise<CloudUser | undefined> {
    return this.cloudUsers.get(id);
  }

  async getCloudUserByUsername(username: string): Promise<CloudUser | undefined> {
    return Array.from(this.cloudUsers.values()).find(
      (user) => user.username === username,
    );
  }

  async createCloudUser(username: string, passwordHash: string, passwordSalt: string): Promise<CloudUser> {
    const id = randomUUID();
    const cloudUser: CloudUser = { id, username, passwordHash, passwordSalt };
    this.cloudUsers.set(id, cloudUser);
    console.log('[MemStorage] Created cloud user:', username);
    return cloudUser;
  }

  async getCommunityReports(): Promise<CommunityReport[]> {
    const now = Date.now();
    return Array.from(this.communityReports.values())
      .filter(report => report.expiresAt > now && report.status !== 'rejected');
  }

  async getCommunityReport(id: string): Promise<CommunityReport | undefined> {
    return this.communityReports.get(id);
  }

  async createCommunityReport(insertReport: InsertCommunityReport): Promise<CommunityReport> {
    const id = randomUUID();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    
    const report: CommunityReport = {
      id,
      type: insertReport.type,
      location: insertReport.location,
      description: insertReport.description,
      reporterId: insertReport.reporterId,
      reportedAt: now,
      confirmations: 0,
      rejections: 0,
      trustScore: 0,
      status: 'pending',
      expiresAt: insertReport.expiresAt || now + TWENTY_FOUR_HOURS,
      voters: [],
    };
    
    this.communityReports.set(id, report);
    this.reporterLastReportTime.set(insertReport.reporterId, now);
    
    return report;
  }

  async voteOnReport(reportId: string, voterId: string, voteType: 'confirm' | 'reject'): Promise<CommunityReport | undefined> {
    const report = this.communityReports.get(reportId);
    if (!report) return undefined;
    
    if (report.voters.includes(voterId)) {
      return report;
    }
    
    report.voters.push(voterId);
    
    if (voteType === 'confirm') {
      report.confirmations++;
    } else {
      report.rejections++;
    }
    
    const totalVotes = report.confirmations + report.rejections;
    const confirmationRatio = totalVotes > 0 ? report.confirmations / totalVotes : 0;
    report.trustScore = Math.round(confirmationRatio * 100);
    
    if (report.confirmations >= 3 && confirmationRatio >= 0.6) {
      report.status = 'approved';
    } else if (report.rejections >= 3 && confirmationRatio < 0.4) {
      report.status = 'rejected';
    }
    
    this.communityReports.set(reportId, report);
    return report;
  }

  async getLastReportTime(reporterId: string): Promise<number | undefined> {
    return this.reporterLastReportTime.get(reporterId);
  }

  async cleanupExpiredReports(): Promise<void> {
    const now = Date.now();
    const entries = Array.from(this.communityReports.entries());
    for (const [id, report] of entries) {
      if (report.expiresAt <= now) {
        report.status = 'expired';
        this.communityReports.set(id, report);
      }
    }
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(userId);
  }

  async createSubscription(subscription: Subscription): Promise<Subscription> {
    this.subscriptions.set(subscription.userId, subscription);
    return subscription;
  }

  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const existing = this.subscriptions.get(userId);
    if (!existing) return undefined;
    
    const updated: Subscription = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.subscriptions.set(userId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
