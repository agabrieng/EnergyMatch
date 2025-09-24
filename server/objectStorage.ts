import { Client } from "@replit/object-storage";

// Create Object Storage client
const client = new Client();

export class ObjectStorageService {
  public client: Client;

  constructor() {
    this.client = new Client();
  }

  // Upload PDF file from buffer with hierarchical organization
  async uploadPDFFromBuffer(
    fileName: string, 
    buffer: Buffer, 
    userId: string, 
    comercializadoraId: string, 
    createdAt?: Date
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        throw new Error("PRIVATE_OBJECT_DIR not configured");
      }

      // Use provided date or current date
      const date = createdAt || new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Create unique filename with timestamp
      const timestamp = Date.now();
      
      // Create hierarchical path: invoices/users/{userId}/comercializadoras/{comercializadoraId}/yyyy/mm/
      const fileKey = `invoices/users/${userId}/comercializadoras/${comercializadoraId}/${year}/${month}/${timestamp}_${fileName}`;
      const fullPath = `${privateDir}/${fileKey}`;

      const { ok, error } = await this.client.uploadFromBytes(
        fullPath,
        buffer
      );

      if (!ok) {
        return { success: false, error: error?.message || "Upload failed" };
      }

      return { success: true, path: fileKey };
    } catch (error) {
      console.error("Object storage upload error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  // Get download URL for a file
  async getDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        throw new Error("PRIVATE_OBJECT_DIR not configured");
      }

      const fullPath = `${privateDir}/${filePath}`;
      // For now, return the file path as we'll serve it through our API
      return `/api/invoices/${filePath}`;
    } catch (error) {
      console.error("Error generating download URL:", error);
      return null;
    }
  }

  // Move file from temporary location to organized structure
  async reorganizeInvoiceFile(
    oldFilePath: string,
    userId: string,
    comercializadoraId: string,
    createdAt: Date
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        throw new Error("PRIVATE_OBJECT_DIR not configured");
      }

      // Extract filename from old path
      const filename = oldFilePath.split('/').pop() || '';
      
      // Generate new organized path
      const year = createdAt.getFullYear();
      const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');
      const newFileKey = `invoices/users/${userId}/comercializadoras/${comercializadoraId}/${year}/${month}/${filename}`;
      
      const oldFullPath = `${privateDir}/${oldFilePath}`;
      const newFullPath = `${privateDir}/${newFileKey}`;

      // Download the file from old location
      const downloadResult = await this.client.downloadAsBytes(oldFullPath);
      if (!downloadResult.ok || !downloadResult.value) {
        return { success: false, error: "Failed to download original file" };
      }

      // Upload to new location
      const buffer = downloadResult.value instanceof Buffer 
        ? downloadResult.value 
        : Buffer.from(downloadResult.value);
      const uploadResult = await this.client.uploadFromBytes(newFullPath, buffer);
      if (!uploadResult.ok) {
        return { success: false, error: uploadResult.error?.message || "Failed to upload to new location" };
      }

      // Delete old file
      const deleteResult = await this.client.delete(oldFullPath);
      if (!deleteResult.ok) {
        console.warn("Failed to delete old file, but new file was created successfully");
      }

      return { success: true, newPath: newFileKey };
    } catch (error) {
      console.error("Error reorganizing file:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  // Delete a file
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        throw new Error("PRIVATE_OBJECT_DIR not configured");
      }

      const fullPath = `${privateDir}/${filePath}`;
      const { ok } = await this.client.delete(fullPath);
      
      return ok;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }
}

export const objectStorageService = new ObjectStorageService();